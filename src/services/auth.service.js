import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.model.js';
import Provider from '../models/Provider.model.js';
import Admin from '../models/Admin.model.js';
import CustomError from '../utils/custom.error.js';

const signToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

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
