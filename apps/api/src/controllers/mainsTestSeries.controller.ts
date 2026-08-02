import type { Request, Response } from 'express';
import { MainsTestSeries, getNextSequence } from '../models/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Helper: backfill uniqueId for existing docs missing it
async function backfillUniqueId(series: any): Promise<void> {
    if (!series.uniqueId) {
        const seq = await getNextSequence('mains_test_series');
        series.uniqueId = `MTS-${seq}`;
        await MainsTestSeries.updateOne({ _id: series._id }, { $set: { uniqueId: series.uniqueId } });
    }
}

// @desc    Get all Mains Test Series groups
// @route   GET /api/mts/series
// @access  Public
export const getMainsTestSeriesList = async (req: Request, res: Response): Promise<void> => {
    try {
        const { includeUnpublished } = req.query;

        const filter: Record<string, unknown> = {};
        if (!includeUnpublished) {
            filter.isPublished = true;
        }

        const series = await MainsTestSeries.find(filter)
            .sort({ createdAt: -1 })
            .lean();

        // Backfill uniqueId for any existing docs missing it
        for (const s of series) {
            await backfillUniqueId(s);
        }

        res.json({ success: true, data: series });
    } catch (error) {
        console.error('Get mains test series list error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get single Mains Test Series group by ID
// @route   GET /api/mts/series/:id
// @access  Public
export const getMainsTestSeriesById = async (req: Request, res: Response): Promise<void> => {
    try {
        const series = await MainsTestSeries.findById(req.params.id).lean();

        if (!series) {
            res.status(404).json({ success: false, message: 'Mains test series not found' });
            return;
        }

        // Backfill uniqueId if missing
        await backfillUniqueId(series);

        res.json({ success: true, data: series });
    } catch (error) {
        console.error('Get mains test series by ID error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create Mains Test Series group
// @route   POST /api/mts/series
// @access  Private/Admin
export const createMainsTestSeries = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, brochureUrl, brochureKey, introVideoUrl, tests, sectionalCount, fullLengthCount, isPublished } = req.body;
        const user = (req as Request & { user: { _id: string } }).user;

        if (!title?.trim()) {
            res.status(400).json({ success: false, message: 'Title is required' });
            return;
        }

        // Standardize dates in test items
        const formattedTests = (tests || []).map((t: any) => ({
            ...t,
            date: t.date ? new Date(t.date) : new Date(),
            isLocked: !!t.isLocked,
        }));

        const series = await MainsTestSeries.create({
            title: title.trim(),
            description: description?.trim() || undefined,
            brochureUrl,
            brochureKey,
            introVideoUrl: introVideoUrl?.trim() || undefined,
            tests: formattedTests,
            sectionalCount: sectionalCount || 0,
            fullLengthCount: fullLengthCount || 0,
            isPublished: isPublished !== undefined ? isPublished : false,
            createdBy: user._id,
        });

        res.status(201).json({ success: true, data: series });
    } catch (error) {
        console.error('Create mains test series error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update Mains Test Series group
// @route   PUT /api/mts/series/:id
// @access  Private/Admin
export const updateMainsTestSeries = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, brochureUrl, brochureKey, introVideoUrl, tests, sectionalCount, fullLengthCount, isPublished } = req.body;

        const series = await MainsTestSeries.findById(req.params.id);
        if (!series) {
            res.status(404).json({ success: false, message: 'Mains test series not found' });
            return;
        }

        if (title !== undefined) series.title = title.trim();
        if (description !== undefined) series.description = description?.trim() || undefined;
        if (brochureUrl !== undefined) series.brochureUrl = brochureUrl;
        if (brochureKey !== undefined) series.brochureKey = brochureKey;
        if (introVideoUrl !== undefined) series.introVideoUrl = introVideoUrl?.trim() || undefined;
        if (sectionalCount !== undefined) series.sectionalCount = sectionalCount;
        if (fullLengthCount !== undefined) series.fullLengthCount = fullLengthCount;
        if (isPublished !== undefined) series.isPublished = isPublished;

        if (tests !== undefined) {
            series.tests = tests.map((t: any) => ({
                ...t,
                date: t.date ? new Date(t.date) : new Date(),
                isLocked: !!t.isLocked,
            }));
        }

        await series.save();

        res.json({ success: true, data: series });
    } catch (error) {
        console.error('Update mains test series error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Helper function to delete a local file
const deleteLocalFile = (key?: string) => {
    if (!key) return;
    const filePath = path.join(UPLOADS_DIR, key);
    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
        } catch (e) {
            console.error('Failed to delete file:', filePath, e);
        }
    }
};

// @desc    Delete Mains Test Series group and its files
// @route   DELETE /api/mts/series/:id
// @access  Private/Admin
export const deleteMainsTestSeries = async (req: Request, res: Response): Promise<void> => {
    try {
        const series = await MainsTestSeries.findById(req.params.id);
        if (!series) {
            res.status(404).json({ success: false, message: 'Mains test series not found' });
            return;
        }

        // Delete brochure PDF if exists
        deleteLocalFile(series.brochureKey);

        // Delete test paper files
        if (series.tests && series.tests.length > 0) {
            for (const t of series.tests) {
                deleteLocalFile(t.questionPaperKey);
                deleteLocalFile(t.solutionPaperKey);
            }
        }

        await series.deleteOne();

        res.json({ success: true, message: 'Mains test series and all associated files deleted' });
    } catch (error) {
        console.error('Delete mains test series error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Upload PDF (question paper, solution, brochure)
// @route   POST /api/mts/series/upload
// @access  Private/Admin
export const uploadMtsPaper = async (req: Request, res: Response): Promise<void> => {
    try {
        const file = req.file;

        if (!file) {
            res.status(400).json({ success: false, message: 'Please upload a PDF file' });
            return;
        }

        res.json({
            success: true,
            data: {
                url: `/uploads/${file.filename}`,
                key: file.filename,
            },
        });
    } catch (error) {
        console.error('Upload MTS paper error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
