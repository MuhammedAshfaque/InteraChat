import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import uploadRoutes from './routes/upload.js';
import Message from './models/Message.js';
import User from './models/User.js';
import connectDb from './config/connectDB.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'missing_key');
const modelNames = [
  "gemini-2.5-flash",
  "gemini-2.5-pro"
];

const __filename = fileURLToPath(import.meta.url); // Get the current file path
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server); 

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/chat', uploadRoutes);

connectDb();

const connectedUsers = new Map(); // Map userId to socket.id

const badWords = ['idiot', 'stupid', 'bastard','bitch', 'shit', 'gadha', 'goru'];

const isAbusive = async (text) => {
  if (!text) return false;

  const prompt = `Analyze the following text and determine if it contains abusive language, hate speech, severe insults, or inappropriate buzzwords. Respond with only 'true' or 'false'.\nText: "${text}"`;

  for (let name of modelNames) {
    try {
      const tempModel = genAI.getGenerativeModel({ model: name });

      // retry logic
      for (let i = 0; i < 3; i++) {
        try {
          const result = await tempModel.generateContent(prompt);
          const responseText = result.response.text().trim().toLowerCase();
          return responseText.includes('true');
        } 
        catch (err) {
          if (err.status === 503) {
            console.log(`Retry ${i + 1} for ${name}`);
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
          } else {
            throw err;
          }
        }
      }

    } catch (err) {
      if (err.status !== 503) {
        console.error("Non-503 error:", err);
        break;
      }
      console.log(`${name} failed, trying next model...`);
    }
  }

  // FINAL fallback (your existing logic)
  console.log("Fallback to local badWords");
  const lower = text.toLowerCase();
  return badWords.some(word => lower.includes(word));
};

const isOTP = (text) => {
  if (!text) return false;
  return /\b\d{4,5}\b/.test(text);
};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // User joins with their ID
  socket.on('join', (userId) => {
    connectedUsers.set(userId, socket.id);
  });

  // Join a specific group room
  socket.on('join_group', (groupId) => {
    socket.join(groupId);
  });

  // Handle private message
  socket.on('private_message', async ({ senderId, receiverId, messageText, imageUrl }) => {
    try {
      const user = await User.findById(senderId);
      if (user.blockedUntil && user.blockedUntil > Date.now()) {
        const remainingStr = Math.ceil((user.blockedUntil - Date.now()) / 60000) + ' minutes';
        socket.emit('troll_error', `You are blocked from sending messages for ${remainingStr}.`);
        return;
      }
      if (isOTP(messageText)) {
        socket.emit('troll_alert', 'Sending 4 or 5 digit OTPs is not allowed.');
        return;
      }
      
      const message = new Message({
        sender: senderId,
        receiver: receiverId,
        messageText,
        imageUrl
      });
      await message.save();
      const populatedMessage = await message.populate('sender', 'username');

      // Send to receiver if online
      const receiverSocketId = connectedUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receive_message', populatedMessage);
      }
      
      // Send back to sender
      socket.emit('receive_message', populatedMessage);

      // Evaluate Abuse Asynchronously
      if (messageText) {
        isAbusive(messageText).then(async (abusive) => {
          if (abusive) {
            const timeWindow = 5 * 60 * 1000; // 5 minute window
            const now = Date.now();
            const freshUser = await User.findById(senderId);
            
            if (freshUser.trollCount > 0 && freshUser.trollStartTime && (now - freshUser.trollStartTime > timeWindow)) {
              freshUser.trollCount = 0;
              freshUser.trollStartTime = now;
            } else if (!freshUser.trollStartTime || freshUser.trollCount === 0) {
              freshUser.trollStartTime = now;
            }

            freshUser.trollCount = (freshUser.trollCount || 0) + 1;

            if (freshUser.trollCount >= 3) {
              freshUser.blockedUntil = now + 5 * 60 * 1000;
              freshUser.trollCount = 0;
              freshUser.trollStartTime = null;
              await freshUser.save();
              socket.emit('troll_error', 'You have been blocked for 5 minutes: you sent abusive language 3 times within 5 minutes.');
            } else {
              await freshUser.save();
            }
          }
        }).catch(err => console.error('Error in async abuse check for private message:', err));
      }
    } catch (err) {
      console.error('Error sending private message:', err);
    }
  });

  // Handle group message
  socket.on('group_message', async ({ senderId, groupId, messageText, imageUrl }) => {
    try {
      const user = await User.findById(senderId);
      if (user.blockedUntil && user.blockedUntil > Date.now()) {
        const remainingStr = Math.ceil((user.blockedUntil - Date.now()) / 60000) + ' minutes';
        socket.emit('troll_error', `You are blocked from sending messages for ${remainingStr}.`);
        return;
      }
      if (isOTP(messageText)) {
        socket.emit('troll_alert', 'Sending 4 or 5 digit OTPs is not allowed.');
        return;
      }
      
      const message = new Message({
        sender: senderId,
        groupId,
        messageText,
        imageUrl
      });
      await message.save();
      const populatedMessage = await message.populate('sender', 'username');

      // Emitting to everyone in the room
      io.to(groupId).emit('receive_message', populatedMessage);
      
      // Evaluate Abuse Asynchronously
      if (messageText) {
        isAbusive(messageText).then(async (abusive) => {
          if (abusive) {
            const timeWindow = 5 * 60 * 1000; // 5 minute window
            const now = Date.now();
            const freshUser = await User.findById(senderId);
            
            if (freshUser.trollCount > 0 && freshUser.trollStartTime && (now - freshUser.trollStartTime > timeWindow)) {
              freshUser.trollCount = 0;
              freshUser.trollStartTime = now;
            } else if (!freshUser.trollStartTime || freshUser.trollCount === 0) {
              freshUser.trollStartTime = now;
            }

            freshUser.trollCount = (freshUser.trollCount || 0) + 1;

            if (freshUser.trollCount >= 3) {
              freshUser.blockedUntil = now + 5 * 60 * 1000;
              freshUser.trollCount = 0;
              freshUser.trollStartTime = null;
              await freshUser.save();
              io.to(socket.id).emit('troll_error', 'You have been blocked for 5 minutes: you sent abusive language 3 times within 5 minutes.');
            } else {
              await freshUser.save();
            }
          }
        }).catch(err => console.error('Error in async abuse check for group message:', err));
      }
    } catch (err) {
      console.error('Error sending group message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const [userId, sockId] of connectedUsers.entries()) {
      if (sockId === socket.id) {
        connectedUsers.delete(userId);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
