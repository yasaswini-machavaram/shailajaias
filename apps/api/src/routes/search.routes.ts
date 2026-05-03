import { Router } from 'express';
import { searchAll } from '../controllers/search.controller.js';
import { getSearchIndex } from '../controllers/search-index.controller.js';

const router: ReturnType<typeof Router> = Router();

// @route   GET /api/search/index
// @desc    Lightweight search index for client-side Trie + Inverted Index
// @access  Public
router.get('/index', getSearchIndex);

// @route   GET /api/search
// @desc    Unified search across articles and quizzes (legacy fallback)
// @access  Public
router.get('/', searchAll);

export default router;
