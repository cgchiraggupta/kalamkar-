/**
 * Kalakar - Video Upload Service
 * 
 * Handles secure file uploads with:
 * - File type validation
 * - Size limits
 * - Secure file naming
 * - S3 integration for production
 */

import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import config from '../config/index.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';
import { 
    isS3Available, 
    uploadToS3, 
    deleteFromS3, 
    generateS3Key,
    generatePresignedDownloadUrl 
} from './s3Service.js';

// Ensure upload directory exists
const uploadDir = path.resolve(config.upload.uploadDir);
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    logger.info(`Created upload directory: ${uploadDir}`);
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate secure filename with UUID to prevent path traversal
        const ext = path.extname(file.originalname).toLowerCase();
        const secureFilename = `${uuidv4()}${ext}`;
        cb(null, secureFilename);
    },
});

// File filter for allowed video types
const fileFilter = (req, file, cb) => {
    // Check MIME type
    if (!config.upload.allowedMimeTypes.includes(file.mimetype)) {
        logger.warn('Rejected file upload - invalid MIME type', {
            mimetype: file.mimetype,
            originalname: file.originalname,
        });
        return cb(
            new ApiError(400, `Invalid file type. Allowed: ${config.upload.allowedExtensions.join(', ')}`),
            false
        );
    }

    // Check extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!config.upload.allowedExtensions.includes(ext)) {
        logger.warn('Rejected file upload - invalid extension', {
            extension: ext,
            originalname: file.originalname,
        });
        return cb(
            new ApiError(400, `Invalid file extension. Allowed: ${config.upload.allowedExtensions.join(', ')}`),
            false
        );
    }

    cb(null, true);
};

// Create multer upload instance
export const videoUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: config.upload.maxFileSizeBytes,
        files: 1, // Only allow single file upload
    },
});

/**
 * Get file info for uploaded video with S3 integration
 */
export async function getFileInfo(file, userId = null) {
    const fileId = path.basename(file.filename, path.extname(file.filename));
    const baseInfo = {
        id: fileId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        sizeFormatted: formatBytes(file.size),
        path: file.path,
        storageProvider: 'local',
        url: `/uploads/${file.filename}`,
    };

    // If S3 is available and we have a userId, upload to S3
    if (isS3Available() && userId && config.isProd) {
        try {
            const s3Key = generateS3Key(userId, 'videos', file.originalname);
            
            logger.info('Uploading file to S3', { 
                filename: file.filename, 
                s3Key,
                userId 
            });

            const s3Result = await uploadToS3(file.path, s3Key, file.mimetype);

            // Delete local file after successful S3 upload
            await fs.promises.unlink(file.path);
            
            logger.info('File uploaded to S3 and local file cleaned up', { 
                s3Key, 
                s3Url: s3Result.url 
            });

            return {
                ...baseInfo,
                storageProvider: 's3',
                s3Key: s3Result.key,
                url: s3Result.url,
                path: null, // No local path for S3 files
            };

        } catch (error) {
            logger.error('S3 upload failed, keeping local file', { 
                error: error.message,
                filename: file.filename 
            });
            // Fall back to local storage if S3 fails
        }
    }

    return baseInfo;
}

/**
 * Delete uploaded file (local or S3)
 */
export async function deleteFile(fileInfo) {
    try {
        if (fileInfo.storageProvider === 's3' && fileInfo.s3Key) {
            await deleteFromS3(fileInfo.s3Key);
            logger.info(`Deleted S3 file: ${fileInfo.s3Key}`);
        } else if (fileInfo.filename) {
            const filePath = path.join(uploadDir, fileInfo.filename);
            if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
                logger.info(`Deleted local file: ${fileInfo.filename}`);
            }
        }
        return true;
    } catch (error) {
        logger.error('Failed to delete file', { 
            error: error.message, 
            fileInfo 
        });
        return false;
    }
}

/**
 * Get file URL (with presigned URL for S3)
 */
export async function getFileUrl(fileInfo, expiresIn = 3600) {
    if (fileInfo.storageProvider === 's3' && fileInfo.s3Key) {
        try {
            return await generatePresignedDownloadUrl(fileInfo.s3Key, expiresIn);
        } catch (error) {
            logger.error('Failed to generate presigned URL', { 
                error: error.message, 
                s3Key: fileInfo.s3Key 
            });
            throw new ApiError(500, 'Failed to generate file URL');
        }
    }
    
    // Return local URL
    return fileInfo.url;
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
