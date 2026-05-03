import type { Request, Response } from 'express';
import crypto from 'crypto';
import { Article, Quiz, BurningIssue } from '../models/index.js';

/**
 * In-memory server-side cache for the search index.
 * Avoids hitting MongoDB on every page load from different users.
 * TTL: 5 minutes. Invalidated on article CRUD operations.
 */
interface CachedIndex {
    data: unknown[];
    etag: string;
    expiry: number;
}

let cachedIndex: CachedIndex | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Call this from article/quiz/burningIssue CRUD controllers to bust the cache */
export function invalidateSearchIndexCache(): void {
    cachedIndex = null;
}

/**
 * @desc    Get lightweight search index for client-side Trie + Inverted Index
 * @route   GET /api/search/index
 * @access  Public
 *
 * Returns only the fields needed for searching:
 *   { _id, title, type, date, tags }
 *
 * Supports ETag / If-None-Match for zero-bandwidth cache validation.
 */
export const getSearchIndex = async (req: Request, res: Response): Promise<void> => {
    try {
        // Check if we have a valid server-side cache
        if (cachedIndex && Date.now() < cachedIndex.expiry) {
            // Check if client already has this version (ETag match)
            const clientEtag = req.headers['if-none-match'];
            if (clientEtag === cachedIndex.etag) {
                res.status(304).end();
                return;
            }

            res.setHeader('ETag', cachedIndex.etag);
            res.setHeader('Cache-Control', 'private, max-age=300');
            res.json({
                success: true,
                data: cachedIndex.data,
                meta: {
                    total: cachedIndex.data.length,
                    generatedAt: new Date().toISOString(),
                    cached: true,
                },
            });
            return;
        }

        // Fetch lightweight data from MongoDB (projection — no content field)
        const [articles, quizzes, burningIssues] = await Promise.all([
            Article.find({})
                .select('_id title type date tags')
                .sort({ date: -1 })
                .lean(),
            Quiz.find({})
                .select('_id title date tags')
                .sort({ date: -1 })
                .lean(),
            BurningIssue.find({})
                .select('_id topic date')
                .sort({ date: -1 })
                .lean(),
        ]);

        // Normalize into a unified shape
        const indexData = [
            ...articles.map((a: any) => ({
                _id: a._id.toString(),
                title: a.title,
                type: a.type,
                date: a.date,
                tags: a.tags || [],
            })),
            ...quizzes.map((q: any) => ({
                _id: q._id.toString(),
                title: q.title,
                type: 'quiz',
                date: q.date,
                tags: q.tags || [],
            })),
            ...burningIssues.map((bi: any) => ({
                _id: bi._id.toString(),
                title: bi.topic,
                type: 'burning_issue_gallery',
                date: bi.date,
                tags: [] as string[],
            })),
        ];

        // Generate ETag from data content
        const hash = crypto
            .createHash('md5')
            .update(JSON.stringify(indexData))
            .digest('hex');
        const etag = `"${hash}"`;

        // Store in server-side cache
        cachedIndex = {
            data: indexData,
            etag,
            expiry: Date.now() + CACHE_TTL_MS,
        };

        // Check if client already has this version
        const clientEtag = req.headers['if-none-match'];
        if (clientEtag === etag) {
            res.status(304).end();
            return;
        }

        res.setHeader('ETag', etag);
        res.setHeader('Cache-Control', 'private, max-age=300');
        res.json({
            success: true,
            data: indexData,
            meta: {
                total: indexData.length,
                generatedAt: new Date().toISOString(),
                cached: false,
            },
        });
    } catch (error) {
        console.error('Search index error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
