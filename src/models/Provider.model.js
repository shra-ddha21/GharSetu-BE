import mongoose from "mongoose";

const providerSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  ownerName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  location: { type: String, required: true },
  serviceType: { type: String, required: true },
  servicesOffered: [{ type: String }],
  experience: { type: Number },
  description: { type: String },
  portfolioImages: [{
    url: String,
    publicId: String
  }],
  coordinates: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  role: { type: String, default: 'provider' },
  resetOtp: { type: String, default: null },
  resetOtpExpiry: { type: Date, default: null },
}, { timestamps: true });

export const Provider = mongoose.model('Provider', providerSchema);

