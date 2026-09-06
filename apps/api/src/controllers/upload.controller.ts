import type { Request, Response } from 'express';
import { uploadToS3, getPresignedUrl } from '../services/s3.service.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

import fs from 'fs';

// @desc    Upload image to S3 (or local disk fallback)
// @route   POST /api/upload/image
// @access  Private (Student/Admin)
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

        const ext = path.extname(file.originalname) || '.jpg';
        const bucketName = process.env.AWS_BUCKET_NAME;

        if (bucketName && bucketName.trim().length > 0) {
            try {
                const filename = `images/${uuidv4()}${ext}`;
                const result = await uploadToS3(file.buffer, filename, file.mimetype);
                res.json({
                    success: true,
                    data: {
                        url: result.url,
                        key: result.key,
                    },
                });
                return;
            } catch (s3Err) {
                console.warn('S3 upload failed, falling back to local disk storage:', s3Err);
            }
        }

        // Fallback: Save to local uploads directory
        const uploadsDir = path.resolve(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const localFileName = `img-${uuidv4()}${ext}`;
        const filePath = path.join(uploadsDir, localFileName);
        await fs.promises.writeFile(filePath, file.buffer);

        const protocol = req.protocol || 'http';
        const host = req.get('host') || 'localhost:4000';
        const fileUrl = `${protocol}://${host}/uploads/${localFileName}`;

        res.json({
            success: true,
            data: {
                url: fileUrl,
                key: localFileName,
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
