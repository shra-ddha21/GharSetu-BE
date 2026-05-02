import { Provider, Request as RequestModel, ProviderResponse, Meeting, User, Admin } from '../models/index.js';
import mongoose from 'mongoose';
import cloudinary from '../utils/cloudinary.js';
import { 
  sendProviderApprovalEmail, 
  sendProviderRejectionEmail, 
  sendRequestForwardedProviderEmail, 
  sendMeetingScheduledEmail 
} from '../utils/email.service.js';

// --- Provider Management ---
export const getProviders = async (req, res) => {
  try {
    const status = req.query.status;
    const filter = status ? { status } : {};
    const providers = await Provider.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(providers);
  } catch (error) {
    console.error("getProviders error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAdminStats = async (req, res) => {
  try {
    const [
      totalUsers,
      pendingProviders,
      approvedProviders,
      totalProviders,
      totalRequests,
      activeRequests,
      completedRequests,
      recentPendingProviders
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Provider.countDocuments({ status: 'pending' }),
      Provider.countDocuments({ status: 'approved' }),
      Provider.countDocuments(),
      RequestModel.countDocuments(),
      RequestModel.countDocuments({ status: { $in: ['pending', 'in-progress', 'assigned', 'meeting-scheduled'] } }),
      RequestModel.countDocuments({ status: 'completed' }),
      Provider.find({ status: 'pending' }).select('businessName ownerName serviceType createdAt email').sort({ createdAt: -1 }).limit(5)
    ]);

    res.json({
      totalUsers,
      pendingProviders,
      approvedProviders,
      activeRequests,
      totalProviders,
      totalRequests,
      completedRequests,
      recentPendingProviders
    });
  } catch (error) {
    console.error("getAdminStats error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};


export const approveProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const provider = await Provider.findByIdAndUpdate(id, { status: 'approved' }, { new: true }).select('-password');
    if (!provider) { res.status(404).json({ message: 'Provider not found' }); return; }
    
    await sendProviderApprovalEmail(provider.email, provider.ownerName);
    
    res.json({ message: 'Provider approved', provider });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const rejectProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const provider = await Provider.findByIdAndUpdate(id, { status: 'rejected' }, { new: true }).select('-password');
    if (!provider) { res.status(404).json({ message: 'Provider not found' }); return; }
    
    await sendProviderRejectionEmail(provider.email, provider.ownerName, reason);
    
    res.json({ message: 'Provider rejected', provider });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deactivateProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const provider = await Provider.findByIdAndUpdate(id, { status: 'deactivated' }, { new: true }).select('-password');
    if (!provider) { res.status(404).json({ message: 'Provider not found' }); return; }
    res.json({ message: 'Provider deactivated successfully', provider });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const reactivateProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const provider = await Provider.findByIdAndUpdate(id, { status: 'approved' }, { new: true }).select('-password');
    if (!provider) { res.status(404).json({ message: 'Provider not found' }); return; }
    res.json({ message: 'Provider reactivated successfully', provider });
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

    // Send emails to selected providers
    for (const pId of request.selectedProviders) {
      const p = await Provider.findById(pId);
      if (p) {
        await sendRequestForwardedProviderEmail(p.email, {
          requirement: request.requirement,
          preferredDate: new Date(request.preferredDate).toLocaleDateString()
        });
      }
    }

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

     // Fetch User and Assigned Provider to send email
     const [user, provider] = await Promise.all([
       User.findById(request.userId),
       Provider.findById(request.assignedProviderId)
     ]);

     if (user && provider) {
       const meetingData = {
         scheduledAt: date,
         meetingLink: link,
         serviceType: request.requirement,
         userName: user.name,
         providerName: provider.businessName
       };
       
       await sendMeetingScheduledEmail(user.email, user.name, meetingData, false);
       await sendMeetingScheduledEmail(provider.email, provider.businessName, meetingData, true);
     }

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



// --- Admin Profile Management ---

export const getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.userId).select('-password -resetOtp -resetOtpExpiry');
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateAdminProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const admin = await Admin.findByIdAndUpdate(
      req.user.userId,
      { name, phone, address },
      { new: true, runValidators: true }
    ).select('-password -resetOtp -resetOtpExpiry');
    
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const uploadAdminProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image provided' });
    }

    const admin = await Admin.findById(req.user.userId);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    if (admin.profileImage && admin.profileImage.publicId) {
      try {
        await cloudinary.uploader.destroy(admin.profileImage.publicId);
      } catch (err) {
        console.error('Failed to delete old profile image:', err);
      }
    }

    admin.profileImage = {
      url: req.file.path,
      publicId: req.file.filename
    };

    await admin.save();
    res.json(admin.profileImage);
  } catch (error) {
    console.error('Admin profile image upload error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};