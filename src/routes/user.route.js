import { Router } from 'express';
import { searchProviders, getProviderDetails, createRequest, getMyRequests } from '../controllers/user.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(authMiddleware(['user']));

router.get('/search', searchProviders);
router.get('/providers/:id', getProviderDetails);
router.post('/requests', createRequest);
router.get('/requests/me', getMyRequests);

export default router;