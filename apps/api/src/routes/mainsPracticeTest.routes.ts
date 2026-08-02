import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import {
    getMainsPracticeTestList,
    getMainsPracticeTestById,
    createMainsPracticeTest,
    updateMainsPracticeTest,
    deleteMainsPracticeTest,
    importMptExcel,
    uploadMptPdf,
    getMptConfig,
    updateMptConfig,
} from '../controllers/mainsPracticeTest.controller.js';
import { protect, adminOnly } from '../middlewares/auth.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Ensure uploads directory exists
import fs from 'fs';
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer memory storage for Excel import
const memoryUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Multer disk storage for PDF upload
const pdfStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `mpt-pdf-${uuidv4()}${ext}`);
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

// @route   GET /api/mpt/config
router.get('/config', getMptConfig);

// @route   PUT /api/mpt/config
router.put('/config', protect, adminOnly, updateMptConfig);

// @route   GET /api/mpt
router.get('/', getMainsPracticeTestList);

// @route   GET /api/mpt/:id
router.get('/:id', getMainsPracticeTestById);

// @route   POST /api/mpt
router.post('/', protect, adminOnly, createMainsPracticeTest);

// @route   PUT /api/mpt/:id
router.put('/:id', protect, adminOnly, updateMainsPracticeTest);

// @route   DELETE /api/mpt/:id
router.delete('/:id', protect, adminOnly, deleteMainsPracticeTest);

// @route   POST /api/mpt/import-excel
router.post('/import-excel', protect, adminOnly, memoryUpload.single('excel'), importMptExcel);

// @route   POST /api/mpt/upload-pdf
router.post('/upload-pdf', protect, adminOnly, uploadPdf.single('pdf'), uploadMptPdf);

export default router;
