/**
 * Kalakar - Error Handler Middleware
 * 
 * Global error handling with:
 * - Secure error responses (no stack traces to clients)
 * - Detailed server-side logging
 * - Proper HTTP status codes
 */

import logger from '../utils/logger.js';
import config from '../config/index.js';

/**
 * Custom API Error class for throwing structured errors
 */
export class ApiError extends Error {
    constructor(statusCode, message, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Common error factory methods
 */
export const Errors = {
    badRequest: (message = 'Bad request', details = null) =>
        new ApiError(400, message, details),

    unauthorized: (message = 'Authentication required') =>
        new ApiError(401, message),

    forbidden: (message = 'Access denied') =>
        new ApiError(403, message),

    notFound: (resource = 'Resource') =>
        new ApiError(404, `${resource} not found`),

    conflict: (message = 'Resource already exists') =>
        new ApiError(409, message),

    tooManyRequests: (message = 'Too many requests') =>
        new ApiError(429, message),

    internal: (message = 'Internal server error') =>
        new ApiError(500, message),

    serviceUnavailable: (message = 'Service temporarily unavailable') =>
        new ApiError(503, message),
};

/**
 * 404 Not Found handler for undefined routes
 */
export function notFoundHandler(req, res, next) {
    const error = Errors.notFound('Endpoint');
    next(error);
}

/**
 * Global error handler middleware
 * Must be the LAST middleware registered
 */
export function errorHandler(err, req, res, next) {
    // Default to 500 if no status code set
    const statusCode = err.statusCode || 500;

    // Log error details server-side
    const logData = {
        statusCode,
        message: err.message,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userId: req.user?.id,
    };

    // Log stack trace for server errors
    if (statusCode >= 500) {
        logger.error('Server error', { ...logData, stack: err.stack });
    } else if (statusCode >= 400) {
        logger.warn('Client error', logData);
    }

    // Prepare client response (NEVER expose stack traces)
    const response = {
        success: false,
        error: getErrorType(statusCode),
        message: statusCode >= 500 && config.isProd
            ? 'An unexpected error occurred. Please try again later.'
            : err.message,
    };

    // Add details for 400 errors (validation errors, etc.)
    if (err.details && statusCode === 400) {
        response.details = err.details;
    }

    // Add request ID for tracking in production
    if (config.isProd && req.id) {
        response.requestId = req.id;
    }

    res.status(statusCode).json(response);
}

/**
 * Get error type string from status code
 */
function getErrorType(statusCode) {
    const errorTypes = {
        400: 'BAD_REQUEST',
        401: 'UNAUTHORIZED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        409: 'CONFLICT',
        429: 'TOO_MANY_REQUESTS',
        500: 'INTERNAL_ERROR',
        503: 'SERVICE_UNAVAILABLE',
    };
    return errorTypes[statusCode] || 'ERROR';
}

/**
 * Async handler wrapper to catch promise rejections
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
