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
dotenv.config();

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

const badWords = ['abuse', 'abusive', 'troll', 'idiot', 'stupid', 'bastard','bitch', 'shit', 'asshole', 'dumb', 'loser', 'blind', 'gadha', 'goru'];

const isAbusive = (text) => {
  if (!text) return false;
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
      
      if (isAbusive(messageText)) {
        const timeWindow = 5 * 60 * 1000; // 5 minute window
        const now = Date.now();
        
        // This part is for resetting the troll count if the time window has passed
        if (user.trollCount > 0 && user.trollStartTime && (now - user.trollStartTime > timeWindow)) {
          // Time passed, start a new window
          user.trollCount = 0;
          user.trollStartTime = now;
        } else if (!user.trollStartTime || user.trollCount === 0) {
          // First offense, set the start time
          user.trollStartTime = now;
        }

        user.trollCount = (user.trollCount || 0) + 1;

        if (user.trollCount >= 3) {
          user.blockedUntil = now + 5 * 60 * 1000; // 5 mins block
          user.trollCount = 0;
          user.trollStartTime = null;
          await user.save();
          socket.emit('troll_error', 'You have been blocked for 5 minutes: you sent abusive language 3 times within 5 minutes.');
          return;
        } else {
          await user.save();
          socket.emit('troll_alert', `Warning ${user.trollCount}/3: Abusive language is not allowed. 3 attempts within 5 minutes will result in a block.`);
          return;
        }
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
      
      if (isAbusive(messageText)) {
        const timeWindow = 5 * 60 * 1000; // 5 minute window
        const now = Date.now();
        
        if (user.trollCount > 0 && user.trollStartTime && (now - user.trollStartTime > timeWindow)) {
          // Time passed, start a new window
          user.trollCount = 0;
          user.trollStartTime = now;
        } else if (!user.trollStartTime || user.trollCount === 0) {
          // First offense, set the start time
          user.trollStartTime = now;
        }

        user.trollCount = (user.trollCount || 0) + 1;

        if (user.trollCount >= 3) {
          user.blockedUntil = now + 5 * 60 * 1000; // 5 mins block
          user.trollCount = 0;
          user.trollStartTime = null;
          await user.save();
          socket.emit('troll_error', 'You have been blocked for 5 minutes: you sent abusive language 3 times within 5 minutes.');
          return;
        } else {
          await user.save();
          socket.emit('troll_alert', `Warning ${user.trollCount}/3: Abusive language is not allowed. 3 attempts within 5 minutes will result in a block.`);
          return;
        }
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
