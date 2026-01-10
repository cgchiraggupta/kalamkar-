/**
 * Kalakar - Audio Enhancement Service
 *
 * Enhances audio quality using FFmpeg filters:
 * - Noise Reduction: Removes background noise
 * - Volume Normalization: Balances audio levels
 * - Voice Clarity: Enhances speech frequencies
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { ApiError } from '../middleware/errorHandler.js';

const execAsync = promisify(exec);

/**
 * Audio enhancement options
 */
const ENHANCEMENT_PRESETS = {
    // Noise reduction levels
    noise: {
        light: 'afftdn=nf=-25',
        medium: 'afftdn=nf=-20',
        heavy: 'afftdn=nf=-15'
    },
    // Volume normalization
    normalize: {
        standard: 'loudnorm=I=-16:TP=-1.5:LRA=11',
        podcast: 'loudnorm=I=-16:TP=-2:LRA=7',
        broadcast: 'loudnorm=I=-24:TP=-2:LRA=7'
    },
    // Voice clarity (equalizer for speech frequencies)
    clarity: {
        light: 'highpass=f=80,lowpass=f=8000,equalizer=f=2500:t=q:w=1:g=2',
        medium: 'highpass=f=100,lowpass=f=7000,equalizer=f=2500:t=q:w=1:g=3,equalizer=f=4000:t=q:w=1:g=2',
        heavy: 'highpass=f=120,lowpass=f=6000,equalizer=f=2500:t=q:w=0.5:g=4,equalizer=f=4000:t=q:w=0.5:g=3,equalizer=f=1000:t=q:w=1:g=2'
    }
};

/**
 * Find video file by ID (supports multiple extensions)
 */
async function findVideoFile(videoId) {
    const uploadDir = path.resolve(config.upload.uploadDir);
    const extensions = ['.mp4', '.mov', '.webm', '.avi'];

    for (const ext of extensions) {
        const testPath = path.join(uploadDir, `${videoId}${ext}`);
        if (fs.existsSync(testPath)) {
            return testPath;
        }
    }

    return null;
}

/**
 * Enhance audio in a video file
 * @param {string} videoId - Video ID
 * @param {Object} options - Enhancement options
 * @returns {Promise<Object>} - Enhanced video result
 */
export async function enhanceAudio(videoId, options = {}) {
    const {
        noiseReduction = 'medium',
        normalize = true,
        normalizePreset = 'standard',
        voiceClarity = 'medium',
        applyNoise = true,
        applyClarity = true
    } = options;

    let outputPath = null;

    try {
        if (!videoId) {
            throw new ApiError(400, 'Video ID is required');
        }

        // Find input video file
        const inputVideoPath = await findVideoFile(videoId);
        if (!inputVideoPath) {
            throw new ApiError(404, 'Video file not found');
        }

        const uploadDir = path.resolve(config.upload.uploadDir);
        const enhanceId = uuidv4();
        const ext = path.extname(inputVideoPath);
        outputPath = path.join(uploadDir, `${videoId}_enhanced_${enhanceId}${ext}`);

        logger.info('Starting audio enhancement', {
            videoId,
            options: { noiseReduction, normalize, voiceClarity, applyNoise, applyClarity }
        });

        // Build audio filter chain
        const filters = [];

        // 1. Noise reduction (first to clean up audio)
        if (applyNoise && ENHANCEMENT_PRESETS.noise[noiseReduction]) {
            filters.push(ENHANCEMENT_PRESETS.noise[noiseReduction]);
        }

        // 2. Voice clarity (EQ for speech)
        if (applyClarity && ENHANCEMENT_PRESETS.clarity[voiceClarity]) {
            filters.push(ENHANCEMENT_PRESETS.clarity[voiceClarity]);
        }

        // 3. Volume normalization (last to balance levels)
        if (normalize && ENHANCEMENT_PRESETS.normalize[normalizePreset]) {
            filters.push(ENHANCEMENT_PRESETS.normalize[normalizePreset]);
        }

        if (filters.length === 0) {
            throw new ApiError(400, 'No enhancement options selected');
        }

        const audioFilter = filters.join(',');

        // Build FFmpeg command
        const ffmpegCommand = [
            'ffmpeg',
            '-i', `"${inputVideoPath}"`,
            '-af', `"${audioFilter}"`,
            '-c:v', 'copy', // Copy video stream (no re-encoding)
            '-c:a', 'aac',
            '-b:a', '192k',
            '-movflags', '+faststart',
            '-y',
            `"${outputPath}"`
        ].join(' ');

        logger.info('Executing audio enhancement FFmpeg command', { command: ffmpegCommand });

        // Execute FFmpeg
        const { stdout, stderr } = await execAsync(ffmpegCommand, {
            timeout: 300000, // 5 minute timeout
            maxBuffer: 1024 * 1024 * 50
        });

        if (stderr && !stderr.includes('frame=') && !stderr.includes('size=')) {
            logger.warn('FFmpeg stderr output', { stderr: stderr.substring(0, 500) });
        }

        // Verify output file
        if (!fs.existsSync(outputPath)) {
            throw new Error('FFmpeg failed to create enhanced file');
        }

        const outputStats = fs.statSync(outputPath);
        const inputStats = fs.statSync(inputVideoPath);

        logger.info('Audio enhancement completed', {
            videoId,
            enhanceId,
            inputSize: inputStats.size,
            outputSize: outputStats.size
        });

        return {
            success: true,
            enhanceId,
            videoId,
            outputPath,
            filename: path.basename(outputPath),
            url: `/uploads/${path.basename(outputPath)}`,
            size: outputStats.size,
            sizeFormatted: formatBytes(outputStats.size),
            enhancements: {
                noiseReduction: applyNoise ? noiseReduction : 'none',
                normalize: normalize ? normalizePreset : 'none',
                voiceClarity: applyClarity ? voiceClarity : 'none'
            }
        };

    } catch (error) {
        logger.error('Audio enhancement failed', {
            videoId,
            error: error.message,
            stack: error.stack
        });

        // Clean up failed output
        if (outputPath && fs.existsSync(outputPath)) {
            try {
                await fs.promises.unlink(outputPath);
            } catch (cleanupError) {
                logger.warn('Failed to clean up failed enhancement file', { outputPath });
            }
        }

        if (error instanceof ApiError) {
            throw error;
        }

        if (error.message.includes('ffmpeg')) {
            throw new ApiError(500, 'FFmpeg not available. Please ensure FFmpeg is installed.');
        }

        throw new ApiError(500, `Audio enhancement failed: ${error.message}`);
    }
}

/**
 * Analyze audio levels in a video
 * @param {string} videoId - Video ID
 * @returns {Promise<Object>} - Audio analysis result
 */
export async function analyzeAudio(videoId) {
    try {
        if (!videoId) {
            throw new ApiError(400, 'Video ID is required');
        }

        const inputVideoPath = await findVideoFile(videoId);
        if (!inputVideoPath) {
            throw new ApiError(404, 'Video file not found');
        }

        // Use FFmpeg to analyze audio levels
        const ffmpegCommand = [
            'ffmpeg',
            '-i', `"${inputVideoPath}"`,
            '-af', 'volumedetect',
            '-vn',
            '-f', 'null',
            '-'
        ].join(' ');

        const { stderr } = await execAsync(ffmpegCommand, {
            timeout: 60000,
            maxBuffer: 1024 * 1024 * 10
        });

        // Parse volume detection output
        const meanMatch = stderr.match(/mean_volume:\s*([-\d.]+)\s*dB/);
        const maxMatch = stderr.match(/max_volume:\s*([-\d.]+)\s*dB/);

        const meanVolume = meanMatch ? parseFloat(meanMatch[1]) : null;
        const maxVolume = maxMatch ? parseFloat(maxMatch[1]) : null;

        // Determine audio quality assessment
        let quality = 'unknown';
        let recommendations = [];

        if (meanVolume !== null) {
            if (meanVolume > -10) {
                quality = 'too_loud';
                recommendations.push('Audio is too loud, normalization recommended');
            } else if (meanVolume < -30) {
                quality = 'too_quiet';
                recommendations.push('Audio is too quiet, normalization recommended');
            } else if (meanVolume < -20) {
                quality = 'slightly_quiet';
                recommendations.push('Audio could be louder, consider normalization');
            } else {
                quality = 'good';
            }
        }

        // Check for potential noise (large difference between mean and max)
        if (meanVolume !== null && maxVolume !== null) {
            const dynamicRange = maxVolume - meanVolume;
            if (dynamicRange > 20) {
                recommendations.push('High dynamic range detected, consider noise reduction');
            }
        }

        return {
            success: true,
            videoId,
            analysis: {
                meanVolume,
                maxVolume,
                quality,
                recommendations
            }
        };

    } catch (error) {
        logger.error('Audio analysis failed', {
            videoId,
            error: error.message
        });

        if (error instanceof ApiError) {
            throw error;
        }

        throw new ApiError(500, `Audio analysis failed: ${error.message}`);
    }
}

/**
 * Get available enhancement presets
 */
export function getEnhancementPresets() {
    return {
        noiseReduction: Object.keys(ENHANCEMENT_PRESETS.noise),
        normalize: Object.keys(ENHANCEMENT_PRESETS.normalize),
        voiceClarity: Object.keys(ENHANCEMENT_PRESETS.clarity)
    };
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
