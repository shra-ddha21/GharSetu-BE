import { Provider, Request as RequestModel, Meeting, User } from '../models/index.js';
import cloudinary from '../utils/cloudinary.js';

export const searchProviders = async (req, res) => {
  try {
    const { keyword, category, location, minExperience } = req.query;
    const query = { status: 'approved' };
    
    // 1. Keyword search (across multiple text fields)
    if (keyword) {
      const keywordRegex = new RegExp(keyword, 'i');
      query.$or = [
        { businessName: keywordRegex },
        { ownerName: keywordRegex },
        { serviceType: keywordRegex },
        { servicesOffered: keywordRegex },
        { description: keywordRegex }
      ];
    }

    // 2. Category specific match
    if (category) {
      const categoryRegex = new RegExp(category, 'i');
      // If $or already exists (from keyword), we use $and to ensure both conditions are met
      const categoryCondition = { $or: [{ serviceType: categoryRegex }, { servicesOffered: categoryRegex }] };
      if (query.$or) {
        query.$and = [categoryCondition];
      } else {
        query.$or = categoryCondition.$or;
      }
    }

    // 3. Location match
    if (location) {
      query.location = { $regex: new RegExp(location, 'i') };
    }

    // 4. Minimum Experience filter
    if (minExperience && !isNaN(minExperience) && Number(minExperience) > 0) {
      query.experience = { $gte: Number(minExperience) };
    }
    
    const providers = await Provider.find(query).select('-password').sort('-createdAt');
    res.json(providers);
  } catch (error) {
    console.error('Search error:', error);
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

// --- Profile Management ---

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -resetOtp -resetOtpExpiry');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { name, phone, address },
      { new: true, runValidators: true }
    ).select('-password -resetOtp -resetOtpExpiry');
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const uploadUserProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image provided' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Optional: Delete old profile image from cloudinary if it exists
    if (user.profileImage && user.profileImage.publicId) {
      try {
        await cloudinary.uploader.destroy(user.profileImage.publicId);
      } catch (err) {
        console.error('Failed to delete old profile image:', err);
      }
    }

    user.profileImage = {
      url: req.file.path,
      publicId: req.file.filename
    };

    await user.save();
    res.json(user.profileImage);
  } catch (error) {
    console.error('Profile image upload error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};