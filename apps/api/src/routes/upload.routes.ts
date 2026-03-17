import { Router } from 'express';
import {
    uploadImage,
    uploadPdf,
    getPresignedUploadUrl,
} from '../controllers/upload.controller.js';
import { protect, adminOnly } from '../middlewares/auth.middleware.js';
import multer from 'multer';

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

const router: ReturnType<typeof Router> = Router();

// @route   POST /api/upload/image
// @desc    Upload image to S3
// @access  Private/Admin
router.post('/image', protect, adminOnly, upload.single('file'), uploadImage);

// @route   POST /api/upload/pdf
// @desc    Upload PDF to S3
// @access  Private/Admin
router.post('/pdf', protect, adminOnly, upload.single('file'), uploadPdf);

// @route   GET /api/upload/presigned
// @desc    Get presigned URL for direct upload
// @access  Private/Admin
router.get('/presigned', protect, adminOnly, getPresignedUploadUrl);

export default router;
