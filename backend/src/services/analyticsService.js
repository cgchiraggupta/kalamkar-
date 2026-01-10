/**
 * Kalakar - Analytics Service
 *
 * Handles usage tracking and analytics:
 * - Track user actions
 * - Get usage statistics
 * - Generate reports
 */

import { supabase } from '../database/supabase.js';
import logger from '../utils/logger.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * Track a user action
 */
export async function trackAction(userId, action, resourceType, resourceId = null, metadata = {}) {
    try {
        await supabase.from('usage_analytics').insert({
            user_id: userId,
            action,
            resource_type: resourceType,
            resource_id: resourceId,
            credits_consumed: metadata.creditsConsumed || 0,
            processing_time_ms: metadata.processingTimeMs || null,
            success: metadata.success !== false,
            error_code: metadata.errorCode || null,
            ip_address: metadata.ipAddress || null,
            user_agent: metadata.userAgent || null,
            metadata: metadata.extra || {}
        });

        logger.debug('Action tracked', { userId, action, resourceType, resourceId });
    } catch (error) {
        // Don't throw - analytics should not break the main flow
        logger.warn('Failed to track action', { error: error.message, userId, action });
    }
}

/**
 * Get user's usage summary
 */
export async function getUserSummary(userId) {
    try {
        // Get user info
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('credits_remaining, subscription_tier, created_at')
            .eq('id', userId)
            .single();

        if (userError) throw userError;

        // Get video count
        const { count: videoCount } = await supabase
            .from('videos')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        // Get transcription count and total words
        const { data: transcriptions } = await supabase
            .from('transcription_jobs')
            .select('word_count, credits_used, status')
            .eq('user_id', userId);

        const completedTranscriptions = transcriptions?.filter(t => t.status === 'completed') || [];
        const totalWords = completedTranscriptions.reduce((sum, t) => sum + (t.word_count || 0), 0);
        const totalCreditsUsed = transcriptions?.reduce((sum, t) => sum + (t.credits_used || 0), 0) || 0;

        // Get export count
        const { count: exportCount } = await supabase
            .from('export_jobs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'completed');

        // Get project count
        const { count: projectCount } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        return {
            creditsRemaining: user?.credits_remaining || 0,
            creditsUsed: totalCreditsUsed,
            subscriptionTier: user?.subscription_tier || 'free',
            memberSince: user?.created_at,
            videoCount: videoCount || 0,
            transcriptionCount: completedTranscriptions.length,
            exportCount: exportCount || 0,
            projectCount: projectCount || 0,
            totalWords
        };
    } catch (error) {
        logger.error('Failed to get user summary', { error: error.message, userId });
        throw new ApiError(500, 'Failed to get user summary');
    }
}

/**
 * Get usage history for a user
 */
export async function getUsageHistory(userId, options = {}) {
    try {
        const { limit = 50, offset = 0, action = null, startDate = null, endDate = null } = options;

        let query = supabase
            .from('usage_analytics')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (action) {
            query = query.eq('action', action);
        }

        if (startDate) {
            query = query.gte('created_at', startDate);
        }

        if (endDate) {
            query = query.lte('created_at', endDate);
        }

        const { data, error } = await query;

        if (error) throw error;

        return data || [];
    } catch (error) {
        logger.error('Failed to get usage history', { error: error.message, userId });
        throw new ApiError(500, 'Failed to get usage history');
    }
}

/**
 * Get usage statistics grouped by time period
 */
export async function getUsageStats(userId, period = 'day', days = 30) {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data: analytics, error } = await supabase
            .from('usage_analytics')
            .select('action, credits_consumed, created_at, success')
            .eq('user_id', userId)
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Group by date
        const groupedData = {};
        const actionCounts = {};

        (analytics || []).forEach(item => {
            const date = new Date(item.created_at);
            let key;

            if (period === 'hour') {
                key = `${date.toISOString().split('T')[0]}T${date.getHours()}:00`;
            } else if (period === 'day') {
                key = date.toISOString().split('T')[0];
            } else if (period === 'week') {
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                key = weekStart.toISOString().split('T')[0];
            } else {
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            }

            if (!groupedData[key]) {
                groupedData[key] = {
                    date: key,
                    actions: 0,
                    creditsUsed: 0,
                    successRate: { success: 0, total: 0 }
                };
            }

            groupedData[key].actions++;
            groupedData[key].creditsUsed += item.credits_consumed || 0;
            groupedData[key].successRate.total++;
            if (item.success) groupedData[key].successRate.success++;

            // Count actions
            actionCounts[item.action] = (actionCounts[item.action] || 0) + 1;
        });

        // Convert to array and calculate success rates
        const timeline = Object.values(groupedData).map(item => ({
            ...item,
            successRate: item.successRate.total > 0
                ? Math.round((item.successRate.success / item.successRate.total) * 100)
                : 100
        }));

        // Top actions
        const topActions = Object.entries(actionCounts)
            .map(([action, count]) => ({ action, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Total stats
        const totalActions = analytics?.length || 0;
        const totalCredits = (analytics || []).reduce((sum, a) => sum + (a.credits_consumed || 0), 0);
        const successfulActions = (analytics || []).filter(a => a.success).length;

        return {
            timeline,
            topActions,
            summary: {
                totalActions,
                totalCredits,
                averageCreditsPerDay: days > 0 ? Math.round(totalCredits / days) : 0,
                successRate: totalActions > 0 ? Math.round((successfulActions / totalActions) * 100) : 100
            }
        };
    } catch (error) {
        logger.error('Failed to get usage stats', { error: error.message, userId });
        throw new ApiError(500, 'Failed to get usage stats');
    }
}

/**
 * Get transcription analytics
 */
export async function getTranscriptionAnalytics(userId, days = 30) {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabase
            .from('transcription_jobs')
            .select('language_code, status, word_count, credits_used, processing_time_seconds, accuracy_score, created_at')
            .eq('user_id', userId)
            .gte('created_at', startDate.toISOString());

        if (error) throw error;

        const completed = (data || []).filter(t => t.status === 'completed');
        const failed = (data || []).filter(t => t.status === 'failed');

        // Language breakdown
        const languageBreakdown = {};
        completed.forEach(t => {
            const lang = t.language_code || 'unknown';
            if (!languageBreakdown[lang]) {
                languageBreakdown[lang] = { count: 0, words: 0, credits: 0 };
            }
            languageBreakdown[lang].count++;
            languageBreakdown[lang].words += t.word_count || 0;
            languageBreakdown[lang].credits += t.credits_used || 0;
        });

        const languages = Object.entries(languageBreakdown)
            .map(([code, stats]) => ({ code, ...stats }))
            .sort((a, b) => b.count - a.count);

        // Processing time stats
        const processingTimes = completed.filter(t => t.processing_time_seconds).map(t => t.processing_time_seconds);
        const avgProcessingTime = processingTimes.length > 0
            ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length)
            : 0;

        // Accuracy stats
        const accuracyScores = completed.filter(t => t.accuracy_score).map(t => t.accuracy_score);
        const avgAccuracy = accuracyScores.length > 0
            ? (accuracyScores.reduce((a, b) => a + b, 0) / accuracyScores.length).toFixed(2)
            : 0;

        return {
            total: data?.length || 0,
            completed: completed.length,
            failed: failed.length,
            successRate: data?.length > 0 ? Math.round((completed.length / data.length) * 100) : 100,
            totalWords: completed.reduce((sum, t) => sum + (t.word_count || 0), 0),
            totalCreditsUsed: (data || []).reduce((sum, t) => sum + (t.credits_used || 0), 0),
            avgProcessingTime,
            avgAccuracy: parseFloat(avgAccuracy),
            languages
        };
    } catch (error) {
        logger.error('Failed to get transcription analytics', { error: error.message, userId });
        throw new ApiError(500, 'Failed to get transcription analytics');
    }
}

/**
 * Get export analytics
 */
export async function getExportAnalytics(userId, days = 30) {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabase
            .from('export_jobs')
            .select('export_type, status, output_size, quality, processing_time_seconds, created_at')
            .eq('user_id', userId)
            .gte('created_at', startDate.toISOString());

        if (error) throw error;

        const completed = (data || []).filter(e => e.status === 'completed');

        // Type breakdown
        const typeBreakdown = {};
        completed.forEach(e => {
            const type = e.export_type || 'unknown';
            if (!typeBreakdown[type]) {
                typeBreakdown[type] = { count: 0, totalSize: 0 };
            }
            typeBreakdown[type].count++;
            typeBreakdown[type].totalSize += e.output_size || 0;
        });

        const types = Object.entries(typeBreakdown)
            .map(([type, stats]) => ({ type, ...stats }))
            .sort((a, b) => b.count - a.count);

        // Quality breakdown
        const qualityBreakdown = {};
        completed.forEach(e => {
            const quality = e.quality || 'high';
            qualityBreakdown[quality] = (qualityBreakdown[quality] || 0) + 1;
        });

        return {
            total: data?.length || 0,
            completed: completed.length,
            failed: (data || []).filter(e => e.status === 'failed').length,
            totalSize: completed.reduce((sum, e) => sum + (e.output_size || 0), 0),
            types,
            qualityBreakdown
        };
    } catch (error) {
        logger.error('Failed to get export analytics', { error: error.message, userId });
        throw new ApiError(500, 'Failed to get export analytics');
    }
}

export default {
    trackAction,
    getUserSummary,
    getUsageHistory,
    getUsageStats,
    getTranscriptionAnalytics,
    getExportAnalytics
};
