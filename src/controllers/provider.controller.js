import { ProviderResponse, Request as RequestModel, Meeting, User, Admin, Provider } from '../models/index.js';
import mongoose from 'mongoose';
import * as providerService from '../services/provider.service.js';
import { sendProviderResponseEmail } from '../utils/email.service.js';

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
      
      // Fetch details for email
      const reqDoc = await RequestModel.findById(id).populate('userId', 'name email');
      const provider = await Provider.findById(providerId);
      const admin = await Admin.findOne({});
      
      if (reqDoc && provider && reqDoc.userId) {
        await sendProviderResponseEmail(reqDoc.userId.email, reqDoc.userId.name, provider.businessName, 'reject', true);
        if (admin) await sendProviderResponseEmail(admin.email, 'Admin', provider.businessName, 'reject', false);
      }

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

    // Fetch details for email
    const userDoc = await User.findById(request.userId);
    const provider = await Provider.findById(providerId);
    const admin = await Admin.findOne({});
    
    if (userDoc && provider) {
      await sendProviderResponseEmail(userDoc.email, userDoc.name, provider.businessName, 'accept', true);
      if (admin) await sendProviderResponseEmail(admin.email, 'Admin', provider.businessName, 'accept', false);
    }

    res.json({ message: 'Successfully assigned to this request.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Profile Management

export const getProfile = async (req, res, next) => {
  try {
    const providerId = req.user.userId;
    const profile = await providerService.getProviderProfile(providerId);
    res.json({ success: true, data: profile, message: 'Profile fetched successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const providerId = req.user.userId;
    const profile = await providerService.updateProviderProfile(providerId, req.body);
    res.json({ success: true, data: profile, message: 'Profile updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const uploadPortfolio = async (req, res, next) => {
  try {
    const providerId = req.user.userId;
    const images = await providerService.uploadPortfolioImages(providerId, req.files);
    res.json({ success: true, data: images, message: 'Images uploaded successfully' });
  } catch (error) {
    next(error);
  }
};

export const deletePortfolioImage = async (req, res, next) => {
  try {
    const providerId = req.user.userId;
    const { publicId } = req.params;
    const images = await providerService.deletePortfolioImage(providerId, publicId);
    res.json({ success: true, data: images, message: 'Image deleted successfully' });
  } catch (error) {
    next(error);
  }
};