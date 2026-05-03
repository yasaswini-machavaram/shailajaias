import type { Request, Response } from 'express';
import { Article, Quiz, BurningIssue } from '../models/index.js';

// @desc    Unified search across articles and quizzes
// @route   GET /api/search
// @access  Public
export const searchAll = async (req: Request, res: Response): Promise<void> => {
    try {
        const { q, type, year, month, page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const searchTerm = (q as string || '').trim();

        // Build date filter if year/month provided (UTC to avoid timezone drift)
        const dateFilter: Record<string, unknown> = {};
        if (year || month) {
            const y = year ? Number(year) : new Date().getFullYear();
            if (month) {
                const m = Number(month);
                const start = new Date(Date.UTC(y, m - 1, 1));
                const end = new Date(Date.UTC(y, m, 1));
                dateFilter.date = { $gte: start, $lt: end };
            } else {
                const start = new Date(Date.UTC(y, 0, 1));
                const end = new Date(Date.UTC(y + 1, 0, 1));
                dateFilter.date = { $gte: start, $lt: end };
            }
        }

        /**
         * Build search filter — searches ONLY title and tags, not content.
         * Uses regex for precise matching (especially for tag clicks).
         */
        const buildArticleQuery = () => {
            const q: Record<string, unknown> = { ...dateFilter };
            if (searchTerm) {
                q.$or = [
                    { title: { $regex: searchTerm, $options: 'i' } },
                    { tags: { $regex: searchTerm, $options: 'i' } },
                ];
            }
            return q;
        };

        const buildQuizQuery = () => {
            const q: Record<string, unknown> = { ...dateFilter };
            if (searchTerm) {
                q.$or = [
                    { title: { $regex: searchTerm, $options: 'i' } },
                    { tags: { $regex: searchTerm, $options: 'i' } },
                ];
            }
            return q;
        };

        const buildBurningIssueQuery = () => {
            const q: Record<string, unknown> = { ...dateFilter };
            if (searchTerm) {
                q.topic = { $regex: searchTerm, $options: 'i' };
            }
            return q;
        };

        let results: any[] = [];
        let total = 0;

        if (type === 'quiz') {
            const quizQuery = buildQuizQuery();
            total = await Quiz.countDocuments(quizQuery);
            results = await Quiz.find(quizQuery)
                .sort({ date: -1 })
                .skip(skip)
                .limit(Number(limit));
            results = results.map(r => ({ ...r.toObject(), type: 'quiz' }));
        } else if (type === 'burning_issue') {
            const biQuery = buildBurningIssueQuery();
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
            // Specific article type (daily_prelims, mains, etc.)
            const articleQuery = { ...buildArticleQuery(), type };
            total = await Article.countDocuments(articleQuery);
            results = await Article.find(articleQuery)
                .sort({ date: -1 })
                .skip(skip)
                .limit(Number(limit));
        } else {
            // "All" — merge articles, quizzes, and burning issues
            const articleQuery = buildArticleQuery();
            const quizQuery = buildQuizQuery();
            const biQuery = buildBurningIssueQuery();

            const [articles, quizzes, burningIssues] = await Promise.all([
                Article.find(articleQuery).sort({ date: -1 }).limit(Number(limit) * Number(page)),
                Quiz.find(quizQuery).sort({ date: -1 }).limit(Number(limit) * Number(page)),
                BurningIssue.find(biQuery).sort({ date: -1 }).limit(Number(limit) * Number(page)),
            ]);

            const merged = [
                ...articles.map(a => a.toObject()),
                ...quizzes.map(q => ({ ...q.toObject(), type: 'quiz' })),
                ...burningIssues.map(s => ({
                    ...s.toObject(),
                    type: 'burning_issue_gallery',
                    title: (s as any).topic,
                    imageUrl: (s as any).images?.[0]?.url,
                }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            const [artCount, quizCount, biCount] = await Promise.all([
                Article.countDocuments(articleQuery),
                Quiz.countDocuments(quizQuery),
                BurningIssue.countDocuments(biQuery),
            ]);

            total = artCount + quizCount + biCount;
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
