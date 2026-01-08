/**
 * Kalakar - Video Export Routes
 * 
 * API endpoints for exporting videos with burned-in captions
 */

import { Router } from 'express';
import { exportVideoWithCaptions, getExportStatus, deleteExport } from '../services/videoExportService.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler, Errors } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * POST /api/export/video
 * Export video with burned-in captions
 * 
 * Body: {
 *   videoId: string,
 *   captions: Caption[],
 *   style?: CaptionStyle,
 *   options?: ExportOptions
 * }
 */
router.post(
    '/video',
    uploadLimiter, // Reuse upload rate limiter for exports
    asyncHandler(async (req, res) => {
        const { videoId, captions, style = {}, options = {} } = req.body;

        // Validate required fields
        if (!videoId) {
            throw Errors.badRequest('Video ID is required');
        }

        if (!captions || !Array.isArray(captions) || captions.length === 0) {
            throw Errors.badRequest('Captions array is required and must not be empty');
        }

        // Validate caption format
        for (const caption of captions) {
            if (!caption.text || typeof caption.startTime !== 'number' || typeof caption.endTime !== 'number') {
                throw Errors.badRequest('Invalid caption format. Each caption must have text, startTime, and endTime');
            }
        }

        logger.info('Starting video export', {
            videoId,
            captionCount: captions.length,
            style: style.fontFamily || 'default',
            quality: options.quality || 'high'
        });

        // Start export process
        const result = await exportVideoWithCaptions(videoId, captions, style, options);

        res.status(201).json({
            success: true,
            message: 'Video exported successfully with captions',
            data: {
                export: result
            }
        });
    })
);

/**
 * GET /api/export/status/:exportId
 * Get export status and download info
 */
router.get(
    '/status/:exportId',
    asyncHandler(async (req, res) => {
        const { exportId } = req.params;

        if (!exportId) {
            throw Errors.badRequest('Export ID is required');
        }

        const status = await getExportStatus(exportId);

        if (!status.success) {
            throw Errors.notFound('Export');
        }

        res.json({
            success: true,
            data: {
                export: status
            }
        });
    })
);

/**
 * DELETE /api/export/:exportId
 * Delete exported video file
 */
router.delete(
    '/:exportId',
    asyncHandler(async (req, res) => {
        const { exportId } = req.params;

        if (!exportId) {
            throw Errors.badRequest('Export ID is required');
        }

        const deleted = await deleteExport(exportId);

        if (!deleted) {
            throw Errors.notFound('Export');
        }

        logger.info('Export deleted', { exportId });

        res.json({
            success: true,
            message: 'Export deleted successfully'
        });
    })
);

/**
 * POST /api/export/preview
 * Generate a preview of how captions will look (without full export)
 * Returns a short sample or thumbnail
 */
router.post(
    '/preview',
    asyncHandler(async (req, res) => {
        const { videoId, captions, style = {} } = req.body;

        if (!videoId) {
            throw Errors.badRequest('Video ID is required');
        }

        // For now, return style preview info
        // In the future, this could generate a short preview clip
        res.json({
            success: true,
            message: 'Preview generated',
            data: {
                preview: {
                    videoId,
                    style,
                    captionCount: captions?.length || 0,
                    estimatedFileSize: '~50MB', // Rough estimate
                    estimatedProcessingTime: '2-5 minutes'
                }
            }
        });
    })
);

export default router;