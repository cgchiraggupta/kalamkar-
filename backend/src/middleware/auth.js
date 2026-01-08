/**
 * Authentication Middleware
 * 
 * JWT-based authentication with Supabase integration
 */

import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { User } from '../models/User.js';
import { ApiError } from './errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Verify JWT token and attach user to request
 */
export async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            throw new ApiError(401, 'Access token required');
        }

        // Verify JWT token
        const decoded = jwt.verify(token, config.jwt.secret);
        
        // Get user from database
        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) {
            throw new ApiError(401, 'Invalid or expired token');
        }

        // Attach user to request
        req.user = user;
        req.userId = user.id;

        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            logger.warn('Invalid JWT token', { error: error.message });
            return res.status(401).json({
                success: false,
                error: 'INVALID_TOKEN',
                message: 'Invalid or expired token'
            });
        }

        if (error instanceof ApiError) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.code,
                message: error.message
            });
        }

        logger.error('Authentication error', { error: error.message });
        return res.status(500).json({
            success: false,
            error: 'AUTH_ERROR',
            message: 'Authentication failed'
        });
    }
}

/**
 * Optional authentication - doesn't fail if no token provided
 */
export async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, config.jwt.secret);
            const user = await User.findById(decoded.userId);
            
            if (user && user.isActive) {
                req.user = user;
                req.userId = user.id;
            }
        }

        next();
    } catch (error) {
        // Continue without authentication for optional auth
        next();
    }
}

/**
 * Check if user has required subscription tier
 */
export function requireSubscription(requiredTier) {
    const tierLevels = {
        'free': 0,
        'creator': 1,
        'business': 2
    };

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'AUTHENTICATION_REQUIRED',
                message: 'Authentication required'
            });
        }

        const userLevel = tierLevels[req.user.subscriptionTier] || 0;
        const requiredLevel = tierLevels[requiredTier] || 0;

        if (userLevel < requiredLevel) {
            return res.status(403).json({
                success: false,
                error: 'SUBSCRIPTION_REQUIRED',
                message: `${requiredTier} subscription required`,
                data: {
                    currentTier: req.user.subscriptionTier,
                    requiredTier
                }
            });
        }

        next();
    };
}

/**
 * Check if user has enough credits
 */
export function requireCredits(creditsRequired) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'AUTHENTICATION_REQUIRED',
                message: 'Authentication required'
            });
        }

        if (!req.user.hasCredits(creditsRequired)) {
            return res.status(402).json({
                success: false,
                error: 'INSUFFICIENT_CREDITS',
                message: 'Insufficient credits',
                data: {
                    required: creditsRequired,
                    available: req.user.creditsRemaining
                }
            });
        }

        next();
    };
}

/**
 * Demo user middleware - creates temporary user for demo purposes
 */
export async function demoAuth(req, res, next) {
    try {
        // Create or get demo user
        let user = await User.findByEmail('demo@kalakar.ai');
        
        if (!user) {
            user = await User.create({
                email: 'demo@kalakar.ai',
                password: 'demo123',
                fullName: 'Demo User'
            });
        }

        req.user = user;
        req.userId = user.id;
        req.isDemo = true;

        next();
    } catch (error) {
        logger.error('Demo auth failed', { error: error.message });
        return res.status(500).json({
            success: false,
            error: 'DEMO_AUTH_FAILED',
            message: 'Demo authentication failed'
        });
    }
}

export default {
    authenticateToken,
    optionalAuth,
    requireSubscription,
    requireCredits,
    demoAuth
};