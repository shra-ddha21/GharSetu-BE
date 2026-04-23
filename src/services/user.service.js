import Provider from '../models/Provider.model.js';
import Request from '../models/Request.model.js';
import CustomError from '../utils/custom.error.js';

export const getApprovedProviders = async (filters) => {
  const query = { status: 'approved' };
  
  if (filters.serviceType) {
    query.servicesOffered = { $regex: new RegExp(filters.serviceType, 'i') };
  }
  if (filters.location) {
    query.location = { $regex: new RegExp(filters.location, 'i') };
  }

  // We can choose what to project to hide sensitive info if needed
  return Provider.find(query).select('-password');
};

export const createRequest = async (userId, data) => {
  const { requirement, preferredDate, providerIds } = data;

  if (!providerIds || providerIds.length === 0 || providerIds.length > 5) {
    throw new CustomError('Please select between 1 and 5 providers.', 400);
  }

  // For simplicity, we assume the user provides a serviceType and location based on the first provider selected.
  // In a real app, this might come from the frontend search context.
  const providerDetails = await Provider.findById(providerIds[0]);
  if (!providerDetails) {
    throw new CustomError('Provider not found', 404);
  }

  const newRequest = await Request.create({
    userId,
    serviceType: providerDetails.servicesOffered[0] || 'General',
    location: providerDetails.location || 'Unknown',
    requirement,
    preferredDate,
    selectedProviders: providerIds,
    status: 'pending'
  });

  return newRequest;
};

export const getUserRequests = async (userId) => {
  return Request.find({ userId })
    .populate('selectedProviders', 'businessName ownerName phone')
    .populate('assignedProvider', 'businessName ownerName phone')
    .sort('-createdAt');
};
