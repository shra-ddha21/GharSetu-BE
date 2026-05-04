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

const calculateProfileCompletion = (provider) => {
  const fields = [
    'businessName', 'ownerName', 'email', 'phone', 'experience', 'description',
    'address.street', 'address.state', 'address.district', 'address.city', 'address.pincode',
    'profileImage.url', 'governmentId.frontImage', 'governmentId.backImage'
  ];

  let completedFields = 0;
  const missingFields = [];

  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  };

  fields.forEach(field => {
    const value = getNestedValue(provider, field);
    if (value !== undefined && value !== null && value !== '') {
      completedFields++;
    } else {
      missingFields.push(field);
    }
  });

  // Coordinates are also a requirement
  if (provider.coordinates && provider.coordinates.lat && provider.coordinates.lng) {
    completedFields++;
  } else {
    missingFields.push('coordinates');
  }

  if (provider.phoneVerified === true) {
    completedFields++;
  } else {
    missingFields.push('phoneVerified');
  }

  if (provider.servicesOffered && provider.servicesOffered.length > 0) {
    completedFields++;
  } else {
    missingFields.push('servicesOffered');
  }

  const totalFields = 17; // Updated to 17 to match UI fields and phone verification
  const percentage = Math.round((completedFields / totalFields) * 100);
  
  return { percentage, missingFields };
};

export const getProviderProfile = async (providerId) => {
  const provider = await Provider.findById(providerId).select('-password -resetOtp -resetOtpExpiry');
  if (!provider) throw new CustomError('Provider not found', 404);
  
  const { percentage, missingFields } = calculateProfileCompletion(provider);
  return { ...provider.toObject(), completionPercentage: percentage, missingFields };
};

export const updateProviderProfile = async (providerId, updateData) => {
  const { 
    businessName, ownerName, email, phone, servicesOffered, location, experience, 
    description, coordinates, address, serviceType 
  } = updateData;
  
  const updatePayload = {};

  // Fetch existing provider to check for phone number changes
  const existingProvider = await Provider.findById(providerId);
  if (!existingProvider) throw new CustomError('Provider not found', 404);

  // Conditionally add fields to payload if they are present in updateData
  if (businessName !== undefined) updatePayload.businessName = businessName;
  if (ownerName !== undefined) updatePayload.ownerName = ownerName;
  if (email !== undefined) updatePayload.email = email;
  
  if (phone !== undefined) {
    updatePayload.phone = phone;
    if (phone !== existingProvider.phone) {
      updatePayload.phoneVerified = false;
    }
  }
  
  if (servicesOffered !== undefined) updatePayload.servicesOffered = servicesOffered;
  if (location !== undefined) updatePayload.location = location;
  if (experience !== undefined) updatePayload.experience = experience;
  if (description !== undefined) updatePayload.description = description;
  if (address !== undefined) updatePayload.address = address;
  if (serviceType !== undefined) updatePayload.serviceType = serviceType;

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

  // Update provider
  let provider = await Provider.findByIdAndUpdate(
    providerId,
    updatePayload,
    { new: true, runValidators: true }
  ).select('-password -resetOtp -resetOtpExpiry');

  if (!provider) throw new CustomError('Provider not found', 404);

  // Recalculate completion and update isVerifiedProfile
  const { percentage } = calculateProfileCompletion(provider);
  const isVerified = percentage === 100 && provider.phoneVerified === true;
  
  if (provider.isVerifiedProfile !== isVerified) {
    provider.isVerifiedProfile = isVerified;
    await provider.save();
  }

  return { ...provider.toObject(), completionPercentage: percentage };
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
    console.error('Failed to delete image from Cloudinary:', error);
    // Continue even if Cloudinary fails, to ensure DB is in sync
  }

  const provider = await Provider.findByIdAndUpdate(
    providerId,
    { $pull: { portfolioImages: { publicId } } },
    { new: true }
  ).select('-password');

  if (!provider) throw new CustomError('Provider not found', 404);
  return provider.portfolioImages;
};

export const uploadProfileDocuments = async (providerId, files) => {
  if (!files || Object.keys(files).length === 0) {
    throw new CustomError('No documents provided', 400);
  }

  const updatePayload = {};

  if (files.profileImage && files.profileImage[0]) {
    updatePayload.profileImage = {
      url: files.profileImage[0].path,
      publicId: files.profileImage[0].filename
    };
  }

  if (files.frontImage && files.frontImage[0]) {
    updatePayload['governmentId.frontImage'] = {
      url: files.frontImage[0].path,
      publicId: files.frontImage[0].filename
    };
  }

  if (files.backImage && files.backImage[0]) {
    updatePayload['governmentId.backImage'] = {
      url: files.backImage[0].path,
      publicId: files.backImage[0].filename
    };
  }

  const provider = await Provider.findByIdAndUpdate(
    providerId,
    { $set: updatePayload },
    { new: true, runValidators: true }
  ).select('-password');

  if (!provider) throw new CustomError('Provider not found', 404);
  
  // Recalculate completion
  const { percentage } = calculateProfileCompletion(provider);
  const isVerified = percentage === 100 && provider.phoneVerified === true;
  
  if (provider.isVerifiedProfile !== isVerified) {
    provider.isVerifiedProfile = isVerified;
    await provider.save();
  }

  return { ...provider.toObject(), completionPercentage: percentage };
};

export const sendProviderPhoneOtp = async (providerId, phone) => {
  const provider = await Provider.findById(providerId);
  if (!provider) throw new CustomError('Provider not found', 404);
  
  const targetPhone = phone || provider.phone;
  if (!targetPhone) throw new CustomError('No phone number provided', 400);

  // If a new phone number is provided, update it and reset verification status
  if (phone && phone !== provider.phone) {
    provider.phone = phone;
    provider.phoneVerified = false;
    provider.isVerifiedProfile = false;
  }

  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  provider.phoneOtp = otp;
  provider.phoneOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await provider.save();

  const { sendPhoneOtp } = await import('../utils/sms.service.js');
  const isSent = await sendPhoneOtp(targetPhone, otp);
  if (!isSent) {
    throw new CustomError('Failed to send OTP via SMS', 500);
  }

  return { message: 'OTP sent successfully to ' + targetPhone };
};

export const verifyProviderPhoneOtp = async (providerId, otp) => {
  const provider = await Provider.findById(providerId);
  if (!provider) throw new CustomError('Provider not found', 404);

  if (!provider.phoneOtp || provider.phoneOtp !== otp) {
    throw new CustomError('Invalid OTP', 400);
  }

  if (new Date() > provider.phoneOtpExpiry) {
    throw new CustomError('OTP has expired', 400);
  }

  provider.phoneVerified = true;
  provider.phoneOtp = null;
  provider.phoneOtpExpiry = null;
  
  // Recalculate verification state since phone is now verified
  const { percentage } = calculateProfileCompletion(provider);
  provider.isVerifiedProfile = percentage === 100;

  await provider.save();
  return { ...provider.toObject(), completionPercentage: percentage, message: 'Phone verified successfully' };
};
