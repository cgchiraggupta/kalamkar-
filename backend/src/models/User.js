/**
 * User Model
 * 
 * Handles user data operations with Supabase
 */

import { supabase, supabaseAdmin } from '../database/supabase.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { ApiError } from '../middleware/errorHandler.js';

export class User {
    constructor(data) {
        this.id = data.id;
        this.email = data.email;
        this.fullName = data.full_name;
        this.avatarUrl = data.avatar_url;
        this.subscriptionTier = data.subscription_tier;
        this.subscriptionExpiresAt = data.subscription_expires_at;
        this.creditsRemaining = data.credits_remaining;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
        this.lastLoginAt = data.last_login_at;
        this.isActive = data.is_active;
        this.emailVerified = data.email_verified;
        this.metadata = data.metadata || {};
    }

    /**
     * Create a new user
     */
    static async create({ email, password, fullName }) {
        try {
            // Hash password
            const saltRounds = 12;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            const { data, error } = await supabase
                .from('users')
                .insert({
                    email: email.toLowerCase(),
                    password_hash: passwordHash,
                    full_name: fullName,
                })
                .select()
                .single();

            if (error) {
                if (error.code === '23505') { // Unique violation
                    throw new ApiError(409, 'Email already exists');
                }
                throw new ApiError(500, 'Failed to create user');
            }

            logger.info('User created successfully', { userId: data.id, email });
            return new User(data);
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error('User creation failed', { error: error.message, email });
            throw new ApiError(500, 'Failed to create user');
        }
    }

    /**
     * Find user by email
     */
    static async findByEmail(email) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email.toLowerCase())
                .eq('is_active', true)
                .single();

            if (error || !data) {
                return null;
            }

            return new User(data);
        } catch (error) {
            logger.error('Failed to find user by email', { error: error.message, email });
            return null;
        }
    }

    /**
     * Find user by ID
     */
    static async findById(id) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .eq('is_active', true)
                .single();

            if (error || !data) {
                return null;
            }

            return new User(data);
        } catch (error) {
            logger.error('Failed to find user by ID', { error: error.message, id });
            return null;
        }
    }

    /**
     * Authenticate user with email and password
     */
    static async authenticate(email, password) {
        try {
            const user = await User.findByEmail(email);
            if (!user) {
                throw new ApiError(401, 'Invalid credentials');
            }

            const isValidPassword = await bcrypt.compare(password, user.passwordHash);
            if (!isValidPassword) {
                throw new ApiError(401, 'Invalid credentials');
            }

            // Update last login
            await user.updateLastLogin();

            return user;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error('Authentication failed', { error: error.message, email });
            throw new ApiError(500, 'Authentication failed');
        }
    }

    /**
     * Generate JWT token for user
     */
    generateToken() {
        return jwt.sign(
            { 
                userId: this.id, 
                email: this.email,
                tier: this.subscriptionTier 
            },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );
    }

    /**
     * Generate refresh token
     */
    generateRefreshToken() {
        return jwt.sign(
            { userId: this.id, type: 'refresh' },
            config.jwt.secret,
            { expiresIn: config.jwt.refreshExpiresIn }
        );
    }

    /**
     * Update last login timestamp
     */
    async updateLastLogin() {
        try {
            const { error } = await supabase
                .from('users')
                .update({ last_login_at: new Date().toISOString() })
                .eq('id', this.id);

            if (error) {
                logger.warn('Failed to update last login', { error: error.message, userId: this.id });
            }
        } catch (error) {
            logger.warn('Failed to update last login', { error: error.message, userId: this.id });
        }
    }

    /**
     * Update user profile
     */
    async updateProfile(updates) {
        try {
            const allowedFields = ['full_name', 'avatar_url', 'metadata'];
            const filteredUpdates = {};

            for (const [key, value] of Object.entries(updates)) {
                if (allowedFields.includes(key)) {
                    filteredUpdates[key] = value;
                }
            }

            const { data, error } = await supabase
                .from('users')
                .update(filteredUpdates)
                .eq('id', this.id)
                .select()
                .single();

            if (error) {
                throw new ApiError(500, 'Failed to update profile');
            }

            // Update instance properties
            Object.assign(this, new User(data));
            
            logger.info('User profile updated', { userId: this.id });
            return this;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error('Profile update failed', { error: error.message, userId: this.id });
            throw new ApiError(500, 'Failed to update profile');
        }
    }

    /**
     * Check if user has enough credits
     */
    hasCredits(requiredCredits) {
        return this.creditsRemaining >= requiredCredits;
    }

    /**
     * Consume user credits
     */
    async consumeCredits(creditsToConsume, description = '') {
        try {
            const { data, error } = await supabase
                .rpc('consume_user_credits', {
                    user_uuid: this.id,
                    credits_to_consume: creditsToConsume
                });

            if (error || !data) {
                throw new ApiError(402, 'Insufficient credits');
            }

            // Update local credits
            this.creditsRemaining -= creditsToConsume;

            logger.info('Credits consumed', { 
                userId: this.id, 
                creditsConsumed: creditsToConsume,
                remainingCredits: this.creditsRemaining,
                description 
            });

            return true;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error('Failed to consume credits', { error: error.message, userId: this.id });
            throw new ApiError(500, 'Failed to process credits');
        }
    }

    /**
     * Get user statistics
     */
    async getStats() {
        try {
            const { data: videoStats, error: videoError } = await supabase
                .from('videos')
                .select('id, duration_seconds, created_at')
                .eq('user_id', this.id);

            const { data: transcriptionStats, error: transcriptionError } = await supabase
                .from('transcription_jobs')
                .select('id, status, credits_used, created_at')
                .eq('user_id', this.id);

            const { data: exportStats, error: exportError } = await supabase
                .from('export_jobs')
                .select('id, status, created_at')
                .eq('user_id', this.id);

            if (videoError || transcriptionError || exportError) {
                throw new Error('Failed to fetch user statistics');
            }

            const totalVideos = videoStats?.length || 0;
            const totalDuration = videoStats?.reduce((sum, video) => sum + (video.duration_seconds || 0), 0) || 0;
            const totalTranscriptions = transcriptionStats?.length || 0;
            const completedTranscriptions = transcriptionStats?.filter(t => t.status === 'completed').length || 0;
            const totalCreditsUsed = transcriptionStats?.reduce((sum, t) => sum + (t.credits_used || 0), 0) || 0;
            const totalExports = exportStats?.length || 0;
            const completedExports = exportStats?.filter(e => e.status === 'completed').length || 0;

            return {
                totalVideos,
                totalDurationMinutes: Math.round(totalDuration / 60),
                totalTranscriptions,
                completedTranscriptions,
                totalCreditsUsed,
                creditsRemaining: this.creditsRemaining,
                totalExports,
                completedExports,
                subscriptionTier: this.subscriptionTier,
                memberSince: this.createdAt
            };
        } catch (error) {
            logger.error('Failed to get user stats', { error: error.message, userId: this.id });
            throw new ApiError(500, 'Failed to get user statistics');
        }
    }

    /**
     * Convert to JSON (exclude sensitive data)
     */
    toJSON() {
        return {
            id: this.id,
            email: this.email,
            fullName: this.fullName,
            avatarUrl: this.avatarUrl,
            subscriptionTier: this.subscriptionTier,
            subscriptionExpiresAt: this.subscriptionExpiresAt,
            creditsRemaining: this.creditsRemaining,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            lastLoginAt: this.lastLoginAt,
            emailVerified: this.emailVerified,
            metadata: this.metadata
        };
    }
}

export default User;