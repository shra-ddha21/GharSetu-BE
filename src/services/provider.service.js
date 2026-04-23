import ProviderResponse from '../models/ProviderResponse.model.js';
import Request from '../models/Request.model.js';
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
