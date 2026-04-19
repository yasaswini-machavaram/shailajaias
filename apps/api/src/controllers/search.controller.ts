import type { Request, Response } from 'express';
import { Article, Quiz, BurningIssue } from '../models/index.js';

// @desc    Unified search across articles and quizzes
// @route   GET /api/search
// @access  Public
export const searchAll = async (req: Request, res: Response): Promise<void> => {
    try {
        const { q, type, year, month, page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const articleQuery: any = {};
        const quizQuery: any = {};

        if (q) {
            articleQuery.$text = { $search: q as string };
            quizQuery.$text = { $search: q as string };
        }

        if (year || month) {
            const y = year ? Number(year) : new Date().getFullYear();
            if (month) {
                const m = Number(month);
                const start = new Date(y, m - 1, 1);
                const end = new Date(y, m, 1);
                articleQuery.date = { $gte: start, $lt: end };
                quizQuery.date = { $gte: start, $lt: end };
            } else {
                const start = new Date(y, 0, 1);
                const end = new Date(y + 1, 0, 1);
                articleQuery.date = { $gte: start, $lt: end };
                quizQuery.date = { $gte: start, $lt: end };
            }
        }

        let results: any[] = [];
        let total = 0;

        if (type === 'quiz') {
            total = await Quiz.countDocuments(quizQuery);
            results = await Quiz.find(quizQuery)
                .sort({ date: -1 })
                .skip(skip)
                .limit(Number(limit));
            results = results.map(r => ({ ...r.toObject(), type: 'quiz' }));
        } else if (type === 'burning_issue') {
            // Burning issues are in a separate collection
            const biQuery: any = {};
            if (q) biQuery.topic = { $regex: q as string, $options: 'i' };
            if (articleQuery.date) biQuery.date = articleQuery.date;
            total = await BurningIssue.countDocuments(biQuery);
            results = await BurningIssue.find(biQuery)
                .sort({ date: -1 })
                .skip(skip)
                .limit(Number(limit));
            results = results.map(r => ({
                ...r.toObject(),
                type: 'burning_issue_gallery',
                title: (r as any).topic,
                imageUrl: (r as any).images?.[0]?.url,
            }));
        } else if (type && type !== 'all') {
            articleQuery.type = type;
            total = await Article.countDocuments(articleQuery);
            results = await Article.find(articleQuery)
                .sort({ date: -1 })
                .skip(skip)
                .limit(Number(limit));
        } else {
            // "All" search
            // This is complex with pagination across collections
            // For now, let's fetch from both and merge, then slice
            // Note: This is not ideal for large datasets but works for now
            const [articles, quizzes, stories] = await Promise.all([
                Article.find(articleQuery).sort({ date: -1 }).limit(Number(limit) * Number(page)),
                Quiz.find(quizQuery).sort({ date: -1 }).limit(Number(limit) * Number(page)),
                BurningIssue.find({ 
                    $or: [
                        { topic: { $regex: q as string, $options: 'i' } }
                    ]
                }).sort({ date: -1 }).limit(Number(limit) * Number(page))
            ]);

            const merged = [
                ...articles.map(a => a.toObject()),
                ...quizzes.map(q => ({ ...q.toObject(), type: 'quiz' })),
                ...stories.map(s => ({ 
                    ...s.toObject(), 
                    type: 'burning_issue_gallery',
                    title: (s as any).topic, // Map topic to title for consistent display
                    imageUrl: (s as any).images?.[0]?.url 
                }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            total = (await Article.countDocuments(articleQuery)) + 
                    (await Quiz.countDocuments(quizQuery)) +
                    (await BurningIssue.countDocuments({ topic: { $regex: q as string, $options: 'i' } }));
            results = merged.slice(skip, skip + Number(limit));
        }

        res.json({
            success: true,
            data: results,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
