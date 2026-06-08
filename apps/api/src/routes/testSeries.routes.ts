import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import {
    getTestSeriesList,
    getTestSeriesById,
    createTestSeries,
    updateTestSeries,
    deleteTestSeries,
    uploadPaper,
    importTestExcel,
} from '../controllers/testSeries.controller.js';
import { protect, adminOnly } from '../middlewares/auth.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Ensure uploads directory exists
import fs from 'fs';
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage for brochure upload (PDF)
const brochureStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `test-pdf-${uuidv4()}${ext}`);
    },
});

const uploadBrochure = multer({
    storage: brochureStorage,
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    },
    limits: { fileSize: 50 * 1024 * 1024 },
});

// Multer storage for Excel uploads (in-memory buffer parsing)
const uploadExcel = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB Excel limit
});

const router: ReturnType<typeof Router> = Router();

// @route   GET /api/tests/series
// @desc    Get all test series groups
// @access  Public
router.get('/', getTestSeriesList);

// @route   GET /api/tests/series/:id
// @desc    Get single test series group by ID
// @access  Public
router.get('/:id', getTestSeriesById);

// @route   POST /api/tests/series
// @desc    Create test series group
// @access  Private/Admin
router.post('/', protect, adminOnly, createTestSeries);

// @route   PUT /api/tests/series/:id
// @desc    Update test series group
// @access  Private/Admin
router.put('/:id', protect, adminOnly, updateTestSeries);

// @route   DELETE /api/tests/series/:id
// @desc    Delete test series group
// @access  Private/Admin
router.delete('/:id', protect, adminOnly, deleteTestSeries);

// @route   POST /api/tests/series/upload
// @desc    Upload test brochure (PDF)
// @access  Private/Admin
router.post('/upload', protect, adminOnly, uploadBrochure.single('pdf'), uploadPaper);

// @route   POST /api/tests/series/import-excel
// @desc    Import exam questions from Excel file (Current Affairs format)
// @access  Private/Admin
router.post('/import-excel', protect, adminOnly, uploadExcel.single('excel'), importTestExcel);

export default router;
