import { Router } from 'express';
import { 
  getIncomingRequests, getAssignedRequests, respondToRequest,
  getProfile, updateProfile, uploadPortfolio, deletePortfolioImage
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

export default router;