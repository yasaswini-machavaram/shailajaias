import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || '';

export interface UploadResult {
    url: string;
    key: string;
}

/**
 * Upload a file to S3
 */
export const uploadToS3 = async (
    file: Buffer,
    key: string,
    contentType: string
): Promise<UploadResult> => {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: contentType,
    });

    await s3Client.send(command);

    return {
        url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`,
        key,
    };
};

/**
 * Generate a presigned URL for secure file access
 */
export const getPresignedUrl = async (key: string, expiresIn = 3600): Promise<string> => {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    return getSignedUrl(s3Client, command, { expiresIn });
};

/**
 * Delete a file from S3
 */
export const deleteFromS3 = async (key: string): Promise<void> => {
    const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    await s3Client.send(command);
};

export default s3Client;
