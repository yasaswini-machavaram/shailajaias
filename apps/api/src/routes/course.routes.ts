import { Router } from 'express';
import {
    getCourses,
    getCourse,
    getCourseTree,
    createCourse,
    updateCourse,
    updateLockStatus,
    deleteCourse,
} from '../controllers/course.controller.js';
import { protect, adminOnly } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

// @route   GET /api/courses
// @desc    Get all root-level courses
// @access  Public
router.get('/', getCourses);

// @route   GET /api/courses/tree/:id?
// @desc    Get full course tree for root node or all
// @access  Public
router.get('/tree/:id?', getCourseTree);

// @route   GET /api/courses/:id
// @desc    Get single course node with immediate children
// @access  Public
router.get('/:id', getCourse);

// @route   POST /api/courses
// @desc    Create course node
// @access  Private/Admin
router.post('/', protect, adminOnly, createCourse);

// @route   PUT /api/courses/:id/lock-status
// @desc    Update lock switches for a course node
// @access  Private/Admin
router.put('/:id/lock-status', protect, adminOnly, updateLockStatus);

// @route   PUT /api/courses/:id
// @desc    Update course node
// @access  Private/Admin
router.put('/:id', protect, adminOnly, updateCourse);

// @route   DELETE /api/courses/:id
// @desc    Delete course node (and children)
// @access  Private/Admin
router.delete('/:id', protect, adminOnly, deleteCourse);

export default router;
