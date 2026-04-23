import mongoose from "mongoose";

const providerResponseSchema = new mongoose.Schema({
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request', required: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'not-selected'], default: 'pending' },
}, { timestamps: true });

providerResponseSchema.index({ requestId: 1, providerId: 1 }, { unique: true });
export const ProviderResponse = mongoose.model('ProviderResponse', providerResponseSchema);
