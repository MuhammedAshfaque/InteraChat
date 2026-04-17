import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional, for private chat
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' }, // Optional, for group chat
  messageText: { type: String, required: false }, // Optional if imageUrl is present
  imageUrl: { type: String, required: false }, // Optional image
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('Message', MessageSchema);
