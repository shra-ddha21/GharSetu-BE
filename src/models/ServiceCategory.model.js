import mongoose from "mongoose";

const serviceCategorySchema = new mongoose.Schema({
  categoryId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  icon: { type: String, required: true },
  description: { type: String },
  subcategories: [{ type: String }]
}, { timestamps: true });

export const ServiceCategory = mongoose.model('ServiceCategory', serviceCategorySchema);
