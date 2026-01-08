/**
 * Video Model
 * 
 * Handles video data operations with Supabase
 */

import { supabase } from '../database/supabase.js';
import logger from '../utils/logger.js';
import { ApiError } from '../middleware/errorHandler.js';

export class Video {
    constructor(data) {
        this.id = data.id;
        this.userId = data.user_id;
        this.filename = data.filename;
        this.originalName = data.original_name;
        this.mimeType = data.mime_type;
        this.fileSize = data.file_size;
        this.durationSeconds = data.duration_seconds;
        this.width = data.width;
        this.height = data.height;
        this.fps = data.fps;
        this.storagePath = data.storage_path;
        this.storageProvider = data.storage_provider;
        this.status = data.status;
        this.thumbnailUrl = data.thumbnail_url;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
        this.metadata = data.metadata || {};
    }

    /**
     * Create a new video record
     */
    static async create(videoData) {
        try {
            const { data, error } = await supabase
                .from('videos')
                .insert({
                    user_id: videoData.userId,
                    filename: videoData.filename,
                    original_name: videoData.originalName,
                    mime_type: videoData.mimeType,
                    file_size: videoData.fileSize,
                    duration_seconds: videoData.durationSeconds,
                    width: videoData.width,
                    height: videoData.height,
                    fps: videoData.fps,
                    storage_path: videoData.storagePath,
                    storage_provider: videoData.storageProvider || 'local',
                    status: videoData.status || 'uploaded',
                    thumbnail_url: videoData.thumbnailUrl,
                    metadata: videoData.metadata || {}
                })
                .select()
                .single();

            if (error) {
                throw new ApiError(500, 'Failed to create video record');
            }

            logger.info('Video record created', { videoId: data.id, userId: videoData.userId });
            return new Video(data);
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error('Video creation failed', { error: error.message });
            throw new ApiError(500, 'Failed to create video record');
        }
    }

    /**
     * Find video by ID
     */
    static async findById(id, userId = null) {
        try {
            let query = supabase
                .from('videos')
                .select('*')
                .eq('id', id);

            if (userId) {
                query = query.eq('user_id', userId);
            }

            const { data, error } = await query.single();

            if (error || !data) {
                return null;
            }

            return new Video(data);
        } catch (error) {
            logger.error('Failed to find video by ID', { error: error.message, id });
            return null;
        }
    }

    /**
     * Find videos by user ID
     */
    static async findByUserId(userId, options = {}) {
        try {
            const { 
                limit = 50, 
                offset = 0, 
                status = null,
                orderBy = 'created_at',
                orderDirection = 'desc'
            } = options;

            let query = supabase
                .from('videos')
                .select('*')
                .eq('user_id', userId);

            if (status) {
                query = query.eq('status', status);
            }

            query = query
                .order(orderBy, { ascending: orderDirection === 'asc' })
                .range(offset, offset + limit - 1);

            const { data, error } = await query;

            if (error) {
                throw new ApiError(500, 'Failed to fetch videos');
            }

            return data.map(video => new Video(video));
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error('Failed to find videos by user ID', { error: error.message, userId });
            throw new ApiError(500, 'Failed to fetch videos');
        }
    }

    /**
     * Update video status
     */
    async updateStatus(status, metadata = {}) {
        try {
            const { data, error } = await supabase
                .from('videos')
                .update({ 
                    status,
                    metadata: { ...this.metadata, ...metadata }
                })
                .eq('id', this.id)
                .select()
                .single();

            if (error) {
                throw new ApiError(500, 'Failed to update video status');
            }

            Object.assign(this, new Video(data));
            logger.info('Video status updated', { videoId: this.id, status });
            return this;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error('Failed to update video status', { error: error.message, videoId: this.id });
            throw new ApiError(500, 'Failed to update video status');
        }
    }

    /**
     * Update video metadata
     */
    async updateMetadata(newMetadata) {
        try {
            const updatedMetadata = { ...this.metadata, ...newMetadata };

            const { data, error } = await supabase
                .from('videos')
                .update({ metadata: updatedMetadata })
                .eq('id', this.id)
                .select()
                .single();

            if (error) {
                throw new ApiError(500, 'Failed to update video metadata');
            }

            Object.assign(this, new Video(data));
            logger.info('Video metadata updated', { videoId: this.id });
            return this;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error('Failed to update video metadata', { error: error.message, videoId: this.id });
            throw new ApiError(500, 'Failed to update video metadata');
        }
    }

    /**
     * Delete video
     */
    async delete() {
        try {
            const { error } = await supabase
                .from('videos')
                .delete()
                .eq('id', this.id);

            if (error) {
                throw new ApiError(500, 'Failed to delete video');
            }

            logger.info('Video deleted', { videoId: this.id, userId: this.userId });
            return true;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error('Failed to delete video', { error: error.message, videoId: this.id });
            throw new ApiError(500, 'Failed to delete video');
        }
    }

    /**
     * Get video statistics
     */
    async getStats() {
        try {
            const { data: transcriptions, error: transcriptionError } = await supabase
                .from('transcription_jobs')
                .select('id, status, language_code, word_count, accuracy_score, created_at')
                .eq('video_id', this.id);

            const { data: exports, error: exportError } = await supabase
                .from('export_jobs')
                .select('id, status, export_type, created_at')
                .eq('video_id', this.id);

            if (transcriptionError || exportError) {
                throw new Error('Failed to fetch video statistics');
            }

            const totalTranscriptions = transcriptions?.length || 0;
            const completedTranscriptions = transcriptions?.filter(t => t.status === 'completed').length || 0;
            const totalExports = exports?.length || 0;
            const completedExports = exports?.filter(e => e.status === 'completed').length || 0;

            return {
                totalTranscriptions,
                completedTranscriptions,
                totalExports,
                completedExports,
                languages: [...new Set(transcriptions?.map(t => t.language_code) || [])],
                averageAccuracy: transcriptions?.length > 0 
                    ? transcriptions.reduce((sum, t) => sum + (t.accuracy_score || 0), 0) / transcriptions.length 
                    : 0,
                totalWords: transcriptions?.reduce((sum, t) => sum + (t.word_count || 0), 0) || 0
            };
        } catch (error) {
            logger.error('Failed to get video stats', { error: error.message, videoId: this.id });
            throw new ApiError(500, 'Failed to get video statistics');
        }
    }

    /**
     * Get formatted file size
     */
    get fileSizeFormatted() {
        const bytes = this.fileSize;
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get formatted duration
     */
    get durationFormatted() {
        if (!this.durationSeconds) return '0:00';
        const minutes = Math.floor(this.durationSeconds / 60);
        const seconds = Math.floor(this.durationSeconds % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Get video URL
     */
    get url() {
        return `/uploads/${this.filename}`;
    }

    /**
     * Convert to JSON
     */
    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            filename: this.filename,
            originalName: this.originalName,
            mimeType: this.mimeType,
            fileSize: this.fileSize,
            fileSizeFormatted: this.fileSizeFormatted,
            durationSeconds: this.durationSeconds,
            durationFormatted: this.durationFormatted,
            width: this.width,
            height: this.height,
            fps: this.fps,
            storagePath: this.storagePath,
            storageProvider: this.storageProvider,
            status: this.status,
            thumbnailUrl: this.thumbnailUrl,
            url: this.url,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            metadata: this.metadata
        };
    }
}

export default Video;