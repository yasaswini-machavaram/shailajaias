import { Router } from 'express';
import {
    getMentorshipCourses,
    getAdminMentorshipCourses,
    createMentorshipCourse,
    updateMentorshipCourse,
    deleteMentorshipCourse,
} from '../controllers/mentorship.controller.js';
import { protect, adminOnly } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

// @route   GET /api/mentorship-courses
router.get('/', getMentorshipCourses);

// @route   GET /api/mentorship-courses/admin
router.get('/admin', protect, adminOnly, getAdminMentorshipCourses);

// @route   POST /api/mentorship-courses
router.post('/', protect, adminOnly, createMentorshipCourse);

// @route   PUT /api/mentorship-courses/:id
router.put('/:id', protect, adminOnly, updateMentorshipCourse);

// @route   DELETE /api/mentorship-courses/:id
router.delete('/:id', protect, adminOnly, deleteMentorshipCourse);

export default router;
