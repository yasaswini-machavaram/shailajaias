import { Router } from 'express';
import {
    getArticles,
    getArticle,
    createArticle,
    updateArticle,
    deleteArticle,
    getArticlesByDate,
    getArticlesByType,
    getDistinctTags,
    getAdjacentDates,
} from '../controllers/article.controller.js';
import { protect, adminOnly } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

// @route   GET /api/articles
// @desc    Get all articles with optional filters
// @access  Public
router.get('/', getArticles);

router.get('/by-date', getArticlesByDate);
 
// @route   GET /api/articles/adjacent-dates
// @desc    Get adjacent dates with articles
// @access  Public
router.get('/adjacent-dates', getAdjacentDates);

// @route   GET /api/articles/by-type/:type
// @desc    Get articles by type
// @access  Public
router.get('/by-type/:type', getArticlesByType);

// @route   GET /api/articles/tags
// @desc    Get distinct tags (optionally filtered by ?type=)
// @access  Public
router.get('/tags', getDistinctTags);

// @route   GET /api/articles/:id
// @desc    Get single article
// @access  Public
router.get('/:id', getArticle);

// @route   POST /api/articles
// @desc    Create article
// @access  Private/Admin
router.post('/', protect, adminOnly, createArticle);

// @route   PUT /api/articles/:id
// @desc    Update article
// @access  Private/Admin
router.put('/:id', protect, adminOnly, updateArticle);

// @route   DELETE /api/articles/:id
// @desc    Delete article
// @access  Private/Admin
router.delete('/:id', protect, adminOnly, deleteArticle);

export default router;
