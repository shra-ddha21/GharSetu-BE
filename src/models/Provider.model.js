import mongoose from "mongoose";

const providerSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  ownerName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  location: { type: String }, // Legacy/fallback, can still be used for simple text search
  address: {
    street: { type: String },
    state: { type: String },
    district: { type: String },
    city: { type: String },
    pincode: { type: String }
  },
  serviceType: { type: String, required: true },
  servicesOffered: [{ type: String }],
  experience: { type: Number },
  description: { type: String },
  profileImage: {
    url: String,
    publicId: String
  },
  governmentId: {
    idType: { type: String, enum: ['aadhar', 'pan', 'driving_license', 'voter_id', 'other'] },
    frontImage: { url: String, publicId: String },
    backImage: { url: String, publicId: String }
  },
  portfolioImages: [{
    url: String,
    publicId: String
  }],
  coordinates: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  phoneVerified: { type: Boolean, default: false },
  phoneOtp: { type: String, default: null },
  phoneOtpExpiry: { type: Date, default: null },
  isVerifiedProfile: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'deactivated'], default: 'pending' },
  role: { type: String, default: 'provider' },
  resetOtp: { type: String, default: null },
  resetOtpExpiry: { type: Date, default: null },
}, { timestamps: true });

export const Provider = mongoose.model('Provider', providerSchema);

