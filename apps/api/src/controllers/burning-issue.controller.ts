import type { Request, Response } from 'express';
import { BurningIssue } from '../models/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// @desc    Get all burning issues
// @route   GET /api/burning-issues
// @access  Public
export const getBurningIssues = async (req: Request, res: Response): Promise<void> => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const total = await BurningIssue.countDocuments();
        const burningIssues = await BurningIssue.find()
            .sort({ date: -1, createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        res.json({
            success: true,
            data: burningIssues,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error) {
        console.error('Get burning issues error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get single burning issue
// @route   GET /api/burning-issues/:id
// @access  Public
export const getBurningIssue = async (req: Request, res: Response): Promise<void> => {
    try {
        const burningIssue = await BurningIssue.findById(req.params.id);

        if (!burningIssue) {
            res.status(404).json({ success: false, message: 'Burning issue not found' });
            return;
        }

        res.json({ success: true, data: burningIssue });
    } catch (error) {
        console.error('Get burning issue error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create burning issue with images
// @route   POST /api/burning-issues
// @access  Private/Admin
export const createBurningIssue = async (req: Request, res: Response): Promise<void> => {
    try {
        const { topic, date } = req.body;
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            res.status(400).json({ success: false, message: 'Please upload at least one image' });
            return;
        }

        if (!topic) {
            res.status(400).json({ success: false, message: 'Topic is required' });
            return;
        }

        // Build images array with order
        const images = files.map((file, index) => ({
            url: `/uploads/${file.filename}`,
            originalName: file.originalname,
            order: index,
        }));

        const burningIssue = await BurningIssue.create({
            topic,
            images,
            date: date ? new Date(date) : new Date(),
        });

        res.status(201).json({ success: true, data: burningIssue });
    } catch (error) {
        console.error('Create burning issue error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update burning issue
// @route   PUT /api/burning-issues/:id
// @access  Private/Admin
export const updateBurningIssue = async (req: Request, res: Response): Promise<void> => {
    try {
        const { topic, date, imageOrder, removeImages } = req.body;
        const files = req.files as Express.Multer.File[];

        const burningIssue = await BurningIssue.findById(req.params.id);
        if (!burningIssue) {
            res.status(404).json({ success: false, message: 'Burning issue not found' });
            return;
        }

        if (topic) burningIssue.topic = topic;
        if (date) burningIssue.date = new Date(date);

        // Remove specified images
        if (removeImages) {
            const toRemove = JSON.parse(removeImages);
            toRemove.forEach((url: string) => {
                const filePath = path.join(UPLOADS_DIR, path.basename(url));
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
            burningIssue.images = burningIssue.images.filter(
                (img) => !toRemove.includes(img.url)
            );
        }

        // Add new uploaded images
        if (files && files.length > 0) {
            const maxOrder = burningIssue.images.length > 0
                ? Math.max(...burningIssue.images.map((img) => img.order))
                : -1;

            const newImages = files.map((file, index) => ({
                url: `/uploads/${file.filename}`,
                originalName: file.originalname,
                order: maxOrder + 1 + index,
            }));

            burningIssue.images.push(...newImages);
        }

        // Reorder images if order specified
        if (imageOrder) {
            const orderMap: string[] = JSON.parse(imageOrder);
            burningIssue.images = orderMap
                .map((url, idx) => {
                    const img = burningIssue.images.find((i) => i.url === url);
                    if (img) return { ...img, order: idx };
                    return null;
                })
                .filter(Boolean) as any;
        }

        await burningIssue.save();

        res.json({ success: true, data: burningIssue });
    } catch (error) {
        console.error('Update burning issue error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete burning issue and image files
// @route   DELETE /api/burning-issues/:id
// @access  Private/Admin
export const deleteBurningIssue = async (req: Request, res: Response): Promise<void> => {
    try {
        const burningIssue = await BurningIssue.findById(req.params.id);
        if (!burningIssue) {
            res.status(404).json({ success: false, message: 'Burning issue not found' });
            return;
        }

        // Delete image files from disk
        burningIssue.images.forEach((img) => {
            const filePath = path.join(UPLOADS_DIR, path.basename(img.url));
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                } catch (e) {
                    console.error('Failed to delete file:', filePath, e);
                }
            }
        });

        await burningIssue.deleteOne();

        res.json({ success: true, message: 'Burning issue deleted' });
    } catch (error) {
        console.error('Delete burning issue error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
