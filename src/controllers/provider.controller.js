import { ProviderResponse, Request as RequestModel, Meeting } from '../models/index.js';
import mongoose from 'mongoose';

export const getIncomingRequests = async (req, res) => {
  try {
    const providerId = req.user.userId;
    const responses = await ProviderResponse.find({ providerId, status: 'pending' })
      .populate({
        path: 'requestId',
        populate: {
          path: 'userId',
          select: 'name'
        }
      });
      
    res.json(responses);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAssignedRequests = async (req, res) => {
  try {
    const providerId = req.user.userId;
    const requests = await RequestModel.find({ assignedProviderId: providerId })
      .populate('userId', 'name email');
    
    // attach meeting info if any
    const requestsWithMeetings = await Promise.all(requests.map(async (r) => {
       const o = r.toObject();
       if (r.status === 'meeting-scheduled') {
         const meeting = await Meeting.findOne({ requestId: r._id });
         o.meeting = meeting;
       }
       return o;
    }));

    res.json(requestsWithMeetings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const respondToRequest = async (req, res) => {
  try {
    const providerId = req.user.userId;
    const { id } = req.params; // this is the Request ID, not the response ID
    const { action } = req.body; // 'accept' or 'reject'

    if (!['accept', 'reject'].includes(action)) {
      res.status(400).json({ message: 'Invalid action' });
      return;
    }

    const providerResponse = await ProviderResponse.findOne({ requestId: id, providerId });
    if (!providerResponse) {
       res.status(404).json({ message: 'Response record not found' });
       return;
    }
    if (providerResponse.status !== 'pending') {
       res.status(400).json({ message: 'Already responded' });
       return;
    }

    if (action === 'reject') {
      providerResponse.status = 'rejected';
      await providerResponse.save();
      res.json({ message: 'Request rejected successfully' });
      return;
    }

    // Action is ACCEPT: Check for Race Condition using atomic isLocked check
    const request = await RequestModel.findOneAndUpdate(
      { _id: id, isLocked: false },
      { isLocked: true, assignedProviderId: providerId, status: 'assigned' },
      { new: true }
    );

    if (!request) {
      providerResponse.status = 'not-selected';
      await providerResponse.save();
      res.status(400).json({ message: 'Sorry, this request has already been assigned to another provider.' });
      return;
    }

    providerResponse.status = 'accepted';
    await providerResponse.save();

    // Mark other pending responses as not-selected
    await ProviderResponse.updateMany(
      { requestId: request._id, providerId: { $ne: providerId }, status: 'pending' },
      { status: 'not-selected' }
    );

    res.json({ message: 'Successfully assigned to this request.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};