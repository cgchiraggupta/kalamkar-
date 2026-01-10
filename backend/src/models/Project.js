/**
 * Project Model
 *
 * Handles project data operations with Supabase
 */

import { supabase } from '../database/supabase.js';
import logger from '../utils/logger.js';
import { ApiError } from '../middleware/errorHandler.js';

export class Project {
    constructor(data) {
        this.id = data.id;
        this.userId = data.user_id;
        this.name = data.name;
        this.description = data.description;
        this.thumbnailUrl = data.thumbnail_url;
        this.isPublic = data.is_public;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
        this.metadata = data.metadata || {};
        this.videoCount = data.video_count || 0;
        this.videos = data.videos || [];
    }

    /**
     * Create a new project
     */
    static async create(projectData) {
        try {
            const { data, error } = await supabase
                .from('projects')
                .insert({
                    user_id: projectData.userId,
                    name: projectData.name,
                    description: projectData.description || null,
                    thumbnail_url: projectData.thumbnailUrl || null,
                    is_public: projectData.isPublic || false,
                    metadata: projectData.metadata || {}
                })
                .select()
                .single();

            if (error) {
                logger.error('Failed to create project', { error: error.message });
                throw new ApiError(500, 'Failed to create project');
            }

            logger.info('Project created', { projectId: data.id, userId: projectData.userId });
            return new Project(data);
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error('Project creation failed', { error: error.message });
            throw new ApiError(500, 'Failed to create project');
        }
    }

    /**
     * Find project by ID
     */
    static async findById(id, userId = null) {
        try {
            let query = supabase
                .from('projects')
                .select(`
                    *,
                    project_videos (
                        video_id,
                        added_at,
                        videos (
                            id,
                            original_name,
                            filename,
                            duration_seconds,
                            thumbnail_url,
                            status,
                            created_at
                        )
                    )
                `)
                .eq('id', id);

            if (userId) {
                query = query.or(`user_id.eq.${userId},is_public.eq.true`);
            }

            const { data, error } = await query.single();

            if (error || !data) {
                return null;
            }

            // Transform the nested videos data
            const project = new Project({
                ...data,
                video_count: data.project_videos?.length || 0,
                videos: data.project_videos?.map(pv => ({
                    ...pv.videos,
                    addedAt: pv.added_at
                })) || []
            });

            return project;
        } catch (error) {
            logger.error('Failed to find project by ID', { error: error.message, id });
            return null;
        }
    }

    /**
     * Find projects by user ID
     */
    static async findByUserId(userId, options = {}) {
        try {
            const {
                limit = 50,
                offset = 0,
                orderBy = 'created_at',
                orderDirection = 'desc',
                includeVideos = false
            } = options;

            let selectQuery = '*';
            if (includeVideos) {
                selectQuery = `
                    *,
                    project_videos (
                        video_id,
                        videos (
                            id,
                            original_name,
                            thumbnail_url,
                            duration_seconds
                        )
                    )
                `;
            }

            const { data, error } = await supabase
                .from('projects')
                .select(selectQuery)
                .eq('user_id', userId)
                .order(orderBy, { ascending: orderDirection === 'asc' })
                .range(offset, offset + limit - 1);

            if (error) {
                throw new ApiError(500, 'Failed to fetch projects');
            }

            return data.map(project => new Project({
                ...project,
                video_count: project.project_videos?.length || 0,
                videos: project.project_videos?.map(pv => pv.videos) || []
            }));
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error('Failed to find projects by user ID', { error: error.message, userId });
            throw new ApiError(500, 'Failed to fetch projects');
        }
    }

    /**
     * Update project
     */
    async update(updateData) {
        try {
            const updatePayload = {};
            if (updateData.name !== undefined) updatePayload.name = updateData.name;
            if (updateData.description !== undefined) updatePayload.description = updateData.description;
            if (updateData.thumbnailUrl !== undefined) updatePayload.thumbnail_url = updateData.thumbnailUrl;
            if (updateData.isPublic !== undefined) updatePayload.is_public = updateData.isPublic;
            if (updateData.metadata !== undefined) {
                updatePayload.metadata = { ...this.metadata, ...updateData.metadata };
            }

            const { data, error } = await supabase
                .from('projects')
                .update(updatePayload)
                .eq('id', this.id)
                .select()
                .single();

            if (error) {
                throw new ApiError(500, 'Failed to update project');
            }

            Object.assign(this, new Project(data));
            logger.info('Project updated', { projectId: this.id });
            return this;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error('Failed to update project', { error: error.message, projectId: this.id });
            throw new ApiError(500, 'Failed to update project');
        }
    }

    /**
     * Delete project
     */
    async delete() {
        try {
            const { error } = await supabase
                .from('projects')
                .delete()
                .eq('id', this.id);

            if (error) {
                throw new ApiError(500, 'Failed to delete project');
            }

            logger.info('Project deleted', { projectId: this.id, userId: this.userId });
            return true;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error('Failed to delete project', { error: error.message, projectId: this.id });
            throw new ApiError(500, 'Failed to delete project');
        }
    }

    /**
     * Add video to project
     */
    async addVideo(videoId) {
        try {
            const { data, error } = await supabase
                .from('project_videos')
                .insert({
                    project_id: this.id,
                    video_id: videoId
                })
                .select()
                .single();

            if (error) {
                if (error.code === '23505') { // Unique violation
                    throw new ApiError(400, 'Video already in project');
                }
                throw new ApiError(500, 'Failed to add video to project');
            }

            logger.info('Video added to project', { projectId: this.id, videoId });
            return data;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error('Failed to add video to project', { error: error.message, projectId: this.id, videoId });
            throw new ApiError(500, 'Failed to add video to project');
        }
    }

    /**
     * Remove video from project
     */
    async removeVideo(videoId) {
        try {
            const { error } = await supabase
                .from('project_videos')
                .delete()
                .eq('project_id', this.id)
                .eq('video_id', videoId);

            if (error) {
                throw new ApiError(500, 'Failed to remove video from project');
            }

            logger.info('Video removed from project', { projectId: this.id, videoId });
            return true;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error('Failed to remove video from project', { error: error.message, projectId: this.id, videoId });
            throw new ApiError(500, 'Failed to remove video from project');
        }
    }

    /**
     * Get project videos
     */
    async getVideos() {
        try {
            const { data, error } = await supabase
                .from('project_videos')
                .select(`
                    video_id,
                    added_at,
                    videos (
                        id,
                        original_name,
                        filename,
                        duration_seconds,
                        thumbnail_url,
                        status,
                        created_at,
                        file_size,
                        width,
                        height
                    )
                `)
                .eq('project_id', this.id)
                .order('added_at', { ascending: false });

            if (error) {
                throw new ApiError(500, 'Failed to fetch project videos');
            }

            return data.map(pv => ({
                ...pv.videos,
                addedAt: pv.added_at
            }));
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error('Failed to get project videos', { error: error.message, projectId: this.id });
            throw new ApiError(500, 'Failed to fetch project videos');
        }
    }

    /**
     * Get project statistics
     */
    async getStats() {
        try {
            const videos = await this.getVideos();

            const totalDuration = videos.reduce((sum, v) => sum + (v.duration_seconds || 0), 0);
            const totalSize = videos.reduce((sum, v) => sum + (v.file_size || 0), 0);

            return {
                videoCount: videos.length,
                totalDurationSeconds: totalDuration,
                totalDurationFormatted: this.formatDuration(totalDuration),
                totalSize: totalSize,
                totalSizeFormatted: this.formatSize(totalSize),
                lastUpdated: videos.length > 0
                    ? videos.reduce((latest, v) =>
                        new Date(v.addedAt) > new Date(latest) ? v.addedAt : latest,
                        videos[0].addedAt
                      )
                    : this.createdAt
            };
        } catch (error) {
            logger.error('Failed to get project stats', { error: error.message, projectId: this.id });
            return {
                videoCount: 0,
                totalDurationSeconds: 0,
                totalDurationFormatted: '0:00',
                totalSize: 0,
                totalSizeFormatted: '0 Bytes',
                lastUpdated: this.createdAt
            };
        }
    }

    formatDuration(seconds) {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    formatSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Convert to JSON
     */
    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            name: this.name,
            description: this.description,
            thumbnailUrl: this.thumbnailUrl,
            isPublic: this.isPublic,
            videoCount: this.videoCount,
            videos: this.videos,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            metadata: this.metadata
        };
    }
}

export default Project;
