/**
 * Kalakar - Logger Utility
 * 
 * Structured logging with Winston.
 * Never logs sensitive data (passwords, tokens, PII).
 */

import winston from 'winston';
import config from '../config/index.js';

// Custom format for development
const devFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} ${level}: ${message} ${metaStr}`;
    })
);

// Custom format for production (JSON for log aggregation)
const prodFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
    level: config.isDev ? 'debug' : 'info',
    format: config.isProd ? prodFormat : devFormat,
    defaultMeta: { service: 'kalakar-api' },
    transports: [
        new winston.transports.Console(),
    ],
});

// Add file transports in production
if (config.isProd) {
    logger.add(new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error'
    }));
    logger.add(new winston.transports.File({
        filename: 'logs/combined.log'
    }));
}

/**
 * Sanitize object by removing sensitive fields
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
export function sanitizeForLogging(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    const sensitiveFields = [
        'password', 'token', 'accessToken', 'refreshToken',
        'apiKey', 'secret', 'authorization', 'cookie',
    ];

    const sanitized = { ...obj };

    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    }

    return sanitized;
}

export default logger;
