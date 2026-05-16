import type { Request, Response } from 'express';
import { Article, Quiz } from '../models/index.js';
import type { ArticleType } from '../models/index.js';
import { parseArticleExcel } from '../services/article-excel.service.js';
import { parseMainsExcel } from '../services/mains-excel.service.js';
import { invalidateSearchIndexCache } from './search-index.controller.js';

// @desc    Get all articles with filters
// @route   GET /api/articles
// @access  Public
export const getArticles = async (req: Request, res: Response): Promise<void> => {
    try {
        const { type, tags, page = 1, limit = 10, search, year, month } = req.query;

        const query: Record<string, unknown> = {};

        if (type) {
            query.type = type;
        }

        if (tags) {
            query.tags = { $in: (tags as string).split(',') };
        }

        if (search) {
            const term = search as string;
            query.$or = [
                { title: { $regex: term, $options: 'i' } },
                { tags: { $regex: term, $options: 'i' } },
            ];
        }

        // Year / month date range filter (UTC to avoid timezone drift)
        if (year || month) {
            const y = year ? Number(year) : new Date().getFullYear();
            if (month) {
                const m = Number(month); // 1-based
                const start = new Date(Date.UTC(y, m - 1, 1));
                const end = new Date(Date.UTC(y, m, 1));
                query.date = { $gte: start, $lt: end };
            } else {
                const start = new Date(Date.UTC(y, 0, 1));
                const end = new Date(Date.UTC(y + 1, 0, 1));
                query.date = { $gte: start, $lt: end };
            }
        }

        // Single-date exact filter (for admin date picker)
        const { date } = req.query;
        if (date && !year && !month) {
            const dateStr = date as string; // YYYY-MM-DD
            const [dy, dm, dd] = dateStr.split('-').map(Number);
            const startUtc = new Date(Date.UTC(dy, dm - 1, dd));
            const endUtc = new Date(Date.UTC(dy, dm - 1, dd + 1));
            query.date = { $gte: startUtc, $lt: endUtc };
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
            // Single date — parse as UTC to avoid timezone drift
            // "2026-04-18" → UTC midnight April 18 to UTC midnight April 19
            const dateStr = date as string; // YYYY-MM-DD
            const [y, m, d] = dateStr.split('-').map(Number);
            const startUtc = new Date(Date.UTC(y, m - 1, d));
            const endUtc = new Date(Date.UTC(y, m - 1, d + 1));
            query.date = { $gte: startUtc, $lt: endUtc };
        } else if (startDate && endDate) {
            // Date range — also use UTC
            const [sy, sm, sd] = (startDate as string).split('-').map(Number);
            const [ey, em, ed] = (endDate as string).split('-').map(Number);
            query.date = {
                $gte: new Date(Date.UTC(sy, sm - 1, sd)),
                $lte: new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59, 999))
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

        // Parse date as UTC midnight to avoid timezone drift
        const dateStr = date as string; // YYYY-MM-DD from frontend
        const [dy, dm, dd] = dateStr.split('-').map(Number);
        const articleDate = new Date(Date.UTC(dy, dm - 1, dd));

        const article = await Article.create({
            type,
            title,
            date: articleDate,
            tags: tags || [],
            content,
            keywords: keywords || [],
            imageUrl,
            source,
            createdBy: user._id,
        });

        // Invalidate search index cache so new article appears in search
        invalidateSearchIndexCache();

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
        if (date) {
            const dateStr = date as string;
            const [dy, dm, dd] = dateStr.split('-').map(Number);
            article.date = new Date(Date.UTC(dy, dm - 1, dd)) as any;
        }
        if (tags) article.tags = tags;
        if (content) article.content = content;
        if (keywords) article.keywords = keywords;
        if (imageUrl !== undefined) article.imageUrl = imageUrl;
        if (source !== undefined) article.source = source;

        await article.save();

        // Invalidate search index cache so updated article reflects in search
        invalidateSearchIndexCache();

        res.json({ success: true, data: article });
    } catch (error) {
        console.error('Update article error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get distinct tags (optionally filtered by type)
// @route   GET /api/articles/tags
// @access  Public
export const getDistinctTags = async (req: Request, res: Response): Promise<void> => {
    try {
        const { type } = req.query;
        let tags: any[] = [];

        if (type === 'quiz') {
            tags = await Quiz.distinct('tags');
        } else {
            const filter: Record<string, unknown> = {};
            if (type) filter.type = type;
            tags = await Article.distinct('tags', filter);
        }

        const sorted = (tags as string[]).filter(Boolean).sort();
        res.json({ success: true, data: sorted });
    } catch (error) {
        console.error('Get distinct tags error:', error);
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

        // Invalidate search index cache so deleted article disappears from search
        invalidateSearchIndexCache();

        res.json({ success: true, message: 'Article deleted' });
    } catch (error) {
        console.error('Delete article error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get adjacent dates with articles
// @route   GET /api/articles/adjacent-dates
// @access  Public
export const getAdjacentDates = async (req: Request, res: Response): Promise<void> => {
    try {
        const { date, type } = req.query;
        if (!date || !type) {
            res.status(400).json({ success: false, message: 'Date and type are required' });
            return;
        }

        const dateStr = date as string; // YYYY-MM-DD
        const [y, m, d] = dateStr.split('-').map(Number);
        const targetDate = new Date(Date.UTC(y, m - 1, d));
        const nextDay = new Date(Date.UTC(y, m - 1, d + 1));

        // Find previous date (less than targetDate)
        const prevArticle = await Article.findOne({
            type: type as string,
            date: { $lt: targetDate }
        }).sort({ date: -1 });

        // Find next date (greater than or equal to nextDay)
        const nextArticle = await Article.findOne({
            type: type as string,
            date: { $gte: nextDay }
        }).sort({ date: 1 });

        res.json({
            success: true,
            data: {
                previous: prevArticle ? prevArticle.date : null,
                next: nextArticle ? nextArticle.date : null
            }
        });
    } catch (error) {
        console.error('Get adjacent dates error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Import articles from Excel file
// @route   POST /api/articles/import-excel
// @access  Private/Admin
export const importArticlesFromExcel = async (req: Request, res: Response): Promise<void> => {
    try {
        const file = req.file;
        if (!file) {
            res.status(400).json({ success: false, message: 'Please upload an Excel file' });
            return;
        }

        // Parse Excel file
        const parseResult = parseArticleExcel(file.buffer);

        if (parseResult.articles.length === 0) {
            res.status(400).json({
                success: false,
                message: 'No valid articles found in Excel file',
                errors: parseResult.errors,
                skipped: parseResult.skipped,
            });
            return;
        }

        const user = (req as Request & { user: { _id: string } }).user;

        // Bulk insert articles as daily_prelims
        const articlesToInsert = parseResult.articles.map((article) => ({
            ...article,
            type: 'daily_prelims' as const,
            createdBy: user._id,
        }));

        const inserted = await Article.insertMany(articlesToInsert);

        // Invalidate search index cache so imported articles appear in search
        invalidateSearchIndexCache();

        res.status(201).json({
            success: true,
            data: {
                imported: inserted.length,
                skipped: parseResult.skipped,
            },
            message: `Successfully imported ${inserted.length} articles`,
            warnings: parseResult.errors.length > 0 ? parseResult.errors : undefined,
        });
    } catch (error) {
        console.error('Import articles error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Import mains articles from Excel file
// @route   POST /api/articles/import-mains-excel
// @access  Private/Admin
export const importMainsFromExcel = async (req: Request, res: Response): Promise<void> => {
    try {
        const file = req.file;
        if (!file) {
            res.status(400).json({ success: false, message: 'Please upload an Excel file' });
            return;
        }

        // Parse Excel file using Mains-specific parser
        const parseResult = parseMainsExcel(file.buffer);

        if (parseResult.articles.length === 0) {
            res.status(400).json({
                success: false,
                message: 'No valid mains articles found in Excel file',
                errors: parseResult.errors,
                skipped: parseResult.skipped,
            });
            return;
        }

        const user = (req as Request & { user: { _id: string } }).user;

        // Bulk insert articles as mains type with structured fields
        const articlesToInsert = parseResult.articles.map((article) => ({
            ...article,
            type: 'mains' as const,
            createdBy: user._id,
        }));

        const inserted = await Article.insertMany(articlesToInsert);

        // Invalidate search index cache so imported articles appear in search
        invalidateSearchIndexCache();

        res.status(201).json({
            success: true,
            data: {
                imported: inserted.length,
                skipped: parseResult.skipped,
            },
            message: `Successfully imported ${inserted.length} mains articles`,
            warnings: parseResult.errors.length > 0 ? parseResult.errors : undefined,
        });
    } catch (error) {
        console.error('Import mains articles error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
