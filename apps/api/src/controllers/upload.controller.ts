import type { Request, Response } from 'express';
import { uploadToS3, getPresignedUrl } from '../services/s3.service.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// @desc    Upload image to S3
// @route   POST /api/upload/image
// @access  Private/Admin
export const uploadImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const file = req.file;

        if (!file) {
            res.status(400).json({ success: false, message: 'Please upload an image file' });
            return;
        }

        // Validate image type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
            res.status(400).json({ success: false, message: 'Only JPEG, PNG, GIF, and WebP images are allowed' });
            return;
        }

        // Generate unique filename
        const ext = path.extname(file.originalname);
        const filename = `images/${uuidv4()}${ext}`;

        // Upload to S3
        const result = await uploadToS3(file.buffer, filename, file.mimetype);

        res.json({
            success: true,
            data: {
                url: result.url,
                key: result.key,
            },
        });
    } catch (error) {
        console.error('Upload image error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Upload PDF to S3
// @route   POST /api/upload/pdf
// @access  Private/Admin
export const uploadPdf = async (req: Request, res: Response): Promise<void> => {
    try {
        const file = req.file;

        if (!file) {
            res.status(400).json({ success: false, message: 'Please upload a PDF file' });
            return;
        }

        // Validate PDF type
        if (file.mimetype !== 'application/pdf') {
            res.status(400).json({ success: false, message: 'Only PDF files are allowed' });
            return;
        }

        // Generate unique filename
        const filename = `magazines/${uuidv4()}.pdf`;

        // Upload to S3
        const result = await uploadToS3(file.buffer, filename, file.mimetype);

        res.json({
            success: true,
            data: {
                url: result.url,
                key: result.key,
            },
        });
    } catch (error) {
        console.error('Upload PDF error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get presigned URL for direct upload
// @route   GET /api/upload/presigned
// @access  Private/Admin
export const getPresignedUploadUrl = async (req: Request, res: Response): Promise<void> => {
    try {
        const { filename, contentType, folder = 'uploads' } = req.query;

        if (!filename || !contentType) {
            res.status(400).json({ success: false, message: 'Please provide filename and contentType' });
            return;
        }

        // Generate unique key with folder
        const ext = path.extname(filename as string);
        const key = `${folder}/${uuidv4()}${ext}`;

        // Get presigned URL (for download - S3 presigned upload would need different approach)
        const presignedUrl = await getPresignedUrl(key, 3600); // 1 hour expiry

        res.json({
            success: true,
            data: {
                uploadUrl: presignedUrl,
                key,
            },
        });
    } catch (error) {
        console.error('Get presigned URL error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
