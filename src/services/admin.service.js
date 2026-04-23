import Provider from '../models/Provider.model.js';
import Request from '../models/Request.model.js';
import ProviderResponse from '../models/ProviderResponse.model.js';
import Meeting from '../models/Meeting.model.js';
import CustomError from '../utils/custom.error.js';

export const getProviders = async (queryFilters) => {
  return Provider.find(queryFilters).select('-password');
};

export const updateProviderStatus = async (providerId, status) => {
  const provider = await Provider.findByIdAndUpdate(
    providerId,
    { status },
    { new: true }
  );
  if (!provider) {
    throw new CustomError('Provider not found', 404);
  }
  return provider;
};

export const getAllRequests = async () => {
  return Request.find()
    .populate('userId', 'name email')
    .populate('selectedProviders', 'businessName ownerName')
    .populate('assignedProvider', 'businessName ownerName')
    .sort('-createdAt');
};

export const sendRequestToProviders = async (requestId) => {
  const request = await Request.findById(requestId);
  if (!request) throw new CustomError('Request not found', 404);
  
  if (request.status !== 'pending') {
    throw new CustomError(`Cannot send request. Current status: ${request.status}`, 400);
  }

  // Update request status
  request.status = 'in-progress';
  await request.save();

  // Create ProviderResponse for each selected provider
  const responses = request.selectedProviders.map(providerId => ({
    requestId: request._id,
    providerId: providerId,
    status: 'pending'
  }));

  // Insert safely (ignoring duplicates if any)
  try {
    await ProviderResponse.insertMany(responses, { ordered: false });
  } catch (err) {
    // some might already exist, that's fine
  }

  return { message: 'Request sent to selected providers' };
};

export const scheduleMeeting = async (requestId, meetingData) => {
  const request = await Request.findById(requestId);
  if (!request || request.status !== 'assigned' || !request.assignedProvider) {
    throw new CustomError('Request is not assigned to any provider yet', 400);
  }

  const newMeeting = await Meeting.create({
    requestId: request._id,
    userId: request.userId,
    providerId: request.assignedProvider,
    meetingDate: new Date(meetingData.date),
    meetingTime: new Date(meetingData.date).toLocaleTimeString(), // Or pass separately
    meetingLink: meetingData.link
  });

  request.status = 'meeting-scheduled';
  await request.save();

  return newMeeting;
};

export const completeRequest = async (requestId) => {
  const request = await Request.findById(requestId);
  if (!request) throw new CustomError('Request not found', 404);

  request.status = 'completed';
  await request.save();
  return request;
};
