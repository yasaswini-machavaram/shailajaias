import { Router } from 'express';
import {
    getAllStudents,
    getStudentById,
    updateStudent,
    deleteStudent,
} from '../controllers/adminUser.controller.js';
import { protect, adminOnly } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

// Apply auth middleware to all admin user routes
router.use(protect);
router.use(adminOnly);

// @route   GET /api/admin/users
// @desc    Get all student profiles
router.get('/', getAllStudents);

// @route   GET /api/admin/users/:id
// @desc    Get details for a single student
router.get('/:id', getStudentById);

// @route   PUT /api/admin/users/:id
// @desc    Update student credentials and course access
router.put('/:id', updateStudent);

// @route   DELETE /api/admin/users/:id
// @desc    Delete student profile
router.delete('/:id', deleteStudent);

export default router;
