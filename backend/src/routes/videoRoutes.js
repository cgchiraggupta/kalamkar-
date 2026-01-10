/**
 * Kalakar - Video Routes
 * 
 * API endpoints for video operations:
 * - Upload video
 * - Get video info
 * - Delete video
 * - List user videos
 */

import { Router } from 'express';
import { videoUpload, getFileInfo, deleteFile } from '../services/uploadService.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { demoAuth } from '../middleware/auth.js';
import { asyncHandler, Errors } from '../middleware/errorHandler.js';
import { Video } from '../models/Video.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * POST /api/videos/upload
 * Upload a new video file
 */
router.post(
    '/upload',
    uploadLimiter,
    demoAuth, // Use demo auth for now
    videoUpload.single('video'),
    asyncHandler(async (req, res) => {
        if (!req.file) {
            throw Errors.badRequest('No video file provided');
        }

        const fileInfo = await getFileInfo(req.file);

        // Create video record in database
        const video = await Video.create({
            userId: req.userId,
            filename: fileInfo.filename,
            originalName: fileInfo.originalName,
            mimeType: fileInfo.mimeType,
            fileSize: fileInfo.size,
            storagePath: fileInfo.path,
            storageProvider: 'local',
            status: 'uploaded'
        });

        logger.info('Video uploaded successfully', {
            videoId: video.id,
            userId: req.userId,
            size: fileInfo.sizeFormatted,
            originalName: fileInfo.originalName,
        });

        res.status(201).json({
            success: true,
            message: 'Video uploaded successfully',
            data: {
                video: video.toJSON(),
            },
        });
    })
);

/**
 * GET /api/videos
 * Get user's videos
 */
router.get(
    '/',
    demoAuth,
    asyncHandler(async (req, res) => {
        const { 
            limit = 20, 
            offset = 0, 
            status,
            orderBy = 'created_at',
            orderDirection = 'desc'
        } = req.query;

        const videos = await Video.findByUserId(req.userId, {
            limit: parseInt(limit),
            offset: parseInt(offset),
            status,
            orderBy,
            orderDirection
        });

        res.json({
            success: true,
            data: {
                videos: videos.map(video => video.toJSON()),
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: videos.length
                }
            }
        });
    })
);

/**
 * GET /api/videos/:id
 * Get video information by ID
 */
router.get(
    '/:id',
    demoAuth,
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        const video = await Video.findById(id, req.userId);
        if (!video) {
            throw Errors.notFound('Video');
        }

        // Get video statistics
        const stats = await video.getStats();

        res.json({
            success: true,
            data: {
                video: video.toJSON(),
                stats
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
    demoAuth,
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        const video = await Video.findById(id, req.userId);
        if (!video) {
            throw Errors.notFound('Video');
        }

        // Delete physical file
        const deleted = await deleteFile({ filename: video.filename });
        if (!deleted) {
            logger.warn('Physical file not found during deletion', { videoId: id, filename: video.filename });
        }

        // Delete database record
        await video.delete();

        logger.info('Video deleted', { videoId: id, userId: req.userId });

        res.json({
            success: true,
            message: 'Video deleted successfully',
        });
    })
);

export default router;
