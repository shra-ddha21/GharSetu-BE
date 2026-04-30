import bcrypt from 'bcryptjs';
import { User, Provider, Admin } from '../models/index.js';
import { generateToken } from '../middlewares/auth.middleware.js';
import {
  forgotPassword as forgotPasswordService,
  verifyOtp as verifyOtpService,
  resetPassword as resetPasswordService
} from '../services/auth.service.js';

const setTokenCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, 
  });
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ message: 'All fields are required' });
      return;
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
       res.status(400).json({ message: 'User already exists' });
       return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });

    const token = generateToken(user._id.toString(), 'user');
    setTokenCookie(res, token);
    res.status(201).json({ message: 'User registered', token, user: { id: user._id, name, email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

export const loginUser = async (req, res) => {
   try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
       res.status(401).json({ message: 'Invalid credentials' });
       return;
    }
    const token = generateToken(user._id.toString(), 'user');
    setTokenCookie(res, token);
    res.json({ message: 'Login successful', token, user: { id: user._id, name: user.name, email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const registerProvider = async (req, res) => {
  try {
    const { businessName, ownerName, email, password, phone, location, serviceType } = req.body;
    
    const existing = await Provider.findOne({ email });
    if (existing) {
      res.status(400).json({ message: 'Provider already exists' });
      return;
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const provider = await Provider.create({ businessName, ownerName, email, password: hashedPassword, phone, location, serviceType });

    res.status(201).json({ message: 'Provider registered successfully. Waiting for admin approval.', provider: { id: provider._id, email } });
  } catch(error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const loginProvider = async (req, res) => {
  try {
    const { email, password } = req.body;
    const provider = await Provider.findOne({ email });
    if (!provider) {
       res.status(404).json({ message: 'Provider not found' });
       return;
    }
    if (provider.status === 'deactivated') {
       res.status(403).json({ message: 'Your account has been deactivated by the admin. Please contact support.' });
       return;
    }
    if (provider.status !== 'approved') {
       res.status(403).json({ message: 'Your account is pending or rejected.' });
       return;
    }
    const isMatch = await bcrypt.compare(password, provider.password);
    if (!isMatch) {
       res.status(401).json({ message: 'Invalid credentials' });
       return;
    }
    const token = generateToken(provider._id.toString(), 'provider');
    setTokenCookie(res, token);
    res.json({ message: 'Login successful', token, provider: { id: provider._id, email, role: provider.role, businessName: provider.businessName } });
  } catch(error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`Admin login attempt: ${email}`);

    // Support both 'admin' and 'admin@gharsetu.com'
    const targetEmail = email === 'admin' ? 'admin@gharsetu.com' : email;
    
    let admin = await Admin.findOne({ email: targetEmail });
    
    if (!admin && targetEmail === 'admin@gharsetu.com' && password === 'admin') {
      console.log('Seeding admin account...');
      const hPassword = await bcrypt.hash(password, 10);
      admin = await Admin.create({ email: 'admin@gharsetu.com', password: hPassword, role: 'admin' });
    }

    if (!admin) {
       return res.status(404).json({ message: 'Admin not found' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
       return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(admin._id.toString(), 'admin');
    setTokenCookie(res, token);
    res.json({ message: 'Login successful', token, admin: { id: admin._id, email: admin.email, role: admin.role } });
  } catch(error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const logout = async (req, res) => {
  res.cookie('token', '', { expires: new Date(0) });
  res.json({ message: 'Logged out successfully' });
};

// ─── Forgot Password Flow ──────────────────────────────────────

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }
    const result = await forgotPasswordService(email);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Server error' });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ message: 'Email and OTP are required' });
      return;
    }
    const result = await verifyOtpService(email, otp);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Server error' });
  }
};

export const resetPasswordHandler = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      res.status(400).json({ message: 'Reset token and new password are required' });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ message: 'Password must be at least 8 characters' });
      return;
    }
    const result = await resetPasswordService(resetToken, newPassword);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Server error' });
  }
};