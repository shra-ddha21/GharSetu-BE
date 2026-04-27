import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, Provider, Admin } from '../models/index.js';
import CustomError from '../utils/custom.error.js';
import { sendOtpEmail } from '../utils/email.service.js';

// ─── Existing helper ───────────────────────────────────────────
const signToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// ─── Existing service functions ────────────────────────────────

export const registerUser = async (userData) => {
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw new CustomError('Email already in use', 400);
  }
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  const newUser = await User.create({
    ...userData,
    password: hashedPassword,
    role: 'user'
  });
  const token = signToken(newUser._id, 'user');
  newUser.password = undefined;
  return { user: newUser, token };
};

export const registerProvider = async (providerData) => {
  const existingProvider = await Provider.findOne({ email: providerData.email });
  if (existingProvider) {
    throw new CustomError('Email already in use', 400);
  }
  const hashedPassword = await bcrypt.hash(providerData.password, 10);
  const newProvider = await Provider.create({
    ...providerData,
    password: hashedPassword,
    status: 'pending'
  });
  newProvider.password = undefined;
  // Admin approval required, so no token returned on registration
  return { provider: newProvider };
};

export const loginUser = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new CustomError('Incorrect email or password', 401);
  }
  const token = signToken(user._id, 'user');
  user.password = undefined;
  return { user, token };
};

export const loginProvider = async (email, password) => {
  const provider = await Provider.findOne({ email });
  if (!provider || !(await bcrypt.compare(password, provider.password))) {
    throw new CustomError('Incorrect email or password', 401);
  }
  if (provider.status === 'pending') {
    throw new CustomError('Your account is pending admin approval.', 403);
  }
  if (provider.status === 'rejected') {
    throw new CustomError('Your account has been rejected.', 403);
  }
  const token = signToken(provider._id, 'provider');
  provider.password = undefined;
  return { provider, token };
};

export const loginAdmin = async (email, password) => {
  const admin = await Admin.findOne({ email });
  if (!admin || !(await bcrypt.compare(password, admin.password))) {
    throw new CustomError('Incorrect email or password', 401);
  }
  const token = signToken(admin._id, 'admin');
  admin.password = undefined;
  return { admin, token };
};

// ─── Forgot Password Flow (NEW) ───────────────────────────────

/**
 * Helper: Find a user/provider/admin document by email across all collections.
 * Returns the document or throws a 404 error.
 */
const findAccountByEmail = async (email) => {
  let account = await User.findOne({ email });
  if (account) return account;

  account = await Provider.findOne({ email });
  if (account) return account;

  account = await Admin.findOne({ email });
  if (account) return account;

  throw new CustomError('No account found with this email', 404);
};

/**
 * Helper: Find an account by ID and role.
 */
const findAccountByIdAndRole = async (id, role) => {
  switch (role) {
    case 'user':     return User.findById(id);
    case 'provider': return Provider.findById(id);
    case 'admin':    return Admin.findById(id);
    default:         return null;
  }
};

/**
 * Generates a 4-digit OTP, saves it on the account, and sends it via email.
 */
export const forgotPassword = async (email) => {
  const account = await findAccountByEmail(email);

  // Generate 4-digit OTP (1000–9999)
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  // Save OTP with 30-second expiry
  account.resetOtp = otp;
  account.resetOtpExpiry = new Date(Date.now() + 30 * 1000);
  await account.save();

  // Send OTP via email
  await sendOtpEmail(email, otp);

  return { message: 'OTP sent successfully' };
};

/**
 * Verifies the OTP and returns a short-lived reset token (JWT, 5-min expiry).
 */
export const verifyOtp = async (email, otp) => {
  const account = await findAccountByEmail(email);

  // Validate OTP
  if (!account.resetOtp || account.resetOtp !== otp) {
    throw new CustomError('Invalid or expired OTP', 400);
  }

  // Check expiry
  if (account.resetOtpExpiry < new Date()) {
    throw new CustomError('Invalid or expired OTP', 400);
  }

  // Clear OTP fields
  account.resetOtp = null;
  account.resetOtpExpiry = null;
  await account.save();

  // Generate short-lived reset token
  const resetToken = jwt.sign(
    { id: account._id, role: account.role, purpose: 'password-reset' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );

  return { message: 'OTP verified', resetToken };
};

/**
 * Resets the password using a valid reset token.
 */
export const resetPassword = async (resetToken, newPassword) => {
  let decoded;
  try {
    decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch (err) {
    throw new CustomError('Reset token expired. Please restart the process.', 400);
  }

  // Ensure this token was issued for password reset
  if (decoded.purpose !== 'password-reset') {
    throw new CustomError('Invalid reset token', 400);
  }

  const account = await findAccountByIdAndRole(decoded.id, decoded.role);
  if (!account) {
    throw new CustomError('Account not found', 404);
  }

  // Hash and update password
  account.password = await bcrypt.hash(newPassword, 10);
  await account.save();

  return { message: 'Password reset successfully' };
};
