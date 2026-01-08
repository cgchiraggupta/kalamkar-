/**
 * Authentication Routes
 * 
 * User registration, login, and profile management
 */

import { Router } from 'express';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler, Errors } from '../middleware/errorHandler.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const router = Router();

// Validation schemas
const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    fullName: Joi.string().min(2).max(100).required()
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

const updateProfileSchema = Joi.object({
    fullName: Joi.string().min(2).max(100),
    avatarUrl: Joi.string().uri().allow(''),
    metadata: Joi.object()
});

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', asyncHandler(async (req, res) => {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
        throw Errors.badRequest(error.details[0].message);
    }

    const { email, password, fullName } = value;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
        throw Errors.conflict('Email already registered');
    }

    // Create user
    const user = await User.create({ email, password, fullName });

    // Generate tokens
    const accessToken = user.generateToken();
    const refreshToken = user.generateRefreshToken();

    logger.info('User registered successfully', { userId: user.id, email });

    res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
            user: user.toJSON(),
            accessToken,
            refreshToken
        }
    });
}));

/**
 * POST /api/auth/login
 * Authenticate user
 */
router.post('/login', asyncHandler(async (req, res) => {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
        throw Errors.badRequest(error.details[0].message);
    }

    const { email, password } = value;

    // Authenticate user
    const user = await User.authenticate(email, password);

    // Generate tokens
    const accessToken = user.generateToken();
    const refreshToken = user.generateRefreshToken();

    logger.info('User logged in successfully', { userId: user.id, email });

    res.json({
        success: true,
        message: 'Login successful',
        data: {
            user: user.toJSON(),
            accessToken,
            refreshToken
        }
    });
}));

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        throw Errors.badRequest('Refresh token required');
    }

    try {
        const decoded = jwt.verify(refreshToken, config.jwt.secret);
        
        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }

        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) {
            throw Errors.unauthorized('Invalid refresh token');
        }

        // Generate new access token
        const accessToken = user.generateToken();

        res.json({
            success: true,
            data: { accessToken }
        });
    } catch (error) {
        throw Errors.unauthorized('Invalid refresh token');
    }
}));

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
    const stats = await req.user.getStats();

    res.json({
        success: true,
        data: {
            user: req.user.toJSON(),
            stats
        }
    });
}));

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authenticateToken, asyncHandler(async (req, res) => {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
        throw Errors.badRequest(error.details[0].message);
    }

    const updatedUser = await req.user.updateProfile(value);

    logger.info('User profile updated', { userId: req.user.id });

    res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
            user: updatedUser.toJSON()
        }
    });
}));

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
    logger.info('User logged out', { userId: req.user.id });

    res.json({
        success: true,
        message: 'Logged out successfully'
    });
}));

/**
 * DELETE /api/auth/account
 * Delete user account
 */
router.delete('/account', authenticateToken, asyncHandler(async (req, res) => {
    const { password } = req.body;

    if (!password) {
        throw Errors.badRequest('Password required for account deletion');
    }

    // Verify password
    const user = await User.authenticate(req.user.email, password);

    // TODO: Implement account deletion logic
    // This should include deleting all user data, videos, transcriptions, etc.
    
    logger.info('Account deletion requested', { userId: req.user.id });

    res.json({
        success: true,
        message: 'Account deletion initiated. This feature is not yet implemented.'
    });
}));

export default router;