/**
 * Kalakar - Video Upload Service
 * 
 * Handles secure file uploads with:
 * - File type validation
 * - Size limits
 * - Secure file naming
 */

import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import config from '../config/index.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

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
 * Get file info for uploaded video
 */
export function getFileInfo(file) {
    return {
        id: path.basename(file.filename, path.extname(file.filename)),
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        sizeFormatted: formatBytes(file.size),
        path: file.path,
        url: `/uploads/${file.filename}`,
    };
}

/**
 * Delete uploaded file
 */
export async function deleteFile(filename) {
    const filePath = path.join(uploadDir, filename);

    if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        logger.info(`Deleted file: ${filename}`);
        return true;
    }

    return false;
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
