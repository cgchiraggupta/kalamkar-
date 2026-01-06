/**
 * Kalakar - Health Check Routes
 * 
 * Endpoints for monitoring application health
 */

import { Router } from 'express';
import os from 'os';

const router = Router();

/**
 * GET /api/health
 * Basic health check endpoint
 */
router.get('/', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
    });
});

/**
 * GET /api/health/detailed
 * Detailed health check with system info
 */
router.get('/detailed', (req, res) => {
    const memoryUsage = process.memoryUsage();

    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        system: {
            platform: os.platform(),
            nodeVersion: process.version,
            memory: {
                total: formatBytes(os.totalmem()),
                free: formatBytes(os.freemem()),
                heapUsed: formatBytes(memoryUsage.heapUsed),
                heapTotal: formatBytes(memoryUsage.heapTotal),
            },
            cpuCount: os.cpus().length,
            loadAvg: os.loadavg(),
        },
        services: {
            database: 'not_configured', // TODO: Add actual DB check
            storage: 'local',
            transcription: 'not_configured', // TODO: Add AI service check
        },
    });
});

function formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

export default router;
