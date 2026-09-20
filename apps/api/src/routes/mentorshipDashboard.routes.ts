import { Router } from 'express';
import {
    getMentorshipDashboardData,
    toggleTaskProgress,
} from '../controllers/mentorshipDashboard.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router: Router = Router();

router.get('/data', protect, getMentorshipDashboardData);
router.post('/toggle-task', protect, toggleTaskProgress);

export default router;
