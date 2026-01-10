/**
 * Kalakar - Email Verification Routes
 *
 * API endpoints for email verification
 */

import { Router } from 'express';
import {
    sendVerificationEmail,
    verifyEmailToken,
    resendVerificationEmail,
    sendPasswordResetEmail,
    isEmailConfigured,
} from '../services/emailService.js';
import { asyncHandler, Errors } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';
import { User } from '../models/User.js';
import bcrypt from 'bcryptjs';
import { supabase } from '../database/supabase.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * GET /api/email/status
 * Check if email service is configured
 */
router.get(
    '/status',
    asyncHandler(async (req, res) => {
        res.json({
            success: true,
            data: {
                configured: isEmailConfigured(),
            },
        });
    })
);

/**
 * POST /api/email/verify
 * Verify email with token
 */
router.post(
    '/verify',
    asyncHandler(async (req, res) => {
        const { token } = req.body;

        if (!token) {
            throw Errors.badRequest('Verification token is required');
        }

        const result = await verifyEmailToken(token);

        res.json({
            success: true,
            message: 'Email verified successfully',
            data: result,
        });
    })
);

/**
 * POST /api/email/resend
 * Resend verification email
 */
router.post(
    '/resend',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const user = req.user;

        if (user.emailVerified) {
            return res.json({
                success: true,
                message: 'Email is already verified',
            });
        }

        const result = await resendVerificationEmail(user.id, user.email, user.fullName);

        if (result.success) {
            res.json({
                success: true,
                message: 'Verification email sent',
            });
        } else {
            throw Errors.internal('Failed to send verification email');
        }
    })
);

/**
 * POST /api/email/forgot-password
 * Request password reset email
 */
router.post(
    '/forgot-password',
    asyncHandler(async (req, res) => {
        const { email } = req.body;

        if (!email) {
            throw Errors.badRequest('Email is required');
        }

        // Find user by email
        const user = await User.findByEmail(email);

        // Always return success to prevent email enumeration
        if (!user) {
            return res.json({
                success: true,
                message: 'If an account exists with this email, you will receive a password reset link',
            });
        }

        await sendPasswordResetEmail(user.id, user.email, user.fullName);

        res.json({
            success: true,
            message: 'If an account exists with this email, you will receive a password reset link',
        });
    })
);

/**
 * POST /api/email/reset-password
 * Reset password with token
 */
router.post(
    '/reset-password',
    asyncHandler(async (req, res) => {
        const { token, password } = req.body;

        if (!token || !password) {
            throw Errors.badRequest('Token and new password are required');
        }

        if (password.length < 8) {
            throw Errors.badRequest('Password must be at least 8 characters');
        }

        // Verify token
        const { data: verification, error } = await supabase
            .from('email_verifications')
            .select('*')
            .eq('token', token)
            .eq('type', 'password_reset')
            .single();

        if (error || !verification) {
            throw Errors.badRequest('Invalid or expired reset token');
        }

        if (new Date(verification.expires_at) < new Date()) {
            throw Errors.badRequest('Reset token has expired');
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(password, 12);

        // Update password
        await supabase
            .from('users')
            .update({ password_hash: passwordHash })
            .eq('id', verification.user_id);

        // Delete used token
        await supabase
            .from('email_verifications')
            .delete()
            .eq('id', verification.id);

        logger.info('Password reset successfully', { userId: verification.user_id });

        res.json({
            success: true,
            message: 'Password reset successfully',
        });
    })
);

export default router;
