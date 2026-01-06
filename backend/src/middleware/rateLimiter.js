/**
 * Kalakar - Rate Limiting Middleware
 * 
 * Implements multiple layers of rate limiting:
 * - Global rate limit for all requests
 * - Stricter limits for sensitive endpoints (auth, upload)
 * - Returns proper 429 status with retry information
 */

import rateLimit from 'express-rate-limit';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Global rate limiter - applies to all routes
 */
export const globalLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
        success: false,
        error: 'Too many requests',
        message: 'You have exceeded the rate limit. Please try again later.',
        retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn('Rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            method: req.method,
        });
        res.status(429).json(options.message);
    },
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per minute to prevent brute force
 */
export const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: {
        success: false,
        error: 'Too many authentication attempts',
        message: 'Please wait before trying again.',
        retryAfter: 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn('Auth rate limit exceeded', {
            ip: req.ip,
            path: req.path,
        });
        res.status(429).json(options.message);
    },
});

/**
 * Upload rate limiter
 * 10 uploads per hour per IP
 */
export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: {
        success: false,
        error: 'Upload limit exceeded',
        message: 'You can upload up to 10 videos per hour. Please try again later.',
        retryAfter: 3600,
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn('Upload rate limit exceeded', {
            ip: req.ip,
        });
        res.status(429).json(options.message);
    },
});

/**
 * Transcription rate limiter
 * 5 transcription requests per 15 minutes
 */
export const transcriptionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        success: false,
        error: 'Transcription limit exceeded',
        message: 'Transcription is resource-intensive. Please wait before your next request.',
        retryAfter: 900,
    },
    standardHeaders: true,
    legacyHeaders: false,
});
