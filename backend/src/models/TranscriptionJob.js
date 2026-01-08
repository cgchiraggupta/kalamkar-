/**
 * TranscriptionJob Model
 * 
 * Handles transcription job operations with Supabase
 */

import { supabase } from '../database/supabase.js';
import logger from '../utils/logger.js';
import { ApiError } from '../middleware/errorHandler.js';

export class TranscriptionJob {
    constructor(data) {
        this.id = data.id;
        this.videoId = data.video_id;
        this.userId = data.user_id;
        this.languageCode = data.language_code;
        this.modelUsed = data.model_used;
        this.status = data.status;
        this.progress = data.progress;
        this.creditsUsed = data.credits_used;
        this.processingTimeSeconds = data.processing_time_seconds;
        this.wordCount = data.word_count;
        this.accuracyScore = data.accuracy_score;
        this.errorMessage = data.error_message;
        this.startedAt = data.started_at;
        this.completedAt = data.completed_at;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
        this.metadata = data.metadata || {};
    }

    /**
     * Create a new transcription job
     */
    static async create(jobData) {
        try {
            const { data, error } = await supabase
                .from('transcription_jobs')
                .insert({
                    video_id: jobData.videoId,
                    user_id: jobData.userId,
                    language_code: jobData.languageCode || 'auto',
                    model_used: jobData.modelUsed || 'whisper-small',
                    status: 'pending',
                    progress: 0,
                    metadata: jobData.metadata || {}
                })
                .select()
                .single();

            if (error) {
                throw new ApiError(500, 'Failed to create transcription job');
            }

            logger.info('Transcription job created', { 
                jobId: data.id, 
                videoId: jobData.videoId, 
                userId: jobData.userId 
            });
            return new TranscriptionJob(data);
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error('Transcription job creation failed', { error: error.message });
            throw new ApiError(500, 'Failed to create transcription job');
        }
    }

    /**
     * Find transcription job by ID
     */
    static async findById(id, userId = null) {
        try {
            let query = supabase
                .from('transcription_jobs')
                .select('*')
                .eq('id', id);

            if (userId) {
                query = query.eq('user_id', userId);
            }

            const { data, error } = await query.single();

            if (error || !data) {
                return null;
            }

            return new TranscriptionJob(data);
        } catch (error) {
            logger.error('Failed to find transcription job by ID', { error: error.message, id });
            return null;
        }
    }

    /**
     * Find transcription jobs by video ID
     */
    static async findByVideoId(videoId, userId = null) {
        try {
            let query = supabase
                .from('transcription_jobs')
                .select('*')
                .eq('video_id', videoId)
                .order('created_at', { ascending: false });

            if (userId) {
                query = query.eq('user_id', userId);
            }

            const { data, error } = await query;

            if (error) {
                throw new ApiError(500, 'Failed to fetch transcription jobs');
            }

            return data.map(job => new TranscriptionJob(job));
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error('Failed to find transcription jobs by video ID', { error: error.message, videoId });
            throw new ApiError(500, 'Failed to fetch transcription jobs');
        }
    }

    /**
     * Find transcription jobs by user ID
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
                .from('transcription_jobs')
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
                throw new ApiError(500, 'Failed to fetch transcription jobs');
            }

            return data.map(job => new TranscriptionJob(job));
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error('Failed to find transcription jobs by user ID', { error: error.message, userId });
            throw new ApiError(500, 'Failed to fetch transcription jobs');
        }
    }

    /**
     * Update job status and progress
     */
    async updateStatus(status, updates = {}) {
        try {
            const updateData = {
                status,
                progress: updates.progress || this.progress,
                ...updates
            };

            // Set timestamps based on status
            if (status === 'processing' && !this.startedAt) {
                updateData.started_at = new Date().toISOString();
            } else if (status === 'completed' || status === 'failed') {
                updateData.completed_at = new Date().toISOString();
                
                if (this.startedAt) {
                    const processingTime = Math.floor(
                        (new Date() - new Date(this.startedAt)) / 1000
                    );
                    updateData.processing_time_seconds = processingTime;
                }
            }

            const { data, error } = await supabase
                .from('transcription_jobs')
                .update(updateData)
                .eq('id', this.id)
                .select()
                .single();

            if (error) {
                throw new ApiError(500, 'Failed to update transcription job');
            }

            Object.assign(this, new TranscriptionJob(data));
            logger.info('Transcription job updated', { jobId: this.id, status });
            return this;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error('Failed to update transcription job', { error: error.message, jobId: this.id });
            throw new ApiError(500, 'Failed to update transcription job');
        }
    }

    /**
     * Mark job as failed
     */
    async markAsFailed(errorMessage) {
        return this.updateStatus('failed', { 
            error_message: errorMessage,
            progress: 0 
        });
    }

    /**
     * Mark job as completed
     */
    async markAsCompleted(results = {}) {
        return this.updateStatus('completed', {
            progress: 100,
            word_count: results.wordCount,
            accuracy_score: results.accuracyScore,
            credits_used: results.creditsUsed
        });
    }

    /**
     * Update progress
     */
    async updateProgress(progress) {
        if (progress < 0 || progress > 100) {
            throw new ApiError(400, 'Progress must be between 0 and 100');
        }

        return this.updateStatus(this.status, { progress });
    }

    /**
     * Get captions for this job
     */
    async getCaptions() {
        try {
            const { data, error } = await supabase
                .from('captions')
                .select(`
                    *,
                    words (*)
                `)
                .eq('transcription_job_id', this.id)
                .order('sequence_number');

            if (error) {
                throw new ApiError(500, 'Failed to fetch captions');
            }

            return data.map(caption => ({
                id: caption.id,
                text: caption.text,
                startTime: parseFloat(caption.start_time),
                endTime: parseFloat(caption.end_time),
                confidence: caption.confidence,
                speakerId: caption.speaker_id,
                sequenceNumber: caption.sequence_number,
                words: caption.words?.map(word => ({
                    id: word.id,
                    word: word.word,
                    startTime: parseFloat(word.start_time),
                    endTime: parseFloat(word.end_time),
                    confidence: word.confidence,
                    sequenceNumber: word.sequence_number
                })) || []
            }));
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error('Failed to get captions for job', { error: error.message, jobId: this.id });
            throw new ApiError(500, 'Failed to fetch captions');
        }
    }

    /**
     * Save captions for this job
     */
    async saveCaptions(captions) {
        try {
            // First, delete existing captions
            await supabase
                .from('captions')
                .delete()
                .eq('transcription_job_id', this.id);

            // Insert new captions
            const captionInserts = captions.map((caption, index) => ({
                transcription_job_id: this.id,
                video_id: this.videoId,
                sequence_number: index + 1,
                text: caption.text,
                start_time: caption.startTime,
                end_time: caption.endTime,
                confidence: caption.confidence,
                speaker_id: caption.speakerId
            }));

            const { data: insertedCaptions, error: captionError } = await supabase
                .from('captions')
                .insert(captionInserts)
                .select();

            if (captionError) {
                throw new ApiError(500, 'Failed to save captions');
            }

            // Insert words if provided
            const wordInserts = [];
            captions.forEach((caption, captionIndex) => {
                if (caption.words && caption.words.length > 0) {
                    const captionId = insertedCaptions[captionIndex].id;
                    caption.words.forEach((word, wordIndex) => {
                        wordInserts.push({
                            caption_id: captionId,
                            word: word.word,
                            start_time: word.startTime,
                            end_time: word.endTime,
                            confidence: word.confidence,
                            sequence_number: wordIndex + 1
                        });
                    });
                }
            });

            if (wordInserts.length > 0) {
                const { error: wordError } = await supabase
                    .from('words')
                    .insert(wordInserts);

                if (wordError) {
                    logger.warn('Failed to save words', { error: wordError.message, jobId: this.id });
                }
            }

            logger.info('Captions saved successfully', { 
                jobId: this.id, 
                captionCount: captions.length,
                wordCount: wordInserts.length 
            });

            return true;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error('Failed to save captions', { error: error.message, jobId: this.id });
            throw new ApiError(500, 'Failed to save captions');
        }
    }

    /**
     * Delete transcription job and related data
     */
    async delete() {
        try {
            const { error } = await supabase
                .from('transcription_jobs')
                .delete()
                .eq('id', this.id);

            if (error) {
                throw new ApiError(500, 'Failed to delete transcription job');
            }

            logger.info('Transcription job deleted', { jobId: this.id, userId: this.userId });
            return true;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error('Failed to delete transcription job', { error: error.message, jobId: this.id });
            throw new ApiError(500, 'Failed to delete transcription job');
        }
    }

    /**
     * Calculate credits required for this job
     */
    static calculateCredits(durationSeconds) {
        // 1 credit per second of video (60 credits per minute)
        return Math.ceil(durationSeconds);
    }

    /**
     * Get processing time formatted
     */
    get processingTimeFormatted() {
        if (!this.processingTimeSeconds) return null;
        const minutes = Math.floor(this.processingTimeSeconds / 60);
        const seconds = this.processingTimeSeconds % 60;
        return `${minutes}m ${seconds}s`;
    }

    /**
     * Convert to JSON
     */
    toJSON() {
        return {
            id: this.id,
            videoId: this.videoId,
            userId: this.userId,
            languageCode: this.languageCode,
            modelUsed: this.modelUsed,
            status: this.status,
            progress: this.progress,
            creditsUsed: this.creditsUsed,
            processingTimeSeconds: this.processingTimeSeconds,
            processingTimeFormatted: this.processingTimeFormatted,
            wordCount: this.wordCount,
            accuracyScore: this.accuracyScore,
            errorMessage: this.errorMessage,
            startedAt: this.startedAt,
            completedAt: this.completedAt,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            metadata: this.metadata
        };
    }
}

export default TranscriptionJob;