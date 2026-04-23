import { Provider, Request as RequestModel, Meeting } from '../models/index.js';

export const searchProviders = async (req, res) => {
  try {
    const { serviceType, location } = req.query;
    const query = { status: 'approved' };
    if (serviceType) query.serviceType = { $regex: new RegExp(serviceType, 'i') };
    if (location) query.location = { $regex: new RegExp(location, 'i') };
    
    const providers = await Provider.find(query).select('-password');
    res.json(providers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getProviderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const provider = await Provider.findById(id).select('-password');
    if (!provider) { res.status(404).json({ message: 'Provider not found' }); return; }
    res.json(provider);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createRequest = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { requirement, preferredDate, providerIds } = req.body;

    if (!requirement || !preferredDate || !providerIds || !Array.isArray(providerIds) || providerIds.length === 0) {
       res.status(400).json({ message: 'Requirement, preferredDate, and at least one provider must be specified.' });
       return;
    }
    if (providerIds.length > 5) {
       res.status(400).json({ message: 'Maximum 5 providers can be selected' });
       return;
    }

    const request = await RequestModel.create({
      userId,
      requirement,
      preferredDate,
      selectedProviders: providerIds
    });

    res.status(201).json({ message: 'Request created successfully', request });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMyRequests = async (req, res) => {
  try {
    const userId = req.user.userId;
    const requests = await RequestModel.find({ userId })
      .populate('selectedProviders', 'businessName ownerName location serviceType')
      .populate('assignedProviderId', 'businessName ownerName phone email')
      .sort({ createdAt: -1 });

    const requestsWithMeetings = await Promise.all(requests.map(async (r) => {
       const o = r.toObject();
       if (r.status === 'meeting-scheduled' || r.status === 'completed') {
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