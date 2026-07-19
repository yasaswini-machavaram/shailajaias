import { Router } from 'express';
import { toggleBookmark, getBookmarks, removeBookmark } from '../controllers/bookmark.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

router.use(protect);

// @route   POST /api/bookmarks
// @desc    Toggle question bookmark (Create/Delete)
// @access  Private (Student)
router.post('/', toggleBookmark);

// @route   GET /api/bookmarks
// @desc    Get all bookmarked questions for student
// @access  Private (Student)
router.get('/', getBookmarks);

// @route   DELETE /api/bookmarks/:id
// @desc    Remove a specific bookmark by ID
// @access  Private (Student)
router.delete('/:id', removeBookmark);

export default router;
