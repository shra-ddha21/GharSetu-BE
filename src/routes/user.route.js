import { Router } from 'express';
import { searchProviders, getProviderDetails, createRequest, getMyRequests, getUserProfile, updateUserProfile, uploadUserProfileImage } from '../controllers/user.controller.js';
import { upload } from '../utils/cloudinary.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(authMiddleware(['user']));

router.get('/search', searchProviders);
router.get('/providers/:id', getProviderDetails);
router.post('/requests', createRequest);
router.get('/requests/me', getMyRequests);

// Profile routes
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.post('/profile/image', upload.single('image'), uploadUserProfileImage);

export default router;