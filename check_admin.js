
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Admin } from './src/models/Admin.model.js';

dotenv.config();

const checkAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    const admin = await Admin.findOne({ email: 'admin@gharsetu.com' });
    if (admin) {
      console.log('Admin found:', admin.email);
      console.log('Admin password hash:', admin.password);
    } else {
      console.log('Admin not found');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkAdmin();
