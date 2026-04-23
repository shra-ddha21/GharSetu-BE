import { Provider, Request as RequestModel, ProviderResponse, Meeting } from '../models/index.js';
import mongoose from 'mongoose';

// --- Provider Management ---
export const getProviders = async (req, res) => {
  try {
    const status = req.query.status;
    const filter = status ? { status } : {};
    const providers = await Provider.find(filter).select('-password');
    res.json(providers);
  } catch (error) {
    console.error("getProviders error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const approveProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const provider = await Provider.findByIdAndUpdate(id, { status: 'approved' }, { new: true }).select('-password');
    if (!provider) { res.status(404).json({ message: 'Provider not found' }); return; }
    res.json({ message: 'Provider approved', provider });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const rejectProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const provider = await Provider.findByIdAndUpdate(id, { status: 'rejected' }, { new: true }).select('-password');
    if (!provider) { res.status(404).json({ message: 'Provider not found' }); return; }
    res.json({ message: 'Provider rejected', provider });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// --- Request Management ---

export const getAllRequests = async (req, res) => {
  try {
    const requests = await RequestModel.find()
      .populate('userId', 'name email')
      .populate('selectedProviders', 'businessName ownerName email phone location serviceType')
      .populate('assignedProviderId', 'businessName ownerName email phone location serviceType')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const sendRequestToProviders = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await RequestModel.findById(id);
    
    if (!request) { 
      res.status(404).json({ message: 'Request not found' }); 
      return; 
    }
    if (request.status !== 'pending') { 
      res.status(400).json({ message: 'Only pending requests can be sent to providers' }); 
      return; 
    }

    // Create provider responses
    const providerResponses = request.selectedProviders.map(providerId => ({
      requestId: request._id,
      providerId,
      status: 'pending'
    }));

    await ProviderResponse.insertMany(providerResponses);
    
    request.status = 'in-progress';
    await request.save();

    res.json({ message: 'Request sent to selected providers successfully', request });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const scheduleMeeting = async (req, res) => {
   try {
     const { id } = req.params;
     const { date, link } = req.body;

     if (!date || !link) { res.status(400).json({ message: 'Date and link are required' }); return; }

     const request = await RequestModel.findById(id);
     if (!request) { res.status(404).json({ message: 'Request not found' }); return; }
     if (request.status !== 'assigned') { res.status(400).json({ message: 'Meeting can only be scheduled for assigned requests' }); return; }

     const meeting = await Meeting.create({ requestId: request._id, date, link });
     request.status = 'meeting-scheduled';
     await request.save();

     res.json({ message: 'Meeting scheduled successfully', meeting, request });
   } catch (error) {
     res.status(500).json({ message: 'Server error' });
   }
};

export const completeRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await RequestModel.findById(id);
    if (!request) { res.status(404).json({ message: 'Request not found' }); return; }
    if (request.status !== 'meeting-scheduled') { res.status(400).json({ message: 'Only meeting-scheduled requests can be completed' }); return; }

    request.status = 'completed';
    await request.save();

    res.json({ message: 'Request marked as completed', request });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const reassignRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { newProviderIds } = req.body;
    
    if (!newProviderIds || newProviderIds.length === 0 || newProviderIds.length > 5) {
       res.status(400).json({ message: 'Provide 1 to 5 new providers' });
       return;
    }

    const request = await RequestModel.findById(id);
    if (!request) { res.status(404).json({ message: 'Request not found' }); return; }
    
    if (!['assigned', 'meeting-scheduled'].includes(request.status)) {
       res.status(400).json({ message: 'Can only reassign if assigned or meeting-scheduled' });
       return;
    }

    // Reset request state
    request.status = 'in-progress';
    request.assignedProviderId = null;
    request.isLocked = false;
    request.selectedProviders = newProviderIds;
    await request.save();

    // Clear old provider responses
    await ProviderResponse.deleteMany({ requestId: request._id });
    
    // Create new provider responses
    const providerResponses = newProviderIds.map((providerId) => ({
      requestId: request._id,
      providerId,
      status: 'pending'
    }));

    await ProviderResponse.insertMany(providerResponses);
    
    // Delete associated meeting if any
    await Meeting.deleteMany({ requestId: request._id });

    res.json({ message: 'Request reassigned successfully', request });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};