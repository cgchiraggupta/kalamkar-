/**
 * Kalakar - Analytics Routes
 *
 * API endpoints for analytics and usage tracking:
 * - Get usage summary
 * - Get usage history
 * - Get usage statistics
 * - Get transcription analytics
 * - Get export analytics
 */

import { Router } from 'express';
import { demoAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
    getUserSummary,
    getUsageHistory,
    getUsageStats,
    getTranscriptionAnalytics,
    getExportAnalytics
} from '../services/analyticsService.js';

const router = Router();

/**
 * GET /api/analytics/summary
 * Get user's usage summary
 */
router.get(
    '/summary',
    demoAuth,
    asyncHandler(async (req, res) => {
        const summary = await getUserSummary(req.userId);

        res.json({
            success: true,
            data: summary
        });
    })
);

/**
 * GET /api/analytics/history
 * Get usage history
 */
router.get(
    '/history',
    demoAuth,
    asyncHandler(async (req, res) => {
        const {
            limit = 50,
            offset = 0,
            action,
            startDate,
            endDate
        } = req.query;

        const history = await getUsageHistory(req.userId, {
            limit: parseInt(limit),
            offset: parseInt(offset),
            action,
            startDate,
            endDate
        });

        res.json({
            success: true,
            data: {
                history,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    count: history.length
                }
            }
        });
    })
);

/**
 * GET /api/analytics/stats
 * Get usage statistics over time
 */
router.get(
    '/stats',
    demoAuth,
    asyncHandler(async (req, res) => {
        const { period = 'day', days = 30 } = req.query;

        const stats = await getUsageStats(req.userId, period, parseInt(days));

        res.json({
            success: true,
            data: stats
        });
    })
);

/**
 * GET /api/analytics/transcriptions
 * Get transcription analytics
 */
router.get(
    '/transcriptions',
    demoAuth,
    asyncHandler(async (req, res) => {
        const { days = 30 } = req.query;

        const analytics = await getTranscriptionAnalytics(req.userId, parseInt(days));

        res.json({
            success: true,
            data: analytics
        });
    })
);

/**
 * GET /api/analytics/exports
 * Get export analytics
 */
router.get(
    '/exports',
    demoAuth,
    asyncHandler(async (req, res) => {
        const { days = 30 } = req.query;

        const analytics = await getExportAnalytics(req.userId, parseInt(days));

        res.json({
            success: true,
            data: analytics
        });
    })
);

/**
 * GET /api/analytics/dashboard
 * Get all dashboard data in one call
 */
router.get(
    '/dashboard',
    demoAuth,
    asyncHandler(async (req, res) => {
        const { days = 30 } = req.query;
        const daysInt = parseInt(days);

        // Fetch all analytics in parallel
        const [summary, stats, transcriptions, exports] = await Promise.all([
            getUserSummary(req.userId),
            getUsageStats(req.userId, 'day', daysInt),
            getTranscriptionAnalytics(req.userId, daysInt),
            getExportAnalytics(req.userId, daysInt)
        ]);

        res.json({
            success: true,
            data: {
                summary,
                stats,
                transcriptions,
                exports,
                period: {
                    days: daysInt,
                    startDate: new Date(Date.now() - daysInt * 24 * 60 * 60 * 1000).toISOString(),
                    endDate: new Date().toISOString()
                }
            }
        });
    })
);

export default router;
