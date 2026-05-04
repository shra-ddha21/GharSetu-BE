import { Router } from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/service.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// Public route to fetch all categories
router.get('/categories', getCategories);

// Admin only routes
router.use('/categories', authMiddleware(['admin']));
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

export default router;
