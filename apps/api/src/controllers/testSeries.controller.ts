import type { Request, Response } from 'express';
import { TestSeries, Quiz } from '../models/index.js';
import { parseQuizExcel } from '../services/excel.service.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// @desc    Get all test series groups
// @route   GET /api/tests/series
// @access  Public
export const getTestSeriesList = async (req: Request, res: Response): Promise<void> => {
    try {
        const { includeUnpublished } = req.query;

        const filter: Record<string, unknown> = {};
        if (!includeUnpublished) {
            filter.isPublished = true;
        }

        const series = await TestSeries.find(filter)
            .sort({ createdAt: -1 })
            .lean();

        res.json({ success: true, data: series });
    } catch (error) {
        console.error('Get test series list error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get single test series group by ID (populates quizzes)
// @route   GET /api/tests/series/:id
// @access  Public
export const getTestSeriesById = async (req: Request, res: Response): Promise<void> => {
    try {
        const series = await TestSeries.findById(req.params.id)
            .populate({
                path: 'tests.quizId',
                select: 'title questions tags date',
            })
            .lean();

        if (!series) {
            res.status(404).json({ success: false, message: 'Test series not found' });
            return;
        }

        res.json({ success: true, data: series });
    } catch (error) {
        console.error('Get test series by ID error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create test series group
// @route   POST /api/tests/series
// @access  Private/Admin
export const createTestSeries = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, brochureUrl, brochureKey, introVideoUrl, tests, isPublished } = req.body;
        const user = (req as Request & { user: { _id: string } }).user;

        if (!title?.trim()) {
            res.status(400).json({ success: false, message: 'Title is required' });
            return;
        }

        // Standardize dates in test items if present
        const formattedTests = (tests || []).map((t: any) => ({
            ...t,
            date: t.date ? new Date(t.date) : new Date(),
            quizId: t.quizId || undefined,
            isLocked: !!t.isLocked,
        }));

        const series = await TestSeries.create({
            title: title.trim(),
            description: description?.trim() || undefined,
            brochureUrl,
            brochureKey,
            introVideoUrl: introVideoUrl?.trim() || undefined,
            tests: formattedTests,
            isPublished: isPublished !== undefined ? isPublished : false,
            createdBy: user._id,
        });

        res.status(201).json({ success: true, data: series });
    } catch (error) {
        console.error('Create test series error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update test series group
// @route   PUT /api/tests/series/:id
// @access  Private/Admin
export const updateTestSeries = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, brochureUrl, brochureKey, introVideoUrl, tests, isPublished } = req.body;

        const series = await TestSeries.findById(req.params.id);
        if (!series) {
            res.status(404).json({ success: false, message: 'Test series not found' });
            return;
        }

        if (title !== undefined) series.title = title.trim();
        if (description !== undefined) series.description = description?.trim() || undefined;
        if (brochureUrl !== undefined) series.brochureUrl = brochureUrl;
        if (brochureKey !== undefined) series.brochureKey = brochureKey;
        if (introVideoUrl !== undefined) series.introVideoUrl = introVideoUrl?.trim() || undefined;
        if (isPublished !== undefined) series.isPublished = isPublished;

        if (tests !== undefined) {
            // Update the tests array. Standardize dates.
            series.tests = tests.map((t: any) => ({
                ...t,
                date: t.date ? new Date(t.date) : new Date(),
                quizId: t.quizId || undefined,
                isLocked: !!t.isLocked,
            }));
        }

        await series.save();

        res.json({ success: true, data: series });
    } catch (error) {
        console.error('Update test series error:', error);
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

// @desc    Delete test series group and its files
// @route   DELETE /api/tests/series/:id
// @access  Private/Admin
export const deleteTestSeries = async (req: Request, res: Response): Promise<void> => {
    try {
        const series = await TestSeries.findById(req.params.id);
        if (!series) {
            res.status(404).json({ success: false, message: 'Test series not found' });
            return;
        }

        // Delete brochure PDF if exists
        deleteLocalFile(series.brochureKey);

        // Delete all associated Quiz documents
        if (series.tests && series.tests.length > 0) {
            for (const t of series.tests) {
                if (t.quizId) {
                    try {
                        await Quiz.findByIdAndDelete(t.quizId);
                    } catch (e) {
                        console.error('Failed to delete quiz:', t.quizId, e);
                    }
                }
            }
        }

        await series.deleteOne();

        res.json({ success: true, message: 'Test series and all associated Quiz papers deleted' });
    } catch (error) {
        console.error('Delete test series error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Upload test brochure (PDF)
// @route   POST /api/tests/series/upload
// @access  Private/Admin
export const uploadPaper = async (req: Request, res: Response): Promise<void> => {
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
        console.error('Upload test brochure error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Import exam questions from Excel file (Current Affairs format) to create a Quiz
// @route   POST /api/tests/series/import-excel
// @access  Private/Admin
export const importTestExcel = async (req: Request, res: Response): Promise<void> => {
    try {
        const file = req.file;
        const { title, date } = req.body;

        if (!file) {
            res.status(400).json({ success: false, message: 'Please upload an Excel file' });
            return;
        }

        if (!title || !date) {
            res.status(400).json({ success: false, message: 'Please provide title and date' });
            return;
        }

        // Parse Excel file
        const parseResult = parseQuizExcel(file.buffer);

        if (parseResult.questions.length === 0) {
            res.status(400).json({
                success: false,
                message: 'No valid questions found in Excel file',
                errors: parseResult.errors,
            });
            return;
        }

        const user = (req as Request & { user: { _id: string } }).user;

        // Create quiz with parsed questions
        const quiz = await Quiz.create({
            title,
            date: new Date(date),
            questions: parseResult.questions,
            tags: ['prelims-test-series'],
            createdBy: user._id,
        });

        res.status(201).json({
            success: true,
            data: quiz,
            message: `Successfully imported ${parseResult.questions.length} questions`,
        });
    } catch (error) {
        console.error('Import test excel error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
