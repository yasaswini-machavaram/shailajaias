import type { Request, Response } from 'express';
import { MainsPracticeTest, MainsPracticeTestConfig } from '../models/index.js';
import { parseMptExcel } from '../services/mpt-excel.service.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// @desc    Get all Mains Practice Tests
// @route   GET /api/mpt
// @access  Public
export const getMainsPracticeTestList = async (req: Request, res: Response): Promise<void> => {
    try {
        const { includeUnpublished, subjectCategory, search } = req.query;

        const filter: any = {};
        if (!includeUnpublished) {
            filter.isPublished = true;
        }

        if (subjectCategory && subjectCategory !== 'All') {
            filter.subjectCategory = subjectCategory;
        }

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { topicsSummary: { $regex: search, $options: 'i' } },
            ];
        }

        const tests = await MainsPracticeTest.find(filter)
            .sort({ createdAt: -1 })
            .lean();

        res.json({ success: true, data: tests });
    } catch (error) {
        console.error('Get Mains Practice Tests error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get single Mains Practice Test by ID
// @route   GET /api/mpt/:id
// @access  Public
export const getMainsPracticeTestById = async (req: Request, res: Response): Promise<void> => {
    try {
        const test = await MainsPracticeTest.findById(req.params.id).lean();

        if (!test) {
            res.status(404).json({ success: false, message: 'Mains Practice Test not found' });
            return;
        }

        res.json({ success: true, data: test });
    } catch (error) {
        console.error('Get Mains Practice Test by ID error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create Mains Practice Test
// @route   POST /api/mpt
// @access  Private/Admin
export const createMainsPracticeTest = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, subjectCategory, topicsSummary, guidelinesUrl, guidelinesKey, introVideoUrl, questions, isPublished } = req.body;
        const user = (req as any).user;

        if (!title?.trim()) {
            res.status(400).json({ success: false, message: 'Title is required' });
            return;
        }

        if (!subjectCategory?.trim()) {
            res.status(400).json({ success: false, message: 'Subject category is required' });
            return;
        }

        const test = await MainsPracticeTest.create({
            title: title.trim(),
            subjectCategory: subjectCategory.trim(),
            topicsSummary: topicsSummary?.trim() || undefined,
            guidelinesUrl,
            guidelinesKey,
            introVideoUrl: introVideoUrl?.trim() || undefined,
            questions: questions || [],
            isPublished: isPublished !== undefined ? isPublished : false,
            createdBy: user._id,
        });

        res.status(201).json({ success: true, data: test });
    } catch (error) {
        console.error('Create Mains Practice Test error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update Mains Practice Test
// @route   PUT /api/mpt/:id
// @access  Private/Admin
export const updateMainsPracticeTest = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, subjectCategory, topicsSummary, guidelinesUrl, guidelinesKey, introVideoUrl, questions, isPublished } = req.body;

        const test = await MainsPracticeTest.findById(req.params.id);
        if (!test) {
            res.status(404).json({ success: false, message: 'Mains Practice Test not found' });
            return;
        }

        if (title !== undefined) test.title = title.trim();
        if (subjectCategory !== undefined) test.subjectCategory = subjectCategory.trim();
        if (topicsSummary !== undefined) test.topicsSummary = topicsSummary?.trim() || undefined;
        if (guidelinesUrl !== undefined) test.guidelinesUrl = guidelinesUrl;
        if (guidelinesKey !== undefined) test.guidelinesKey = guidelinesKey;
        if (introVideoUrl !== undefined) test.introVideoUrl = introVideoUrl?.trim() || undefined;
        if (questions !== undefined) test.questions = questions;
        if (isPublished !== undefined) test.isPublished = isPublished;

        await test.save();

        res.json({ success: true, data: test });
    } catch (error) {
        console.error('Update Mains Practice Test error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete Mains Practice Test
// @route   DELETE /api/mpt/:id
// @access  Private/Admin
export const deleteMainsPracticeTest = async (req: Request, res: Response): Promise<void> => {
    try {
        const test = await MainsPracticeTest.findById(req.params.id);
        if (!test) {
            res.status(404).json({ success: false, message: 'Mains Practice Test not found' });
            return;
        }

        // Clean up guidelines file if exists
        if (test.guidelinesKey) {
            const filePath = path.join(UPLOADS_DIR, test.guidelinesKey);
            if (fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch (e) { console.error('Delete file error:', e); }
            }
        }

        await test.deleteOne();

        res.json({ success: true, message: 'Mains Practice Test deleted successfully' });
    } catch (error) {
        console.error('Delete Mains Practice Test error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Parse Excel file and return question items for MPT
// @route   POST /api/mpt/import-excel
// @access  Private/Admin
export const importMptExcel = async (req: Request, res: Response): Promise<void> => {
    try {
        const file = req.file;

        if (!file) {
            res.status(400).json({ success: false, message: 'Please upload an Excel file' });
            return;
        }

        const { questions, errors } = parseMptExcel(file.buffer);

        if (questions.length === 0 && errors.length > 0) {
            res.status(400).json({
                success: false,
                message: 'Failed to parse Excel file',
                errors,
            });
            return;
        }

        res.json({
            success: true,
            data: questions,
            errors: errors.length > 0 ? errors : undefined,
            message: `Parsed ${questions.length} questions from Excel file`,
        });
    } catch (error) {
        console.error('Import MPT Excel error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Upload Guidelines PDF for MPT
// @route   POST /api/mpt/upload-pdf
// @access  Private/Admin
export const uploadMptPdf = async (req: Request, res: Response): Promise<void> => {
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
        console.error('Upload MPT PDF error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get global MPT module config (guidelines PDF and intro video)
// @route   GET /api/mpt/config
// @access  Public
export const getMptConfig = async (_req: Request, res: Response): Promise<void> => {
    try {
        let config = await MainsPracticeTestConfig.findOne({ key: 'mpt_global_config' }).lean();

        if (!config) {
            config = await MainsPracticeTestConfig.create({ key: 'mpt_global_config' });
        }

        res.json({ success: true, data: config });
    } catch (error) {
        console.error('Get MPT config error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update global MPT module config
// @route   PUT /api/mpt/config
// @access  Private/Admin
export const updateMptConfig = async (req: Request, res: Response): Promise<void> => {
    try {
        const { guidelinesUrl, guidelinesKey, introVideoUrl } = req.body;

        let config = await MainsPracticeTestConfig.findOne({ key: 'mpt_global_config' });
        if (!config) {
            config = new MainsPracticeTestConfig({ key: 'mpt_global_config' });
        }

        if (guidelinesUrl !== undefined) config.guidelinesUrl = guidelinesUrl;
        if (guidelinesKey !== undefined) config.guidelinesKey = guidelinesKey;
        if (introVideoUrl !== undefined) config.introVideoUrl = introVideoUrl?.trim() || undefined;

        await config.save();

        res.json({ success: true, data: config, message: 'Global MPT config updated' });
    } catch (error) {
        console.error('Update MPT config error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
