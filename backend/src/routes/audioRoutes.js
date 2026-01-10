/**
 * Kalakar - Audio Enhancement Routes
 *
 * API endpoints for audio enhancement features
 */

import { Router } from 'express';
import { enhanceAudio, analyzeAudio, getEnhancementPresets } from '../services/audioEnhancementService.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler, Errors } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * GET /api/audio/presets
 * Get available enhancement presets
 */
router.get(
    '/presets',
    asyncHandler(async (req, res) => {
        const presets = getEnhancementPresets();

        res.json({
            success: true,
            data: { presets }
        });
    })
);

/**
 * POST /api/audio/analyze
 * Analyze audio levels in a video
 */
router.post(
    '/analyze',
    asyncHandler(async (req, res) => {
        const { videoId } = req.body;

        if (!videoId) {
            throw Errors.badRequest('Video ID is required');
        }

        const result = await analyzeAudio(videoId);

        res.json({
            success: true,
            data: result
        });
    })
);

/**
 * POST /api/audio/enhance
 * Enhance audio in a video
 *
 * Body: {
 *   videoId: string,
 *   options?: {
 *     noiseReduction?: 'light' | 'medium' | 'heavy',
 *     normalize?: boolean,
 *     normalizePreset?: 'standard' | 'podcast' | 'broadcast',
 *     voiceClarity?: 'light' | 'medium' | 'heavy',
 *     applyNoise?: boolean,
 *     applyClarity?: boolean
 *   }
 * }
 */
router.post(
    '/enhance',
    uploadLimiter,
    asyncHandler(async (req, res) => {
        const { videoId, options = {} } = req.body;

        if (!videoId) {
            throw Errors.badRequest('Video ID is required');
        }

        // Validate options
        const validNoiseReduction = ['light', 'medium', 'heavy'];
        const validNormalizePresets = ['standard', 'podcast', 'broadcast'];
        const validClarity = ['light', 'medium', 'heavy'];

        if (options.noiseReduction && !validNoiseReduction.includes(options.noiseReduction)) {
            throw Errors.badRequest(`Invalid noiseReduction. Valid: ${validNoiseReduction.join(', ')}`);
        }

        if (options.normalizePreset && !validNormalizePresets.includes(options.normalizePreset)) {
            throw Errors.badRequest(`Invalid normalizePreset. Valid: ${validNormalizePresets.join(', ')}`);
        }

        if (options.voiceClarity && !validClarity.includes(options.voiceClarity)) {
            throw Errors.badRequest(`Invalid voiceClarity. Valid: ${validClarity.join(', ')}`);
        }

        logger.info('Starting audio enhancement request', {
            videoId,
            options
        });

        const result = await enhanceAudio(videoId, options);

        res.status(201).json({
            success: true,
            message: 'Audio enhanced successfully',
            data: result
        });
    })
);

/**
 * POST /api/audio/quick-enhance
 * Apply recommended enhancements automatically
 */
router.post(
    '/quick-enhance',
    uploadLimiter,
    asyncHandler(async (req, res) => {
        const { videoId, preset = 'balanced' } = req.body;

        if (!videoId) {
            throw Errors.badRequest('Video ID is required');
        }

        // Preset configurations
        const presetConfigs = {
            balanced: {
                noiseReduction: 'medium',
                normalize: true,
                normalizePreset: 'standard',
                voiceClarity: 'medium',
                applyNoise: true,
                applyClarity: true
            },
            podcast: {
                noiseReduction: 'heavy',
                normalize: true,
                normalizePreset: 'podcast',
                voiceClarity: 'heavy',
                applyNoise: true,
                applyClarity: true
            },
            music: {
                noiseReduction: 'light',
                normalize: true,
                normalizePreset: 'standard',
                voiceClarity: 'light',
                applyNoise: true,
                applyClarity: false
            },
            clean: {
                noiseReduction: 'heavy',
                normalize: false,
                voiceClarity: 'light',
                applyNoise: true,
                applyClarity: false
            }
        };

        const options = presetConfigs[preset] || presetConfigs.balanced;

        logger.info('Quick audio enhancement request', {
            videoId,
            preset,
            options
        });

        const result = await enhanceAudio(videoId, options);

        res.status(201).json({
            success: true,
            message: `Audio enhanced with ${preset} preset`,
            data: result
        });
    })
);

export default router;
