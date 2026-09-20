import { Router } from 'express';
import { getAttemptStatus, recordAttempt } from '../controllers/testAttempt.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router: Router = Router();

router.get('/:ptsId/:testIndex', protect, getAttemptStatus);
router.post('/record', protect, recordAttempt);

export default router;
