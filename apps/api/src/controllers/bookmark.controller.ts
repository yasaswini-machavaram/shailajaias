import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import { Bookmark } from '../models/index.js';

/**
 * @desc    Toggle bookmark for a question (Create if not exists, delete if exists)
 * @route   POST /api/bookmarks
 * @access  Private (Student)
 */
export const toggleBookmark = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { quizId, questionIndex, question, options, correctIndex, explanation, subject, testTitle, testSeriesId, source } = req.body;

        if (!quizId || questionIndex === undefined || !question || !options || correctIndex === undefined || !explanation || !source) {
            res.status(400).json({ success: false, message: 'Missing required question fields' });
            return;
        }

        if (!req.user) {
            res.status(401).json({ success: false, message: 'Not authenticated' });
            return;
        }

        // Check if bookmark already exists
        const existingBookmark = await Bookmark.findOne({
            userId: req.user._id,
            quizId,
            questionIndex
        });

        if (existingBookmark) {
            await Bookmark.deleteOne({ _id: existingBookmark._id });
            res.json({
                success: true,
                bookmarked: false,
                message: 'Bookmark removed successfully',
            });
            return;
        }

        // Create new bookmark
        const bookmark = new Bookmark({
            userId: req.user._id,
            quizId,
            questionIndex,
            question,
            options,
            correctIndex,
            explanation,
            subject: subject || undefined,
            testTitle: testTitle || undefined,
            testSeriesId: testSeriesId || undefined,
            source,
        });

        await bookmark.save();

        res.status(201).json({
            success: true,
            bookmarked: true,
            data: bookmark,
            message: 'Question bookmarked successfully',
        });
    } catch (error) {
        console.error('Toggle bookmark error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * @desc    Get all bookmarks for the logged-in student
 * @route   GET /api/bookmarks
 * @access  Private (Student)
 */
export const getBookmarks = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Not authenticated' });
            return;
        }

        const bookmarks = await Bookmark.find({ userId: req.user._id })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: bookmarks,
        });
    } catch (error) {
        console.error('Get bookmarks error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * @desc    Remove a specific bookmark by ID
 * @route   DELETE /api/bookmarks/:id
 * @access  Private (Student)
 */
export const removeBookmark = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Not authenticated' });
            return;
        }

        const bookmark = await Bookmark.findById(req.params.id);

        if (!bookmark) {
            res.status(404).json({ success: false, message: 'Bookmark not found' });
            return;
        }

        if (bookmark.userId.toString() !== req.user._id.toString()) {
            res.status(403).json({ success: false, message: 'Access denied' });
            return;
        }

        await Bookmark.deleteOne({ _id: bookmark._id });

        res.json({
            success: true,
            message: 'Bookmark removed successfully',
        });
    } catch (error) {
        console.error('Remove bookmark error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
