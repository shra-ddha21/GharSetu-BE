import mongoose from "mongoose";

const requestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requirement: { type: String, required: true },
  preferredDate: { type: Date, required: true },
  selectedProviders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Provider' }],
  assignedProviderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider' },
  status: { 
    type: String, 
    enum: ['pending', 'in-progress', 'assigned', 'meeting-scheduled', 'completed', 'cancelled'],
    default: 'pending' 
  },
  isLocked: { type: Boolean, default: false },
}, { timestamps: true });

export const Request = mongoose.model('Request', requestSchema);
