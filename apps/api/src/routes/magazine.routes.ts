import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import {
    getMagazines,
    getAdminMagazines,
    getMagazine,
    createMagazine,
    updateMagazine,
    deleteMagazine,
} from '../controllers/magazine.controller.js';
import { protect, adminOnly } from '../middlewares/auth.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Configure multer for local PDF storage
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `magazine-${uuidv4()}${ext}`);
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

// @route   GET /api/magazines
router.get('/', getMagazines);

// @route   GET /api/magazines/admin
router.get('/admin', protect, adminOnly, getAdminMagazines);

// @route   GET /api/magazines/:id
router.get('/:id', getMagazine);

// @route   POST /api/magazines
router.post('/', protect, adminOnly, upload.single('pdf'), createMagazine);

// @route   PUT /api/magazines/:id
router.put('/:id', protect, adminOnly, upload.single('pdf'), updateMagazine);

// @route   DELETE /api/magazines/:id
router.delete('/:id', protect, adminOnly, deleteMagazine);

export default router;
