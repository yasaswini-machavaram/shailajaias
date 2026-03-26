import { Router } from 'express';
import { searchAll } from '../controllers/search.controller.js';

const router: ReturnType<typeof Router> = Router();

// @route   GET /api/search
// @desc    Unified search across articles and quizzes
// @access  Public
router.get('/', searchAll);

export default router;
