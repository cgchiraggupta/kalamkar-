/**
 * Kalakar - Video Routes
 * 
 * API endpoints for video operations:
 * - Upload video
 * - Get video info
 * - Delete video
 */

import { Router } from 'express';
import { videoUpload, getFileInfo, deleteFile } from '../services/uploadService.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler, Errors } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * POST /api/videos/upload
 * Upload a new video file
 */
router.post(
    '/upload',
    uploadLimiter,
    videoUpload.single('video'),
    asyncHandler(async (req, res) => {
        if (!req.file) {
            throw Errors.badRequest('No video file provided');
        }

        const fileInfo = getFileInfo(req.file);

        logger.info('Video uploaded successfully', {
            id: fileInfo.id,
            size: fileInfo.sizeFormatted,
            originalName: fileInfo.originalName,
        });

        res.status(201).json({
            success: true,
            message: 'Video uploaded successfully',
            data: {
                video: fileInfo,
            },
        });
    })
);

/**
 * GET /api/videos/:id
 * Get video information by ID
 */
router.get(
    '/:id',
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        // TODO: Implement database lookup
        // For now, return mock data

        res.json({
            success: true,
            data: {
                video: {
                    id,
                    status: 'ready',
                    createdAt: new Date().toISOString(),
                },
            },
        });
    })
);

/**
 * DELETE /api/videos/:id
 * Delete a video by ID
 */
router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        // TODO: Implement proper authorization check
        // Verify user owns this video before deletion

        const deleted = await deleteFile(`${id}.mp4`);

        if (!deleted) {
            throw Errors.notFound('Video');
        }

        logger.info('Video deleted', { id });

        res.json({
            success: true,
            message: 'Video deleted successfully',
        });
    })
);

export default router;
