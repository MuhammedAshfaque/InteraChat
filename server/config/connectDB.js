import mongoose from 'mongoose';

const connectDb = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error('MongoDB Error: MONGO_URI is not defined in the environment variables!');
      return;
    }
    // Disable buffering of queries when MongoDB is not connected
    mongoose.set('bufferCommands', false);
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
};

export default connectDb;