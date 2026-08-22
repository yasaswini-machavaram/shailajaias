import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import {
    submitAnswerSheet,
    reuploadAnswerSheet,
    getMySubmissions,
    getSubmissionById,
    getAllSubmissions,
    getMentorSubmissions,
    assignMentor,
    bulkAssignMentor,
    submitEvaluation,
    startReview,
    getSubmissionStats,
} from '../controllers/mainsSubmission.controller.js';
import { protect, adminOnly, mentorOrAdmin, mentorOnly } from '../middlewares/auth.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Ensure uploads directory exists
import fs from 'fs';
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage for answer sheet uploads (student) and evaluated copies (mentor/admin)
const fileStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `mts-answer-${uuidv4()}${ext}`);
    },
});

const uploadFiles = multer({
    storage: fileStorage,
    fileFilter: (_req, file, cb) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, JPG, PNG, and WebP files are allowed'));
        }
    },
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file
});

// Multer for evaluated copy upload (single PDF)
const evalStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `mts-evaluated-${uuidv4()}${ext}`);
    },
});

const uploadEvalCopy = multer({
    storage: evalStorage,
    fileFilter: (_req, file, cb) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and image files are allowed'));
        }
    },
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for evaluated copies
});

const router: ReturnType<typeof Router> = Router();

// Student routes
// @route   POST /api/mts/submissions — Student uploads answer sheets
router.post('/', protect, uploadFiles.array('answerSheets', 10), submitAnswerSheet);

// @route   PUT /api/mts/submissions/:id/reupload — Student re-uploads answer sheets once before review
router.put('/:id/reupload', protect, uploadFiles.array('answerSheets', 10), reuploadAnswerSheet);

// @route   GET /api/mts/submissions/my — Student views their submissions
router.get('/my', protect, getMySubmissions);

// @route   GET /api/mts/submissions/stats — Admin gets submission stats
router.get('/stats', protect, adminOnly, getSubmissionStats);

// @route   GET /api/mts/submissions/mentor — Mentor views assigned submissions
router.get('/mentor', protect, mentorOnly, getMentorSubmissions);

// Admin routes
// @route   GET /api/mts/submissions — Admin views ALL submissions
router.get('/', protect, adminOnly, getAllSubmissions);

// @route   PUT /api/mts/submissions/bulk-assign — Admin bulk assigns mentor
router.put('/bulk-assign', protect, adminOnly, bulkAssignMentor);

// @route   GET /api/mts/submissions/:id — View single submission
router.get('/:id', protect, getSubmissionById);

// @route   PUT /api/mts/submissions/:id/assign — Admin assigns mentor
router.put('/:id/assign', protect, adminOnly, assignMentor);

// @route   PUT /api/mts/submissions/:id/start-review — Mentor/Admin marks as under review
router.put('/:id/start-review', protect, mentorOrAdmin, startReview);

// @route   PUT /api/mts/submissions/:id/evaluate — Mentor/Admin submits evaluation
router.put('/:id/evaluate', protect, mentorOrAdmin, uploadEvalCopy.single('evaluatedCopy'), submitEvaluation);

export default router;
