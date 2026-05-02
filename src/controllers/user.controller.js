import { Provider, Request as RequestModel, Meeting, User, Admin } from '../models/index.js';
import cloudinary from '../utils/cloudinary.js';
import { sendUserRequestAdminEmail } from '../utils/email.service.js';

export const searchProviders = async (req, res) => {
  try {
    const { keyword, category, state, district, city, minExperience } = req.query;
    const conditions = [{ status: 'approved' }];
    
    // 1. Keyword search (across multiple text fields)
    if (keyword) {
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const keywordRegex = new RegExp(escapedKeyword, 'i');
      conditions.push({
        $or: [
          { businessName: keywordRegex },
          { ownerName: keywordRegex },
          { serviceType: keywordRegex },
          { servicesOffered: keywordRegex },
          { description: keywordRegex }
        ]
      });
    }

    // 2. Category specific match
    if (category) {
      // Escape special regex characters in the category string
      const escapedCategory = category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const categoryRegex = new RegExp(`^${escapedCategory}$`, 'i');
      conditions.push({
        $or: [
          { serviceType: categoryRegex },
          { servicesOffered: categoryRegex }
        ]
      });
    }

    // 3. Location match (State, District, City)
    if (state) {
      const escapedState = state.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      conditions.push({ 'address.state': { $regex: new RegExp(escapedState, 'i') } });
    }
    if (district) {
      const escapedDistrict = district.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      conditions.push({ 'address.district': { $regex: new RegExp(escapedDistrict, 'i') } });
    }
    if (city) {
      const escapedCity = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      conditions.push({ 'address.city': { $regex: new RegExp(escapedCity, 'i') } });
    }

    // 4. Minimum Experience filter
    if (minExperience && !isNaN(minExperience) && Number(minExperience) > 0) {
      conditions.push({ experience: { $gte: Number(minExperience) } });
    }
    
    const query = conditions.length > 1 ? { $and: conditions } : conditions[0];
    
    const providers = await Provider.find(query)
      .select('-password')
      .sort({ isVerifiedProfile: -1, createdAt: -1 });
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

    const admin = await Admin.findOne({});
    if (admin) {
      await sendUserRequestAdminEmail(admin.email, {
        userName: req.user.name || 'A user',
        requirement,
        preferredDate: new Date(preferredDate).toLocaleDateString(),
        providerCount: providerIds.length
      });
    }

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