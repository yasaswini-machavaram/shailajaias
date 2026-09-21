import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import {
    getDailyTaskData,
    logStudyHours,
    getRoadmapData,
    getStudentUploads,
    getStudentSessions,
    getStudentChat,
    sendStudentChat,
    saveTaskProgress
} from '../controllers/mentorshipStudent.controller.js';

const router: Router = Router();

router.use(protect);

router.get('/daily-task', getDailyTaskData);
router.post('/log-hours', logStudyHours);
router.post('/task-progress', saveTaskProgress);
router.get('/roadmap', getRoadmapData);
router.get('/uploads', getStudentUploads);
router.get('/sessions', getStudentSessions);
router.get('/chat', getStudentChat);
router.post('/chat', sendStudentChat);

export default router;
