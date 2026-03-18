require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require('path');

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const uploadRoutes = require('./routes/upload');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/chat', uploadRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chat-app')
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Socket.io logic
const connectedUsers = new Map(); // Map userId to socket.id

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
