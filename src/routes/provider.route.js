import { Router } from 'express';
import { getIncomingRequests, getAssignedRequests, respondToRequest } from '../controllers/provider.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(authMiddleware(['provider']));

router.get('/requests/incoming', getIncomingRequests);
router.get('/requests/assigned', getAssignedRequests);
router.post('/requests/:id/respond', respondToRequest);

export default router;