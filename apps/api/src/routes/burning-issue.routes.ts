import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import {
    getBurningIssues,
    getBurningIssue,
    createBurningIssue,
    updateBurningIssue,
    deleteBurningIssue,
} from '../controllers/burning-issue.controller.js';
import { protect, adminOnly } from '../middlewares/auth.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Configure multer for local image storage
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `burning-issue-${uuidv4()}${ext}`);
    },
});

const upload = multer({
    storage,
    fileFilter: (_req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG, PNG, and WebP images are allowed'));
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
});

const router: ReturnType<typeof Router> = Router();

// @route   GET /api/burning-issues
router.get('/', getBurningIssues);

// @route   GET /api/burning-issues/:id
router.get('/:id', getBurningIssue);

// @route   POST /api/burning-issues
router.post('/', protect, adminOnly, upload.array('images', 20), createBurningIssue);

// @route   PUT /api/burning-issues/:id
router.put('/:id', protect, adminOnly, upload.array('images', 20), updateBurningIssue);

// @route   DELETE /api/burning-issues/:id
router.delete('/:id', protect, adminOnly, deleteBurningIssue);

export default router;
