import { Router } from 'express';
import {
    getQuizzes,
    getQuiz,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    importQuizFromExcel,
} from '../controllers/quiz.controller.js';
import { protect, adminOnly } from '../middlewares/auth.middleware.js';
import multer from 'multer';

// Configure multer for Excel file upload
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (
            file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel'
        ) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files are allowed'));
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const router: ReturnType<typeof Router> = Router();

// @route   GET /api/quizzes
// @desc    Get all quizzes with filters
// @access  Public
router.get('/', getQuizzes);

// @route   GET /api/quizzes/:id
// @desc    Get single quiz with questions
// @access  Public
router.get('/:id', getQuiz);

// @route   POST /api/quizzes
// @desc    Create quiz
// @access  Private/Admin
router.post('/', protect, adminOnly, createQuiz);

// @route   POST /api/quizzes/import-excel
// @desc    Import quiz from Excel file
// @access  Private/Admin
router.post('/import-excel', protect, adminOnly, upload.single('file'), importQuizFromExcel);

// @route   PUT /api/quizzes/:id
// @desc    Update quiz
// @access  Private/Admin
router.put('/:id', protect, adminOnly, updateQuiz);

// @route   DELETE /api/quizzes/:id
// @desc    Delete quiz
// @access  Private/Admin
router.delete('/:id', protect, adminOnly, deleteQuiz);

export default router;
