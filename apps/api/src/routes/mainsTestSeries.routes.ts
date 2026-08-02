import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import {
    getMainsTestSeriesList,
    getMainsTestSeriesById,
    createMainsTestSeries,
    updateMainsTestSeries,
    deleteMainsTestSeries,
    uploadMtsPaper,
} from '../controllers/mainsTestSeries.controller.js';
import { protect, adminOnly } from '../middlewares/auth.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Ensure uploads directory exists
import fs from 'fs';
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage for PDF upload
const pdfStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `mts-pdf-${uuidv4()}${ext}`);
    },
});

const uploadPdf = multer({
    storage: pdfStorage,
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    },
    limits: { fileSize: 50 * 1024 * 1024 },
});

const router: ReturnType<typeof Router> = Router();

// @route   GET /api/mts/series
router.get('/', getMainsTestSeriesList);

// @route   GET /api/mts/series/:id
router.get('/:id', getMainsTestSeriesById);

// @route   POST /api/mts/series
router.post('/', protect, adminOnly, createMainsTestSeries);

// @route   PUT /api/mts/series/:id
router.put('/:id', protect, adminOnly, updateMainsTestSeries);

// @route   DELETE /api/mts/series/:id
router.delete('/:id', protect, adminOnly, deleteMainsTestSeries);

// @route   POST /api/mts/series/upload
router.post('/upload', protect, adminOnly, uploadPdf.single('pdf'), uploadMtsPaper);

export default router;
