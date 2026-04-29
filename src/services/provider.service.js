import { ProviderResponse } from '../models/ProviderResponse.model.js';
import { Request } from '../models/Request.model.js';
import { Provider } from '../models/Provider.model.js';
import cloudinary from '../utils/cloudinary.js';
import CustomError from '../utils/custom.error.js';
export const getIncomingRequests = async (providerId) => {
  return ProviderResponse.find({ providerId, status: 'pending' })
    .populate({
      path: 'requestId',
      populate: {
        path: 'userId',
        select: 'name email'
      }
    })
    .sort('-createdAt');
};

export const respondToRequest = async (providerId, requestIdStr, action) => {
  if (action === 'reject') {
    await ProviderResponse.findOneAndUpdate(
      { requestId: requestIdStr, providerId },
      { status: 'rejected', respondedAt: new Date() }
    );
    return { message: 'Request rejected successfully' };
  }

  if (action === 'accept') {
    // Attempt to lock the request
    const request = await Request.findOneAndUpdate(
      { _id: requestIdStr, isLocked: false, status: 'in-progress' },
      { $set: { isLocked: true, assignedProvider: providerId, status: 'assigned' } },
      { new: true }
    );

    if (!request) {
      throw new CustomError('Request is no longer available or already assigned.', 409);
    }

    // Update this provider's response
    await ProviderResponse.findOneAndUpdate(
      { requestId: requestIdStr, providerId },
      { status: 'accepted', respondedAt: new Date() }
    );

    // Set other pending responses to not-selected
    await ProviderResponse.updateMany(
      { requestId: requestIdStr, providerId: { $ne: providerId }, status: 'pending' },
      { $set: { status: 'not-selected', respondedAt: new Date() } }
    );

    return { message: 'Request accepted successfully. You are assigned to this job.' };
  }

  throw new CustomError('Invalid action', 400);
};

export const getAssignedRequests = async (providerId) => {
  return Request.find({ assignedProvider: providerId })
    .populate('userId', 'name email phone')
    .sort('-updatedAt');
};

// Profile Management

export const getProviderProfile = async (providerId) => {
  const provider = await Provider.findById(providerId).select('-password -resetOtp -resetOtpExpiry');
  if (!provider) throw new CustomError('Provider not found', 404);
  return provider;
};

export const updateProviderProfile = async (providerId, updateData) => {
  const { businessName, servicesOffered, location, experience, description, coordinates } = updateData;
  
  const updatePayload = { businessName, servicesOffered, location, experience, description };

  // If coordinates are explicitly provided (from map picker), use them directly
  if (coordinates && coordinates.lat && coordinates.lng) {
    updatePayload.coordinates = coordinates;
  } 
  // Otherwise, if location text changed, auto-geocode it
  else if (location) {
    const { geocodeLocation } = await import('../utils/geocode.util.js');
    const coords = await geocodeLocation(location);
    if (coords) {
      updatePayload.coordinates = coords;
    }
  }

  const provider = await Provider.findByIdAndUpdate(
    providerId,
    updatePayload,
    { new: true, runValidators: true }
  ).select('-password -resetOtp -resetOtpExpiry');

  if (!provider) throw new CustomError('Provider not found', 404);
  return provider;
};

export const uploadPortfolioImages = async (providerId, files) => {
  if (!files || files.length === 0) {
    throw new CustomError('No images provided', 400);
  }

  const newImages = files.map(file => ({
    url: file.path,
    publicId: file.filename
  }));

  const provider = await Provider.findByIdAndUpdate(
    providerId,
    { $push: { portfolioImages: { $each: newImages } } },
    { new: true }
  ).select('-password');

  if (!provider) throw new CustomError('Provider not found', 404);
  return provider.portfolioImages;
};

export const deletePortfolioImage = async (providerId, publicId) => {
  // Try to delete from Cloudinary
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary deletion error:', error);
    // Even if cloudinary fails, we might want to proceed to remove from DB,
    // but typically we should throw or log. We'll proceed to remove from DB.
  }

  const provider = await Provider.findByIdAndUpdate(
    providerId,
    { $pull: { portfolioImages: { publicId } } },
    { new: true }
  ).select('-password');

  if (!provider) throw new CustomError('Provider not found', 404);
  return provider.portfolioImages;
};
