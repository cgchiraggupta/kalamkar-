/**
 * Kalakar - Transcription Routes
 * 
 * API endpoints for AI transcription:
 * - Start transcription for a video
 * - Get transcription status
 * - Get supported languages
 * - Export subtitles (SRT/VTT)
 */

import { Router } from 'express';
import path from 'path';
import { execSync } from 'child_process';
import {
    startTranscriptionJob,
    getTranscriptionStatus,
    transcribeVideoSync,
    getSupportedLanguages,
    generateSRT,
    generateVTT,
    transcribeWithSpeakers,
    getSpeakerDiarizationMethods
} from '../services/transcriptionService.js';
import { transcriptionLimiter } from '../middleware/rateLimiter.js';
import { demoAuth } from '../middleware/auth.js';
import { asyncHandler, Errors } from '../middleware/errorHandler.js';
import { TranscriptionJob } from '../models/TranscriptionJob.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * GET /api/transcription/languages
 * Get list of supported languages
 */
router.get(
    '/languages',
    asyncHandler(async (req, res) => {
        const languages = getSupportedLanguages();

        res.json({
            success: true,
            data: {
                languages: Object.entries(languages).map(([code, name]) => ({
                    code,
                    name,
                })),
            },
        });
    })
);

/**
 * POST /api/transcription/start
 * Start transcription for a video
 * 
 * Body: { videoId: string, language?: string }
 */
router.post(
    '/start',
    transcriptionLimiter,
    demoAuth,
    asyncHandler(async (req, res) => {
        const { videoId, language = 'auto' } = req.body;

        if (!videoId) {
            throw Errors.badRequest('Video ID is required');
        }

        // Validate language code
        const supportedLanguages = getSupportedLanguages();
        if (language && !supportedLanguages[language]) {
            throw Errors.badRequest(`Unsupported language: ${language}. Use /api/transcription/languages for supported languages.`);
        }

        // Start transcription job
        const job = await startTranscriptionJob(videoId, req.userId, language);

        res.status(202).json({
            success: true,
            message: 'Transcription started',
            data: {
                jobId: job.id,
                videoId: job.videoId,
                status: job.status,
                statusUrl: `/api/transcription/status/${job.id}`,
            },
        });
    })
);

/**
 * GET /api/transcription/status/:jobId
 * Get transcription job status
 */
router.get(
    '/status/:jobId',
    demoAuth,
    asyncHandler(async (req, res) => {
        const { jobId } = req.params;

        const jobStatus = await getTranscriptionStatus(jobId, req.userId);

        res.json({
            success: true,
            data: {
                job: jobStatus,
            },
        });
    })
);

/**
 * POST /api/transcription/sync
 * Synchronous transcription (waits for completion)
 * Use for smaller files or when you need immediate results
 * 
 * Body: { videoId: string, language?: string }
 */
router.post(
    '/sync',
    transcriptionLimiter,
    demoAuth,
    asyncHandler(async (req, res) => {
        const { videoId, language = 'auto' } = req.body;

        if (!videoId) {
            throw Errors.badRequest('Video ID is required');
        }

        // Validate language code
        const supportedLanguages = getSupportedLanguages();
        if (language && !supportedLanguages[language]) {
            throw Errors.badRequest(`Unsupported language: ${language}`);
        }

        logger.info('Starting synchronous transcription', { videoId, language, userId: req.userId });

        const result = await transcribeVideoSync(videoId, req.userId, language);

        res.json({
            success: true,
            message: 'Transcription completed',
            data: result,
        });
    })
);

/**
 * POST /api/transcription/export
 * Export captions in SRT or VTT format
 * 
 * Body: { captions: Caption[], format: 'srt' | 'vtt' }
 */
router.post(
    '/export',
    asyncHandler(async (req, res) => {
        const { captions, format = 'srt' } = req.body;

        if (!captions || !Array.isArray(captions) || captions.length === 0) {
            throw Errors.badRequest('Captions array is required');
        }

        if (!['srt', 'vtt'].includes(format)) {
            throw Errors.badRequest('Format must be "srt" or "vtt"');
        }

        let content;
        let contentType;
        let filename;

        if (format === 'srt') {
            content = generateSRT(captions);
            contentType = 'text/plain';
            filename = 'captions.srt';
        } else {
            content = generateVTT(captions);
            contentType = 'text/vtt';
            filename = 'captions.vtt';
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(content);
    })
);

/**
 * GET /api/transcription/test
 * Test Whisper installation and configuration
 */
router.get(
    '/test',
    asyncHandler(async (req, res) => {
        const testResults = {
            whisperInstalled: false,
            pythonAvailable: false,
            ffmpegAvailable: false,
            configuredModel: config.ai.whisperModel,
            useLocalWhisper: config.ai.useLocalWhisper,
            errors: []
        };

        try {
            // Test Python availability
            await execAsync('python3 --version');
            testResults.pythonAvailable = true;
        } catch (error) {
            testResults.errors.push('Python 3 not found');
        }

        try {
            // Test FFmpeg availability
            await execAsync('ffmpeg -version');
            testResults.ffmpegAvailable = true;
        } catch (error) {
            testResults.errors.push('FFmpeg not found - required for audio extraction');
        }

        try {
            // Test Whisper availability using our script
            const scriptPath = path.join(process.cwd(), 'scripts', 'run_whisper.sh');
            const { stdout } = await execAsync(`bash "${scriptPath}" --help`, { timeout: 10000 });
            
            if (!stdout.includes('error')) {
                testResults.whisperInstalled = true;
            }
        } catch (error) {
            testResults.errors.push('Whisper not accessible - check installation');
        }

        const allGood = testResults.whisperInstalled && testResults.pythonAvailable && testResults.ffmpegAvailable;

        res.json({
            success: allGood,
            message: allGood 
                ? 'All systems ready for transcription!' 
                : 'Some components need attention',
            data: testResults,
            recommendations: testResults.errors.length > 0 ? [
                'Install missing components:',
                ...(testResults.errors.includes('Python 3 not found') ? ['- Install Python 3'] : []),
                ...(testResults.errors.includes('FFmpeg not found - required for audio extraction') ? ['- Install FFmpeg: brew install ffmpeg'] : []),
                ...(testResults.errors.includes('Whisper not accessible - check installation') ? ['- Install Whisper: pip install openai-whisper'] : []),
                'See backend/WHISPER_SETUP.md for detailed instructions'
            ] : []
        });
    })
);

/**
 * DELETE /api/transcription/jobs/:jobId
 * Delete a transcription job
 */
router.delete(
    '/jobs/:jobId',
    demoAuth,
    asyncHandler(async (req, res) => {
        const { jobId } = req.params;

        const job = await TranscriptionJob.findById(jobId, req.userId);
        if (!job) {
            throw Errors.notFound('Transcription job');
        }

        await job.delete();

        res.json({
            success: true,
            message: 'Transcription job deleted',
        });
    })
);

/**
 * POST /api/transcription/speakers
 * Transcribe with multi-speaker detection
 *
 * Body: { videoId: string, language?: string, enableSpeakers?: boolean }
 */
router.post(
    '/speakers',
    transcriptionLimiter,
    demoAuth,
    asyncHandler(async (req, res) => {
        const { videoId, language = 'auto', enableSpeakers = true } = req.body;

        if (!videoId) {
            throw Errors.badRequest('Video ID is required');
        }

        // Validate language code
        const supportedLanguages = getSupportedLanguages();
        if (language && !supportedLanguages[language]) {
            throw Errors.badRequest(`Unsupported language: ${language}`);
        }

        logger.info('Starting multi-speaker transcription', {
            videoId,
            language,
            enableSpeakers,
            userId: req.userId
        });

        const result = await transcribeWithSpeakers(videoId, req.userId, language, enableSpeakers);

        res.json({
            success: true,
            message: 'Multi-speaker transcription completed',
            data: result,
        });
    })
);

/**
 * GET /api/transcription/diarization/methods
 * Get available speaker diarization methods
 */
router.get(
    '/diarization/methods',
    asyncHandler(async (req, res) => {
        const methods = await getSpeakerDiarizationMethods();

        res.json({
            success: true,
            data: {
                methods,
            },
        });
    })
);

export default router;
