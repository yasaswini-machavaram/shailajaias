import { Router } from 'express';
import {
    createMentor,
    getAllMentors,
    getMentorById,
    updateMentor,
    deleteMentor,
    assignMtsBatch,
    assignStudentsToMentor,
} from '../controllers/mentor.controller.js';
import { protect, adminOnly } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

// @route   POST /api/mentors — Create mentor account
router.post('/', protect, adminOnly, createMentor);

// @route   GET /api/mentors — List all mentors
router.get('/', protect, adminOnly, getAllMentors);

// @route   GET /api/mentors/:id — Get mentor details
router.get('/:id', protect, adminOnly, getMentorById);

// @route   PUT /api/mentors/:id — Update mentor
router.put('/:id', protect, adminOnly, updateMentor);

// @route   DELETE /api/mentors/:id — Delete mentor
router.delete('/:id', protect, adminOnly, deleteMentor);

// @route   PUT /api/mentors/:id/assign-batch — Assign MTS batches
router.put('/:id/assign-batch', protect, adminOnly, assignMtsBatch);

// @route   PUT /api/mentors/:id/assign-students — Assign students
router.put('/:id/assign-students', protect, adminOnly, assignStudentsToMentor);

export default router;
