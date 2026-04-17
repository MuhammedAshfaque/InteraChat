import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  trollCount: { type: Number, default: 0 },
  blockedUntil: { type: Date, default: null },
  trollStartTime: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', UserSchema);
