import type { Request, Response } from 'express';
import { ResourceCategory, ResourceItem } from '../models/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

/**
 * Generate a URL-friendly slug from a title.
 */
function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// ─── CATEGORY CONTROLLERS ──────────────────────────────────────────────────

// @desc    Get all published resource categories (sorted by order)
// @route   GET /api/resources/categories
// @access  Public
export const getCategories = async (req: Request, res: Response): Promise<void> => {
    try {
        const { includeUnpublished } = req.query;

        const filter: Record<string, unknown> = {};
        if (!includeUnpublished) filter.isPublished = true;

        const categories = await ResourceCategory.find(filter)
            .sort({ order: 1, createdAt: 1 })
            .lean();

        // Get item counts per category
        const categoriesWithCounts = await Promise.all(
            categories.map(async (cat: any) => {
                const itemCount = await ResourceItem.countDocuments({
                    category: cat._id,
                    ...(includeUnpublished ? {} : { isPublished: true }),
                });
                return { ...cat, itemCount };
            })
        );

        res.json({ success: true, data: categoriesWithCounts });
    } catch (error) {
        console.error('Get resource categories error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get single category with its items
// @route   GET /api/resources/categories/:id
// @access  Public
export const getCategoryWithItems = async (req: Request, res: Response): Promise<void> => {
    try {
        const category = await ResourceCategory.findById(req.params.id).lean();
        if (!category) {
            res.status(404).json({ success: false, message: 'Category not found' });
            return;
        }

        const items = await ResourceItem.find({
            category: req.params.id,
            isPublished: true,
        })
            .sort({ order: 1, createdAt: 1 })
            .lean();

        res.json({ success: true, data: { ...category, items } });
    } catch (error) {
        console.error('Get category with items error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create resource category
// @route   POST /api/resources/categories
// @access  Private/Admin
export const createCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, icon, accentColor, order, predefinedTags, isPublished } = req.body;
        const user = (req as Request & { user: { _id: string } }).user;

        if (!title?.trim()) {
            res.status(400).json({ success: false, message: 'Title is required' });
            return;
        }

        // Generate slug and ensure uniqueness
        let slug = slugify(title);
        const existing = await ResourceCategory.findOne({ slug });
        if (existing) {
            slug = `${slug}-${Date.now()}`;
        }

        const category = await ResourceCategory.create({
            title: title.trim(),
            slug,
            description: description?.trim() || undefined,
            icon: icon || '📁',
            accentColor: accentColor || '#1E3A5F',
            order: order ?? 0,
            predefinedTags: predefinedTags || [],
            isPublished: isPublished !== undefined ? isPublished : true,
            createdBy: user._id,
        });

        res.status(201).json({ success: true, data: category });
    } catch (error) {
        console.error('Create resource category error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update resource category
// @route   PUT /api/resources/categories/:id
// @access  Private/Admin
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, icon, accentColor, order, predefinedTags, isPublished } = req.body;

        const category = await ResourceCategory.findById(req.params.id);
        if (!category) {
            res.status(404).json({ success: false, message: 'Category not found' });
            return;
        }

        if (title !== undefined) {
            category.title = title.trim();
            // Re-generate slug if title changes
            let slug = slugify(title);
            const existing = await ResourceCategory.findOne({ slug, _id: { $ne: category._id } });
            if (existing) slug = `${slug}-${Date.now()}`;
            category.slug = slug;
        }
        if (description !== undefined) category.description = description?.trim() || undefined;
        if (icon !== undefined) category.icon = icon;
        if (accentColor !== undefined) category.accentColor = accentColor;
        if (order !== undefined) category.order = order;
        if (predefinedTags !== undefined) category.predefinedTags = predefinedTags;
        if (isPublished !== undefined) category.isPublished = isPublished;

        await category.save();

        res.json({ success: true, data: category });
    } catch (error) {
        console.error('Update resource category error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete resource category and all its items + PDF files
// @route   DELETE /api/resources/categories/:id
// @access  Private/Admin
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const category = await ResourceCategory.findById(req.params.id);
        if (!category) {
            res.status(404).json({ success: false, message: 'Category not found' });
            return;
        }

        // Delete all items' PDF files
        const items = await ResourceItem.find({ category: category._id });
        for (const item of items) {
            const filePath = path.join(UPLOADS_DIR, item.pdfKey);
            if (fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch (e) {
                    console.error('Failed to delete resource file:', filePath, e);
                }
            }
        }

        // Delete all items in this category
        await ResourceItem.deleteMany({ category: category._id });

        // Delete the category
        await category.deleteOne();

        res.json({ success: true, message: 'Category and all its items deleted' });
    } catch (error) {
        console.error('Delete resource category error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─── ITEM CONTROLLERS ───────────────────────────────────────────────────────

// @desc    Create resource item with PDF upload
// @route   POST /api/resources/items
// @access  Private/Admin
export const createItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, category, tag, description, order, isPublished } = req.body;
        const user = (req as Request & { user: { _id: string } }).user;
        const file = req.file;

        if (!title?.trim() || !category || !tag?.trim()) {
            res.status(400).json({ success: false, message: 'Title, category, and tag are required' });
            return;
        }

        if (!file) {
            res.status(400).json({ success: false, message: 'Please upload a PDF file' });
            return;
        }

        // Verify category exists
        const categoryDoc = await ResourceCategory.findById(category);
        if (!categoryDoc) {
            res.status(404).json({ success: false, message: 'Category not found' });
            return;
        }

        const item = await ResourceItem.create({
            title: title.trim(),
            category,
            tag: tag.trim(),
            pdfUrl: `/uploads/${file.filename}`,
            pdfKey: file.filename,
            description: description?.trim() || undefined,
            order: order ?? 0,
            isPublished: isPublished !== undefined ? JSON.parse(isPublished) : true,
            createdBy: user._id,
        });

        res.status(201).json({ success: true, data: item });
    } catch (error) {
        console.error('Create resource item error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update resource item (optional PDF re-upload)
// @route   PUT /api/resources/items/:id
// @access  Private/Admin
export const updateItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, category, tag, description, order, isPublished } = req.body;
        const file = req.file;

        const item = await ResourceItem.findById(req.params.id);
        if (!item) {
            res.status(404).json({ success: false, message: 'Item not found' });
            return;
        }

        if (title !== undefined) item.title = title.trim();
        if (category !== undefined) item.category = category;
        if (tag !== undefined) item.tag = tag.trim();
        if (description !== undefined) item.description = description?.trim() || undefined;
        if (order !== undefined) item.order = order;
        if (isPublished !== undefined) item.isPublished = JSON.parse(isPublished);

        // Handle PDF re-upload
        if (file) {
            // Delete old file
            const oldFilePath = path.join(UPLOADS_DIR, item.pdfKey);
            if (fs.existsSync(oldFilePath)) {
                try { fs.unlinkSync(oldFilePath); } catch (e) {
                    console.error('Failed to delete old resource file:', oldFilePath, e);
                }
            }
            item.pdfUrl = `/uploads/${file.filename}`;
            item.pdfKey = file.filename;
        }

        await item.save();

        res.json({ success: true, data: item });
    } catch (error) {
        console.error('Update resource item error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete resource item + its PDF file
// @route   DELETE /api/resources/items/:id
// @access  Private/Admin
export const deleteItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const item = await ResourceItem.findById(req.params.id);
        if (!item) {
            res.status(404).json({ success: false, message: 'Item not found' });
            return;
        }

        // Delete PDF file
        const filePath = path.join(UPLOADS_DIR, item.pdfKey);
        if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (e) {
                console.error('Failed to delete resource file:', filePath, e);
            }
        }

        await item.deleteOne();

        res.json({ success: true, message: 'Resource item deleted' });
    } catch (error) {
        console.error('Delete resource item error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Download resource PDF (forces download via Content-Disposition)
// @route   GET /api/resources/download/:id
// @access  Public
export const downloadItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const item = await ResourceItem.findById(req.params.id);
        if (!item) {
            res.status(404).json({ success: false, message: 'Resource not found' });
            return;
        }

        const filePath = path.join(UPLOADS_DIR, item.pdfKey);
        if (!fs.existsSync(filePath)) {
            res.status(404).json({ success: false, message: 'PDF file not found' });
            return;
        }

        const safeName = item.title.replace(/[/\\:*?"<>|]/g, '_').trim();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    } catch (error) {
        console.error('Download resource error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
