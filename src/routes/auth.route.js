import { Router } from 'express';
import {
  registerUser,
  loginUser,
  registerProvider,
  loginProvider,
  loginAdmin,
  logout,
  forgotPassword,
  verifyOtp,
  resetPasswordHandler
} from '../controllers/auth.controller.js';

const router = Router();

// Used inside /api/auth or specific modules, but from prompt:
// POST /api/users/register -> I'll route it at /api/users/register by putting this in user routes or grouping auth.
// The prompt says: POST /api/users/register, /api/users/login. So let's export them separately or just group in auth.
router.post('/users/register', registerUser);
router.post('/users/login', loginUser);
router.post('/providers/register', registerProvider);
router.post('/providers/login', loginProvider);
router.post('/admin/login', loginAdmin);
router.post('/logout', logout);

// Forgot Password Flow (public — no auth middleware)
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPasswordHandler);

export default router;