import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import {
    getCategories,
    getCategoryWithItems,
    createCategory,
    updateCategory,
    deleteCategory,
    createItem,
    updateItem,
    deleteItem,
    downloadItem,
} from '../controllers/resource.controller.js';
import { protect, adminOnly } from '../middlewares/auth.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Configure multer for local PDF storage (same pattern as magazines)
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `resource-${uuidv4()}${ext}`);
    },
});

const upload = multer({
    storage,
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    },
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
});

const router: ReturnType<typeof Router> = Router();

// ─── Category Routes ────────────────────────────────────────────────────────

// @route   GET /api/resources/categories
// @desc    Get all published resource categories with item counts
// @access  Public
router.get('/categories', getCategories);

// @route   GET /api/resources/categories/:id
// @desc    Get single category with all its published items
// @access  Public
router.get('/categories/:id', getCategoryWithItems);

// @route   POST /api/resources/categories
// @desc    Create resource category
// @access  Private/Admin
router.post('/categories', protect, adminOnly, createCategory);

// @route   PUT /api/resources/categories/:id
// @desc    Update resource category
// @access  Private/Admin
router.put('/categories/:id', protect, adminOnly, updateCategory);

// @route   DELETE /api/resources/categories/:id
// @desc    Delete resource category + all items + PDF files
// @access  Private/Admin
router.delete('/categories/:id', protect, adminOnly, deleteCategory);

// ─── Item Routes ────────────────────────────────────────────────────────────

// @route   POST /api/resources/items
// @desc    Create resource item with PDF upload
// @access  Private/Admin
router.post('/items', protect, adminOnly, upload.single('pdf'), createItem);

// @route   PUT /api/resources/items/:id
// @desc    Update resource item (optional PDF re-upload)
// @access  Private/Admin
router.put('/items/:id', protect, adminOnly, upload.single('pdf'), updateItem);

// @route   DELETE /api/resources/items/:id
// @desc    Delete resource item + PDF file
// @access  Private/Admin
router.delete('/items/:id', protect, adminOnly, deleteItem);

// @route   GET /api/resources/download/:id
// @desc    Download resource PDF (Content-Disposition: attachment)
// @access  Public
router.get('/download/:id', downloadItem);

export default router;
