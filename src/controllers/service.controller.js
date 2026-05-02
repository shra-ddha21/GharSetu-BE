import { ServiceCategory } from '../models/index.js';
import CustomError from '../utils/custom.error.js';

// Public Route
export const getCategories = async (req, res) => {
  try {
    const categories = await ServiceCategory.find().sort({ createdAt: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch categories', error: error.message });
  }
};

// Admin Routes
export const createCategory = async (req, res) => {
  try {
    const { categoryId, name, icon, description, subcategories } = req.body;
    const category = new ServiceCategory({ categoryId, name, icon, description, subcategories });
    await category.save();
    res.status(201).json({ message: 'Category created successfully', category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Category ID already exists' });
    }
    res.status(500).json({ message: 'Failed to create category', error: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const category = await ServiceCategory.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!category) {
      throw new CustomError('Category not found', 404);
    }
    
    res.json({ message: 'Category updated successfully', category });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to update category' });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await ServiceCategory.findByIdAndDelete(id);
    if (!category) {
      throw new CustomError('Category not found', 404);
    }
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to delete category' });
  }
};
