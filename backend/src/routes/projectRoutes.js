/**
 * Kalakar - Project Routes
 *
 * API endpoints for project operations:
 * - Create project
 * - Get project info
 * - Update project
 * - Delete project
 * - List user projects
 * - Add/Remove videos from projects
 */

import { Router } from 'express';
import { demoAuth } from '../middleware/auth.js';
import { asyncHandler, Errors } from '../middleware/errorHandler.js';
import { Project } from '../models/Project.js';
import { Video } from '../models/Video.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * POST /api/projects
 * Create a new project
 */
router.post(
    '/',
    demoAuth,
    asyncHandler(async (req, res) => {
        const { name, description, isPublic } = req.body;

        if (!name || name.trim().length === 0) {
            throw Errors.badRequest('Project name is required');
        }

        if (name.length > 255) {
            throw Errors.badRequest('Project name must be less than 255 characters');
        }

        const project = await Project.create({
            userId: req.userId,
            name: name.trim(),
            description: description?.trim() || null,
            isPublic: isPublic || false
        });

        logger.info('Project created', { projectId: project.id, userId: req.userId });

        res.status(201).json({
            success: true,
            message: 'Project created successfully',
            data: {
                project: project.toJSON()
            }
        });
    })
);

/**
 * GET /api/projects
 * Get user's projects
 */
router.get(
    '/',
    demoAuth,
    asyncHandler(async (req, res) => {
        const {
            limit = 20,
            offset = 0,
            orderBy = 'created_at',
            orderDirection = 'desc',
            includeVideos = 'false'
        } = req.query;

        const projects = await Project.findByUserId(req.userId, {
            limit: parseInt(limit),
            offset: parseInt(offset),
            orderBy,
            orderDirection,
            includeVideos: includeVideos === 'true'
        });

        // Get stats for each project
        const projectsWithStats = await Promise.all(
            projects.map(async (project) => {
                const stats = await project.getStats();
                return {
                    ...project.toJSON(),
                    stats
                };
            })
        );

        res.json({
            success: true,
            data: {
                projects: projectsWithStats,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: projects.length
                }
            }
        });
    })
);

/**
 * GET /api/projects/:id
 * Get project by ID
 */
router.get(
    '/:id',
    demoAuth,
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        const project = await Project.findById(id, req.userId);
        if (!project) {
            throw Errors.notFound('Project');
        }

        // Check access
        if (project.userId !== req.userId && !project.isPublic) {
            throw Errors.forbidden('Access denied to this project');
        }

        const stats = await project.getStats();

        res.json({
            success: true,
            data: {
                project: project.toJSON(),
                stats
            }
        });
    })
);

/**
 * PUT /api/projects/:id
 * Update project
 */
router.put(
    '/:id',
    demoAuth,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { name, description, isPublic } = req.body;

        const project = await Project.findById(id, req.userId);
        if (!project) {
            throw Errors.notFound('Project');
        }

        // Check ownership
        if (project.userId !== req.userId) {
            throw Errors.forbidden('You can only update your own projects');
        }

        const updateData = {};
        if (name !== undefined) {
            if (name.trim().length === 0) {
                throw Errors.badRequest('Project name cannot be empty');
            }
            if (name.length > 255) {
                throw Errors.badRequest('Project name must be less than 255 characters');
            }
            updateData.name = name.trim();
        }
        if (description !== undefined) updateData.description = description?.trim() || null;
        if (isPublic !== undefined) updateData.isPublic = isPublic;

        await project.update(updateData);

        res.json({
            success: true,
            message: 'Project updated successfully',
            data: {
                project: project.toJSON()
            }
        });
    })
);

/**
 * DELETE /api/projects/:id
 * Delete project
 */
router.delete(
    '/:id',
    demoAuth,
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        const project = await Project.findById(id, req.userId);
        if (!project) {
            throw Errors.notFound('Project');
        }

        // Check ownership
        if (project.userId !== req.userId) {
            throw Errors.forbidden('You can only delete your own projects');
        }

        await project.delete();

        logger.info('Project deleted', { projectId: id, userId: req.userId });

        res.json({
            success: true,
            message: 'Project deleted successfully'
        });
    })
);

/**
 * POST /api/projects/:id/videos
 * Add video to project
 */
router.post(
    '/:id/videos',
    demoAuth,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { videoId } = req.body;

        if (!videoId) {
            throw Errors.badRequest('Video ID is required');
        }

        const project = await Project.findById(id, req.userId);
        if (!project) {
            throw Errors.notFound('Project');
        }

        // Check project ownership
        if (project.userId !== req.userId) {
            throw Errors.forbidden('You can only add videos to your own projects');
        }

        // Verify video exists and belongs to user
        const video = await Video.findById(videoId, req.userId);
        if (!video) {
            throw Errors.notFound('Video');
        }

        await project.addVideo(videoId);

        res.status(201).json({
            success: true,
            message: 'Video added to project',
            data: {
                projectId: id,
                videoId
            }
        });
    })
);

/**
 * DELETE /api/projects/:id/videos/:videoId
 * Remove video from project
 */
router.delete(
    '/:id/videos/:videoId',
    demoAuth,
    asyncHandler(async (req, res) => {
        const { id, videoId } = req.params;

        const project = await Project.findById(id, req.userId);
        if (!project) {
            throw Errors.notFound('Project');
        }

        // Check project ownership
        if (project.userId !== req.userId) {
            throw Errors.forbidden('You can only remove videos from your own projects');
        }

        await project.removeVideo(videoId);

        res.json({
            success: true,
            message: 'Video removed from project'
        });
    })
);

/**
 * GET /api/projects/:id/videos
 * Get videos in a project
 */
router.get(
    '/:id/videos',
    demoAuth,
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        const project = await Project.findById(id, req.userId);
        if (!project) {
            throw Errors.notFound('Project');
        }

        // Check access
        if (project.userId !== req.userId && !project.isPublic) {
            throw Errors.forbidden('Access denied to this project');
        }

        const videos = await project.getVideos();

        res.json({
            success: true,
            data: {
                videos,
                total: videos.length
            }
        });
    })
);

export default router;
