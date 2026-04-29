import { Router } from 'express';
import { getProviders, approveProvider, rejectProvider, getAllRequests, sendRequestToProviders, scheduleMeeting, completeRequest, reassignRequest, getAdminStats, getAdminProfile, updateAdminProfile, uploadAdminProfileImage } from '../controllers/admin.controller.js';
import { upload } from '../utils/cloudinary.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(authMiddleware(['admin']));

router.get('/providers', getProviders);
router.patch('/providers/:id/approve', approveProvider);
router.patch('/providers/:id/reject', rejectProvider);

router.get('/requests', getAllRequests);
router.post('/requests/:id/send', sendRequestToProviders);
router.post('/requests/:id/schedule-meeting', scheduleMeeting);
router.patch('/requests/:id/complete', completeRequest);
router.post('/requests/:id/reassign', reassignRequest);

// Profile and Stats routes
router.get('/profile', getAdminProfile);
router.put('/profile', updateAdminProfile);
router.post('/profile/image', upload.single('image'), uploadAdminProfileImage);
router.get('/stats', getAdminStats);

export default router;