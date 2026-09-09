import mongoose from 'mongoose';
import { User } from '../models/User.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shailaja-ias';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(MONGO_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);

    try {
      // Unset null/empty email and phone values so sparse indexes work as expected
      await User.updateMany({ email: { $in: [null, ''] } }, { $unset: { email: "" } });
      await User.updateMany({ phone: { $in: [null, ''] } }, { $unset: { phone: "" } });

      // Re-sync indexes to ensure email_1 and phone_1 are sparse unique indexes
      await User.syncIndexes();
      console.log('✅ User indexes synchronized successfully');
    } catch (indexError) {
      console.warn('⚠️ Warning syncing User indexes:', indexError);
    }
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;
