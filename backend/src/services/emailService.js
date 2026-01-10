/**
 * Kalakar - Email Service (Resend)
 *
 * Handles email sending with Resend:
 * - Email verification
 * - Password reset
 * - Welcome emails
 * - Payment receipts
 */

import { Resend } from 'resend';
import crypto from 'crypto';
import config from '../config/index.js';
import { supabase } from '../database/supabase.js';
import logger from '../utils/logger.js';
import { ApiError } from '../middleware/errorHandler.js';

// Initialize Resend
let resend = null;

function getResend() {
    if (!resend && config.email.resendApiKey) {
        resend = new Resend(config.email.resendApiKey);
    }
    return resend;
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured() {
    return !!config.email.resendApiKey;
}

/**
 * Generate verification token
 */
function generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(userId, email, name) {
    const client = getResend();
    if (!client) {
        logger.warn('Email service not configured, skipping verification email');
        return { success: false, reason: 'Email service not configured' };
    }

    try {
        // Generate verification token
        const token = generateVerificationToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Store token in database
        await supabase.from('email_verifications').upsert({
            user_id: userId,
            token,
            expires_at: expiresAt.toISOString(),
            type: 'email_verification',
        });

        const verificationUrl = `${config.frontendUrl}/verify-email?token=${token}`;

        const { data, error } = await client.emails.send({
            from: `${config.email.fromName} <${config.email.fromEmail}>`,
            to: email,
            subject: 'Verify your Kalakar account',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #333;">
                            <h1 style="color: #fff; margin: 0 0 20px; font-size: 24px;">Welcome to Kalakar! 🎬</h1>

                            <p style="color: #aaa; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                                Hi ${name || 'there'},<br><br>
                                Thanks for signing up! Please verify your email address to get started with AI-powered video captions.
                            </p>

                            <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6, #EC4899); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                                Verify Email Address
                            </a>

                            <p style="color: #666; font-size: 14px; margin: 32px 0 0;">
                                This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
                            </p>

                            <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;">

                            <p style="color: #666; font-size: 12px; margin: 0;">
                                Kalakar - AI Video Caption Platform for Indian Creators
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `,
        });

        if (error) {
            logger.error('Failed to send verification email', { error: error.message, userId });
            throw new Error(error.message);
        }

        logger.info('Verification email sent', { userId, email, messageId: data.id });
        return { success: true, messageId: data.id };
    } catch (error) {
        logger.error('Failed to send verification email', { error: error.message, userId });
        return { success: false, reason: error.message };
    }
}

/**
 * Verify email token
 */
export async function verifyEmailToken(token) {
    try {
        const { data, error } = await supabase
            .from('email_verifications')
            .select('*, users(*)')
            .eq('token', token)
            .eq('type', 'email_verification')
            .single();

        if (error || !data) {
            throw new ApiError(400, 'Invalid or expired verification token');
        }

        // Check if token is expired
        if (new Date(data.expires_at) < new Date()) {
            throw new ApiError(400, 'Verification token has expired');
        }

        // Mark email as verified
        await supabase
            .from('users')
            .update({ email_verified: true })
            .eq('id', data.user_id);

        // Delete used token
        await supabase
            .from('email_verifications')
            .delete()
            .eq('id', data.id);

        logger.info('Email verified successfully', { userId: data.user_id });

        return {
            success: true,
            userId: data.user_id,
            email: data.users?.email,
        };
    } catch (error) {
        if (error instanceof ApiError) throw error;
        logger.error('Email verification failed', { error: error.message });
        throw new ApiError(500, 'Email verification failed');
    }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(userId, email, name) {
    const client = getResend();
    if (!client) {
        throw new ApiError(503, 'Email service not available');
    }

    try {
        const token = generateVerificationToken();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await supabase.from('email_verifications').upsert({
            user_id: userId,
            token,
            expires_at: expiresAt.toISOString(),
            type: 'password_reset',
        });

        const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;

        const { data, error } = await client.emails.send({
            from: `${config.email.fromName} <${config.email.fromEmail}>`,
            to: email,
            subject: 'Reset your Kalakar password',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #333;">
                            <h1 style="color: #fff; margin: 0 0 20px; font-size: 24px;">Reset Your Password</h1>

                            <p style="color: #aaa; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                                Hi ${name || 'there'},<br><br>
                                We received a request to reset your password. Click the button below to set a new password.
                            </p>

                            <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6, #EC4899); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                                Reset Password
                            </a>

                            <p style="color: #666; font-size: 14px; margin: 32px 0 0;">
                                This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
                            </p>

                            <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;">

                            <p style="color: #666; font-size: 12px; margin: 0;">
                                Kalakar - AI Video Caption Platform for Indian Creators
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `,
        });

        if (error) throw new Error(error.message);

        logger.info('Password reset email sent', { userId, email });
        return { success: true, messageId: data.id };
    } catch (error) {
        logger.error('Failed to send password reset email', { error: error.message, userId });
        throw new ApiError(500, 'Failed to send password reset email');
    }
}

/**
 * Send welcome email after verification
 */
export async function sendWelcomeEmail(email, name) {
    const client = getResend();
    if (!client) return;

    try {
        await client.emails.send({
            from: `${config.email.fromName} <${config.email.fromEmail}>`,
            to: email,
            subject: 'Welcome to Kalakar! 🎬 Get started with your free credits',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #333;">
                            <h1 style="color: #fff; margin: 0 0 20px; font-size: 24px;">You're all set! 🎉</h1>

                            <p style="color: #aaa; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                                Hi ${name || 'there'},<br><br>
                                Your email is verified and you're ready to start creating amazing captions! You have <strong style="color: #8B5CF6;">600 free credits</strong> (10 minutes of video).
                            </p>

                            <h2 style="color: #fff; font-size: 18px; margin: 24px 0 16px;">Quick Start Guide:</h2>

                            <ol style="color: #aaa; font-size: 14px; line-height: 1.8; margin: 0 0 24px; padding-left: 20px;">
                                <li>Upload your video (MP4, MOV, or WebM)</li>
                                <li>Click "Generate Captions" - AI does the rest!</li>
                                <li>Choose a style from 50+ templates</li>
                                <li>Export your video with burned-in captions</li>
                            </ol>

                            <a href="${config.frontendUrl}/editor" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6, #EC4899); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                                Start Creating
                            </a>

                            <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;">

                            <p style="color: #666; font-size: 12px; margin: 0;">
                                Questions? Reply to this email - we're here to help!
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `,
        });

        logger.info('Welcome email sent', { email });
    } catch (error) {
        logger.warn('Failed to send welcome email', { error: error.message, email });
    }
}

/**
 * Send payment receipt email
 */
export async function sendPaymentReceiptEmail(email, name, paymentDetails) {
    const client = getResend();
    if (!client) return;

    try {
        const { planName, amount, currency, credits, paymentId, date } = paymentDetails;

        await client.emails.send({
            from: `${config.email.fromName} <${config.email.fromEmail}>`,
            to: email,
            subject: `Payment Receipt - ${planName || 'Credit Purchase'}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #333;">
                            <h1 style="color: #fff; margin: 0 0 20px; font-size: 24px;">Payment Receipt</h1>

                            <p style="color: #aaa; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                                Hi ${name || 'there'},<br><br>
                                Thank you for your purchase! Here are your payment details:
                            </p>

                            <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin: 24px 0;">
                                <table style="width: 100%; color: #aaa; font-size: 14px;">
                                    <tr>
                                        <td style="padding: 8px 0;">Item:</td>
                                        <td style="padding: 8px 0; text-align: right; color: #fff;">${planName || 'Credit Pack'}</td>
                                    </tr>
                                    ${credits ? `
                                    <tr>
                                        <td style="padding: 8px 0;">Credits:</td>
                                        <td style="padding: 8px 0; text-align: right; color: #fff;">${credits}</td>
                                    </tr>
                                    ` : ''}
                                    <tr>
                                        <td style="padding: 8px 0;">Amount:</td>
                                        <td style="padding: 8px 0; text-align: right; color: #8B5CF6; font-weight: 600;">₹${amount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0;">Date:</td>
                                        <td style="padding: 8px 0; text-align: right; color: #fff;">${new Date(date).toLocaleDateString()}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0;">Payment ID:</td>
                                        <td style="padding: 8px 0; text-align: right; color: #fff; font-family: monospace; font-size: 12px;">${paymentId}</td>
                                    </tr>
                                </table>
                            </div>

                            <a href="${config.frontendUrl}/editor" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6, #EC4899); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                                Continue Creating
                            </a>

                            <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;">

                            <p style="color: #666; font-size: 12px; margin: 0;">
                                Keep this email for your records. Questions? Contact support@kalakar.app
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `,
        });

        logger.info('Payment receipt email sent', { email, paymentId });
    } catch (error) {
        logger.warn('Failed to send payment receipt email', { error: error.message, email });
    }
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(userId, email, name) {
    // Delete existing verification tokens
    await supabase
        .from('email_verifications')
        .delete()
        .eq('user_id', userId)
        .eq('type', 'email_verification');

    // Send new verification email
    return sendVerificationEmail(userId, email, name);
}
