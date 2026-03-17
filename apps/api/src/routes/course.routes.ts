import { Router } from 'express';
import {
    getCourses,
    getCourse,
    createCourse,
    updateCourse,
    deleteCourse,
} from '../controllers/course.controller.js';
import { protect, adminOnly } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

// @route   GET /api/courses
// @desc    Get all root-level courses (tree)
// @access  Public
router.get('/', getCourses);

// @route   GET /api/courses/:id
// @desc    Get single course node with children
// @access  Public
router.get('/:id', getCourse);

// @route   POST /api/courses
// @desc    Create course node
// @access  Private/Admin
router.post('/', protect, adminOnly, createCourse);

// @route   PUT /api/courses/:id
// @desc    Update course node
// @access  Private/Admin
router.put('/:id', protect, adminOnly, updateCourse);

// @route   DELETE /api/courses/:id
// @desc    Delete course node (and children)
// @access  Private/Admin
router.delete('/:id', protect, adminOnly, deleteCourse);

export default router;
