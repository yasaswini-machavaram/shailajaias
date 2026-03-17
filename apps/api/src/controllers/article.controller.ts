import type { Request, Response } from 'express';
import { Article } from '../models/index.js';
import type { ArticleType } from '../models/index.js';

// @desc    Get all articles with filters
// @route   GET /api/articles
// @access  Public
export const getArticles = async (req: Request, res: Response): Promise<void> => {
    try {
        const { type, tags, page = 1, limit = 10, search } = req.query;

        const query: Record<string, unknown> = {};

        if (type) {
            query.type = type;
        }

        if (tags) {
            query.tags = { $in: (tags as string).split(',') };
        }

        if (search) {
            query.$text = { $search: search as string };
        }

        const total = await Article.countDocuments(query);
        const articles = await Article.find(query)
            .sort({ date: -1, createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .populate('createdBy', 'name');

        res.json({
            success: true,
            data: articles,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error) {
        console.error('Get articles error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get articles by date range
// @route   GET /api/articles/by-date
// @access  Public
export const getArticlesByDate = async (req: Request, res: Response): Promise<void> => {
    try {
        const { date, startDate, endDate, type } = req.query;

        const query: Record<string, unknown> = {};

        if (date) {
            // Single date
            const targetDate = new Date(date as string);
            const nextDate = new Date(targetDate);
            nextDate.setDate(nextDate.getDate() + 1);
            query.date = { $gte: targetDate, $lt: nextDate };
        } else if (startDate && endDate) {
            // Date range
            query.date = {
                $gte: new Date(startDate as string),
                $lte: new Date(endDate as string)
            };
        }

        if (type) {
            query.type = type;
        }

        const articles = await Article.find(query)
            .sort({ date: -1 })
            .populate('createdBy', 'name');

        res.json({ success: true, data: articles });
    } catch (error) {
        console.error('Get articles by date error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get articles by type
// @route   GET /api/articles/by-type/:type
// @access  Public
export const getArticlesByType = async (req: Request, res: Response): Promise<void> => {
    try {
        const { type } = req.params;
        const { page = 1, limit = 10 } = req.query;

        if (!['daily_prelims', 'mains', 'burning_issue'].includes(type)) {
            res.status(400).json({ success: false, message: 'Invalid article type' });
            return;
        }

        const total = await Article.countDocuments({ type });
        const articles = await Article.find({ type: type as ArticleType })
            .sort({ date: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .populate('createdBy', 'name');

        res.json({
            success: true,
            data: articles,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error) {
        console.error('Get articles by type error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get single article
// @route   GET /api/articles/:id
// @access  Public
export const getArticle = async (req: Request, res: Response): Promise<void> => {
    try {
        const article = await Article.findById(req.params.id)
            .populate('createdBy', 'name')
            .populate('keywords.linkedArticleId', 'title type');

        if (!article) {
            res.status(404).json({ success: false, message: 'Article not found' });
            return;
        }

        res.json({ success: true, data: article });
    } catch (error) {
        console.error('Get article error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create article
// @route   POST /api/articles
// @access  Private/Admin
export const createArticle = async (req: Request, res: Response): Promise<void> => {
    try {
        const { type, title, date, tags, content, keywords, imageUrl, source } = req.body;
        const user = (req as Request & { user: { _id: string } }).user;

        const article = await Article.create({
            type,
            title,
            date: new Date(date),
            tags: tags || [],
            content,
            keywords: keywords || [],
            imageUrl,
            source,
            createdBy: user._id,
        });

        res.status(201).json({ success: true, data: article });
    } catch (error) {
        console.error('Create article error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update article
// @route   PUT /api/articles/:id
// @access  Private/Admin
export const updateArticle = async (req: Request, res: Response): Promise<void> => {
    try {
        const { type, title, date, tags, content, keywords, imageUrl, source } = req.body;

        const article = await Article.findById(req.params.id);
        if (!article) {
            res.status(404).json({ success: false, message: 'Article not found' });
            return;
        }

        // Update fields
        if (type) article.type = type;
        if (title) article.title = title;
        if (date) article.date = new Date(date);
        if (tags) article.tags = tags;
        if (content) article.content = content;
        if (keywords) article.keywords = keywords;
        if (imageUrl !== undefined) article.imageUrl = imageUrl;
        if (source !== undefined) article.source = source;

        await article.save();

        res.json({ success: true, data: article });
    } catch (error) {
        console.error('Update article error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete article
// @route   DELETE /api/articles/:id
// @access  Private/Admin
export const deleteArticle = async (req: Request, res: Response): Promise<void> => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) {
            res.status(404).json({ success: false, message: 'Article not found' });
            return;
        }

        await article.deleteOne();

        res.json({ success: true, message: 'Article deleted' });
    } catch (error) {
        console.error('Delete article error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
