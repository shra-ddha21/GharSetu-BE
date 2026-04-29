import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  name: { type: String, default: 'Administrator' },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  profileImage: {
    url: String,
    publicId: String
  },
  resetOtp: { type: String, default: null },
  resetOtpExpiry: { type: Date, default: null },
}, { timestamps: true });

export const Admin = mongoose.model('Admin', adminSchema);
