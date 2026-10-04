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
    saveTaskProgress,
    requestBreak,
    cancelBreakRequest,
    pauseSubject,
    resumeSubject,
    requestReorder,
} from '../controllers/mentorshipStudent.controller.js';

const router: Router = Router();

router.use(protect);

router.get('/daily-task', getDailyTaskData);
router.post('/log-hours', logStudyHours);
router.post('/task-progress', saveTaskProgress);
router.get('/roadmap', getRoadmapData);
router.post('/break-request', requestBreak);
router.post('/cancel-break-request', cancelBreakRequest);
router.post('/pause-subject', pauseSubject);
router.post('/resume-subject', resumeSubject);
router.post('/reorder-request', requestReorder);
router.get('/uploads', getStudentUploads);
router.get('/sessions', getStudentSessions);
router.get('/chat', getStudentChat);
router.post('/chat', sendStudentChat);

export default router;
