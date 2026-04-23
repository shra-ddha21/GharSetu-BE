import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request', required: true },
  date: { type: Date, required: true },
  link: { type: String, required: true },
}, { timestamps: true });

export const Meeting = mongoose.model('Meeting', meetingSchema);