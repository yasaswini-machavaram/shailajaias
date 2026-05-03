import type { Request, Response } from 'express';
import { Magazine } from '../models/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// @desc    Get all magazines (with optional category & year filters)
// @route   GET /api/magazines
// @access  Public
export const getMagazines = async (req: Request, res: Response): Promise<void> => {
    try {
        const { category, year, page = 1, limit = 50 } = req.query;

        const filter: Record<string, unknown> = { isPublished: true };
        if (category) filter.category = category;
        if (year) filter.year = Number(year);

        const total = await Magazine.countDocuments(filter);
        const magazines = await Magazine.find(filter)
            .sort({ year: -1, month: 1, createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        res.json({
            success: true,
            data: magazines,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error) {
        console.error('Get magazines error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get all magazines for admin (including unpublished)
// @route   GET /api/magazines/admin
// @access  Private/Admin
export const getAdminMagazines = async (req: Request, res: Response): Promise<void> => {
    try {
        const { category, year, page = 1, limit = 50 } = req.query;

        const filter: Record<string, unknown> = {};
        if (category) filter.category = category;
        if (year) filter.year = Number(year);

        const total = await Magazine.countDocuments(filter);
        const magazines = await Magazine.find(filter)
            .sort({ year: -1, month: 1, createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        res.json({
            success: true,
            data: magazines,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error) {
        console.error('Get admin magazines error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get single magazine
// @route   GET /api/magazines/:id
// @access  Public
export const getMagazine = async (req: Request, res: Response): Promise<void> => {
    try {
        const magazine = await Magazine.findById(req.params.id);

        if (!magazine) {
            res.status(404).json({ success: false, message: 'Magazine not found' });
            return;
        }

        res.json({ success: true, data: magazine });
    } catch (error) {
        console.error('Get magazine error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create magazine
// @route   POST /api/magazines
// @access  Private/Admin
export const createMagazine = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, category, year, month, isPublished } = req.body;
        const file = req.file;

        if (!title || !category || !year || !month) {
            res.status(400).json({
                success: false,
                message: 'Title, category, year, and month are required',
            });
            return;
        }

        if (!file) {
            res.status(400).json({ success: false, message: 'Please upload a PDF file' });
            return;
        }

        const magazine = await Magazine.create({
            title,
            pdfUrl: `/uploads/${file.filename}`,
            pdfKey: file.filename,
            category,
            year: Number(year),
            month,
            isPublished: isPublished !== undefined ? JSON.parse(isPublished) : true,
        });

        res.status(201).json({ success: true, data: magazine });
    } catch (error) {
        console.error('Create magazine error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update magazine
// @route   PUT /api/magazines/:id
// @access  Private/Admin
export const updateMagazine = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, category, year, month, isPublished } = req.body;
        const file = req.file;

        const magazine = await Magazine.findById(req.params.id);
        if (!magazine) {
            res.status(404).json({ success: false, message: 'Magazine not found' });
            return;
        }

        if (title !== undefined) magazine.title = title;
        if (category !== undefined) magazine.category = category;
        if (year !== undefined) magazine.year = Number(year);
        if (month !== undefined) magazine.month = month;
        if (isPublished !== undefined) magazine.isPublished = JSON.parse(isPublished);

        // Handle new PDF upload
        if (file) {
            // Delete old file if it exists
            const oldFilePath = path.join(UPLOADS_DIR, magazine.pdfKey);
            if (fs.existsSync(oldFilePath)) {
                try {
                    fs.unlinkSync(oldFilePath);
                } catch (e) {
                    console.error('Failed to delete old file:', oldFilePath, e);
                }
            }

            magazine.pdfUrl = `/uploads/${file.filename}`;
            magazine.pdfKey = file.filename;
        }

        await magazine.save();

        res.json({ success: true, data: magazine });
    } catch (error) {
        console.error('Update magazine error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete magazine
// @route   DELETE /api/magazines/:id
// @access  Private/Admin
export const deleteMagazine = async (req: Request, res: Response): Promise<void> => {
    try {
        const magazine = await Magazine.findById(req.params.id);
        if (!magazine) {
            res.status(404).json({ success: false, message: 'Magazine not found' });
            return;
        }

        // Delete local PDF file
        const filePath = path.join(UPLOADS_DIR, magazine.pdfKey);
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (e) {
                console.error('Failed to delete file:', filePath, e);
            }
        }

        await magazine.deleteOne();

        res.json({ success: true, message: 'Magazine deleted' });
    } catch (error) {
        console.error('Delete magazine error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Download magazine PDF (forces download via Content-Disposition)
// @route   GET /api/magazines/download/:id
// @access  Public
export const downloadMagazine = async (req: Request, res: Response): Promise<void> => {
    try {
        const magazine = await Magazine.findById(req.params.id);
        if (!magazine) {
            res.status(404).json({ success: false, message: 'Magazine not found' });
            return;
        }

        const filePath = path.join(UPLOADS_DIR, magazine.pdfKey);
        if (!fs.existsSync(filePath)) {
            res.status(404).json({ success: false, message: 'PDF file not found' });
            return;
        }

        // Sanitize title for filename
        const safeName = magazine.title.replace(/[/\\:*?"<>|]/g, '_').trim();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    } catch (error) {
        console.error('Download magazine error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
