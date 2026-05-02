import { Router } from 'express';
import { 
  getIncomingRequests, getAssignedRequests, respondToRequest,
  getProfile, updateProfile, uploadPortfolio, deletePortfolioImage,
  uploadDocuments, sendPhoneOtp, verifyPhoneOtp
} from '../controllers/provider.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { upload } from '../utils/cloudinary.js';

const router = Router();
router.use(authMiddleware(['provider']));

router.get('/requests/incoming', getIncomingRequests);
router.get('/requests/assigned', getAssignedRequests);
router.post('/requests/:id/respond', respondToRequest);

// Profile Management
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/profile/portfolio', upload.array('images', 10), uploadPortfolio);
router.delete('/profile/portfolio/:publicId', deletePortfolioImage);

// New Enhancements
router.post('/profile/documents', upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'frontImage', maxCount: 1 },
  { name: 'backImage', maxCount: 1 }
]), uploadDocuments);

router.post('/profile/send-phone-otp', sendPhoneOtp);
router.post('/profile/verify-phone-otp', verifyPhoneOtp);

export default router;