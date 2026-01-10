/**
 * Kalakar - Main Express Server
 * 
 * Production-ready Express server with:
 * - Security headers (Helmet)
 * - CORS with specific origins (no wildcards)
 * - Rate limiting
 * - Comprehensive error handling
 * - Request logging
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

import config from './config/index.js';
import logger from './utils/logger.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { testConnection } from './database/supabase.js';

// Routes
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import videoRoutes from './routes/videoRoutes.js';
import transcriptionRoutes from './routes/transcriptionRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import audioRoutes from './routes/audioRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// ======================
// SECURITY MIDDLEWARE
// ======================

// Helmet - Security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow video loading
}));

// CORS - Specific origins only (NO wildcards per security rules)
const corsOptions = {
    origin: config.isDev
        ? ['http://localhost:3000', 'http://127.0.0.1:3000']
        : [config.frontendUrl],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400, // 24 hours
};
app.use(cors(corsOptions));

// Rate limiting - Global
app.use(globalLimiter);

// ======================
// PARSING & LOGGING
// ======================

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

        logger[logLevel](`${req.method} ${req.path}`, {
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
        });
    });

    next();
});

// ======================
// STATIC FILES
// ======================

// Serve uploaded files
const uploadsPath = path.resolve(config.upload.uploadDir);
app.use('/uploads', express.static(uploadsPath));

// ======================
// API ROUTES
// ======================

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/transcription', transcriptionRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/analytics', analyticsRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'Kalakar API',
        version: '1.0.0',
        description: 'AI-Powered Video Caption Platform',
        docs: '/api/health',
    });
});

// ======================
// ERROR HANDLING
// ======================

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// ======================
// SERVER STARTUP
// ======================

// Test database connection before starting server
async function startServer() {
    try {
        // Test database connection
        const dbConnected = await testConnection();
        if (!dbConnected) {
            logger.error('Failed to connect to database. Server will not start.');
            process.exit(1);
        }

        const server = app.listen(config.port, () => {
            logger.info(`
🎬 Kalakar API Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 URL: http://localhost:${config.port}
🌍 Environment: ${config.nodeEnv}
📁 Uploads: ${uploadsPath}
🔒 CORS: ${corsOptions.origin.join(', ')}
🗄️  Database: Connected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger.info('SIGTERM received, shutting down gracefully...');
            server.close(() => {
                logger.info('Server closed');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            logger.info('SIGINT received, shutting down gracefully...');
            server.close(() => {
                logger.info('Server closed');
                process.exit(0);
            });
        });

    } catch (error) {
        logger.error('Failed to start server', { error: error.message });
        process.exit(1);
    }
}

startServer();

export default app;
