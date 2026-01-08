/**
 * Kalakar - Transcription Service
 * 
 * AI-powered speech-to-text transcription using local Whisper.
 * Features:
 * - Multi-language support (Hindi, Tamil, Telugu, English, etc.)
 * - Word-level timestamps for precise caption syncing
 * - Database integration with job tracking
 * - Credit system integration
 * - Error handling with retry logic
 * - Audio extraction from video files
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { ApiError } from '../middleware/errorHandler.js';
import { TranscriptionJob } from '../models/TranscriptionJob.js';
import { Video } from '../models/Video.js';
import { User } from '../models/User.js';

const execAsync = promisify(exec);

// Supported languages with their ISO codes
const SUPPORTED_LANGUAGES = {
    'auto': 'Auto-detect',
    'hi': 'Hindi',
    'ta': 'Tamil',
    'te': 'Telugu',
    'kn': 'Kannada',
    'ml': 'Malayalam',
    'mr': 'Marathi',
    'gu': 'Gujarati',
    'pa': 'Punjabi',
    'bn': 'Bengali',
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
};

/**
 * Extract audio from video file using FFmpeg
 * @param {string} videoPath - Path to video file
 * @returns {Promise<string>} - Path to extracted audio file
 */
async function extractAudio(videoPath) {
    const audioPath = videoPath.replace(/\.[^.]+$/, '.mp3');

    try {
        // Check if FFmpeg is available
        await execAsync('which ffmpeg');

        // Extract audio with optimized settings for transcription
        const command = `ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -ar 16000 -ac 1 -q:a 4 -y "${audioPath}"`;

        logger.info('Extracting audio from video', { videoPath });
        await execAsync(command, { timeout: 300000 }); // 5 minute timeout

        // Verify audio file was created
        if (!fs.existsSync(audioPath)) {
            throw new Error('Audio extraction failed - file not created');
        }

        const stats = fs.statSync(audioPath);
        logger.info('Audio extracted successfully', {
            audioPath,
            size: `${(stats.size / 1024 / 1024).toFixed(2)}MB`
        });

        return audioPath;
    } catch (error) {
        if (error.message.includes('ffmpeg')) {
            logger.error('FFmpeg not found', { error: error.message });
            throw new ApiError(500, 'FFmpeg is required for audio extraction. Please install FFmpeg.');
        }
        logger.error('Audio extraction failed', { error: error.message });
        throw new ApiError(500, 'Failed to extract audio from video');
    }
}

/**
 * Transcribe audio using local Whisper installation
 * @param {string} audioPath - Path to audio file
 * @param {string} language - Language code (optional, 'auto' for auto-detect)
 * @returns {Promise<Object>} - Transcription result with segments and words
 */
async function transcribeWithWhisper(audioPath, language = 'auto') {
    try {
        logger.info('Starting local Whisper transcription', { audioPath, language });

        // Use the shell script to run Whisper - handle both root and backend directory execution
        const scriptPath = process.cwd().includes('/backend') 
            ? path.join(process.cwd(), 'scripts', 'run_whisper.sh')
            : path.join(process.cwd(), 'backend', 'scripts', 'run_whisper.sh');
        const whisperModel = config.ai.whisperModel || 'small';
        
        let command = `bash "${scriptPath}" "${audioPath}" "${whisperModel}"`;
        
        // Add language if specified and not auto-detect
        if (language !== 'auto' && SUPPORTED_LANGUAGES[language]) {
            command += ` "${language}"`;
        }

        logger.info('Running Whisper transcription', { command });

        // Execute the shell script
        const { stdout, stderr } = await execAsync(command, { 
            timeout: 600000, // 10 minute timeout
            maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });

        // Log stderr for debugging but don't treat as error
        if (stderr && stderr.trim()) {
            logger.debug('Whisper process stderr', { stderr: stderr.trim() });
        }

        // Clean stdout - remove any non-JSON lines
        let cleanOutput = stdout.trim();
        
        // If output contains multiple lines, try to find the JSON line
        if (cleanOutput.includes('\n')) {
            const lines = cleanOutput.split('\n');
            // Look for the line that starts with { (JSON) - find the complete JSON block
            let jsonStartIndex = -1;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim().startsWith('{')) {
                    jsonStartIndex = i;
                    break;
                }
            }
            
            if (jsonStartIndex !== -1) {
                // Join all lines from the JSON start to the end
                cleanOutput = lines.slice(jsonStartIndex).join('\n').trim();
            }
        }

        // Parse the JSON result
        let result;
        try {
            result = JSON.parse(cleanOutput);
        } catch (parseError) {
            logger.error('Failed to parse Whisper output', { 
                stdout: stdout.substring(0, 500), // First 500 chars for debugging
                cleanOutput: cleanOutput.substring(0, 500),
                parseError: parseError.message 
            });
            throw new Error('Invalid JSON response from Whisper');
        }

        if (!result.success) {
            throw new Error(result.error || 'Whisper transcription failed');
        }

        // Transform to match expected format
        const transformedResult = {
            text: result.text,
            language: result.language || 'unknown',
            duration: result.segments && result.segments.length > 0 
                ? result.segments[result.segments.length - 1].end 
                : 0,
            segments: result.segments || [],
            words: result.words || []
        };

        logger.info('Local Whisper transcription completed successfully', {
            duration: transformedResult.duration,
            language: transformedResult.language,
            segmentCount: transformedResult.segments?.length,
            wordCount: transformedResult.words?.length
        });

        return transformedResult;

    } catch (error) {
        logger.error('Local Whisper transcription failed', { error: error.message, audioPath });
        
        if (error.message.includes('Whisper not found')) {
            throw new ApiError(500, 'Whisper not found. Please ensure Whisper is installed in a virtual environment or globally. Try: pip install openai-whisper');
        }
        
        throw new ApiError(500, `Transcription failed: ${error.message}`);
    }
}

/**
 * Convert Whisper response to caption format
 * @param {Object} whisperResult - Raw Whisper API response
 * @returns {Object[]} - Array of caption objects
 */
function formatCaptions(whisperResult) {
    const captions = [];

    if (!whisperResult.segments) {
        return captions;
    }

    whisperResult.segments.forEach((segment, index) => {
        const caption = {
            id: `cap_${index + 1}`,
            text: segment.text.trim(),
            startTime: segment.start,
            endTime: segment.end,
            words: [],
        };

        // Add word-level timestamps if available
        if (whisperResult.words) {
            caption.words = whisperResult.words
                .filter(word => word.start >= segment.start && word.end <= segment.end)
                .map(word => ({
                    text: word.word.trim(),
                    startTime: word.start,
                    endTime: word.end,
                }));
        }

        captions.push(caption);
    });

    return captions;
}

/**
 * Start transcription job (async)
 * @param {string} videoId - Video ID
 * @param {string} userId - User ID
 * @param {string} language - Language code
 * @returns {Promise<TranscriptionJob>} - Created job
 */
export async function startTranscriptionJob(videoId, userId, language = 'auto') {
    try {
        // Get video and user
        const video = await Video.findById(videoId, userId);
        if (!video) {
            throw new ApiError(404, 'Video not found');
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        // Calculate credits required
        const creditsRequired = TranscriptionJob.calculateCredits(video.durationSeconds || 60);
        
        // Check if user has enough credits
        if (!user.hasCredits(creditsRequired)) {
            throw new ApiError(402, `Insufficient credits. Required: ${creditsRequired}, Available: ${user.creditsRemaining}`);
        }

        // Create transcription job
        const job = await TranscriptionJob.create({
            videoId,
            userId,
            languageCode: language,
            modelUsed: config.ai.whisperModel
        });

        // Start processing asynchronously
        processTranscriptionJob(job.id).catch(error => {
            logger.error('Transcription job processing failed', { 
                jobId: job.id, 
                error: error.message 
            });
        });

        return job;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        logger.error('Failed to start transcription job', { error: error.message, videoId, userId });
        throw new ApiError(500, 'Failed to start transcription job');
    }
}

/**
 * Process transcription job (background task)
 * @param {string} jobId - Job ID
 */
async function processTranscriptionJob(jobId) {
    let job = null;
    let audioPath = null;

    try {
        // Get job
        job = await TranscriptionJob.findById(jobId);
        if (!job) {
            throw new Error('Job not found');
        }

        // Update status to processing
        await job.updateStatus('processing', { progress: 10 });

        // Get video
        const video = await Video.findById(job.videoId);
        if (!video) {
            throw new Error('Video not found');
        }

        // Get user
        const user = await User.findById(job.userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Calculate and consume credits
        const creditsRequired = TranscriptionJob.calculateCredits(video.durationSeconds || 60);
        await user.consumeCredits(creditsRequired, `Transcription for video ${video.originalName}`);

        await job.updateProgress(20);

        // Extract audio from video
        const videoPath = path.join(config.upload.uploadDir, video.filename);
        audioPath = await extractAudio(videoPath);

        await job.updateProgress(40);

        // Transcribe audio
        const whisperResult = await transcribeWithWhisper(audioPath, job.languageCode);

        await job.updateProgress(80);

        // Format and save captions
        const captions = formatCaptions(whisperResult);
        await job.saveCaptions(captions);

        await job.updateProgress(90);

        // Mark job as completed
        await job.markAsCompleted({
            wordCount: whisperResult.words?.length || 0,
            accuracyScore: calculateAccuracyScore(whisperResult),
            creditsUsed: creditsRequired
        });

        logger.info('Transcription job completed successfully', {
            jobId: job.id,
            videoId: job.videoId,
            language: whisperResult.language,
            captionCount: captions.length,
            wordCount: whisperResult.words?.length || 0
        });

    } catch (error) {
        logger.error('Transcription job failed', { 
            jobId: job?.id, 
            error: error.message 
        });

        if (job) {
            await job.markAsFailed(error.message);
        }
    } finally {
        // Clean up temporary audio file
        if (audioPath && fs.existsSync(audioPath)) {
            try {
                await fs.promises.unlink(audioPath);
                logger.info('Cleaned up temporary audio file', { audioPath });
            } catch (cleanupError) {
                logger.warn('Failed to clean up audio file', { audioPath, error: cleanupError.message });
            }
        }
    }
}

/**
 * Get transcription job status
 * @param {string} jobId - Job ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Job status with captions if completed
 */
export async function getTranscriptionStatus(jobId, userId) {
    try {
        const job = await TranscriptionJob.findById(jobId, userId);
        if (!job) {
            throw new ApiError(404, 'Transcription job not found');
        }

        const result = job.toJSON();

        // Include captions if job is completed
        if (job.status === 'completed') {
            result.captions = await job.getCaptions();
        }

        return result;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        logger.error('Failed to get transcription status', { error: error.message, jobId, userId });
        throw new ApiError(500, 'Failed to get transcription status');
    }
}

/**
 * Get supported languages
 */
export function getSupportedLanguages() {
    return SUPPORTED_LANGUAGES;
}

/**
 * Generate SRT subtitle file from captions
 * @param {Object[]} captions - Array of caption objects
 * @returns {string} - SRT file content
 */
export function generateSRT(captions) {
    return captions.map((caption, index) => {
        const startTime = formatSRTTime(caption.startTime);
        const endTime = formatSRTTime(caption.endTime);
        return `${index + 1}\n${startTime} --> ${endTime}\n${caption.text}\n`;
    }).join('\n');
}

/**
 * Format seconds to SRT timestamp (HH:MM:SS,mmm)
 */
function formatSRTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

/**
 * Generate VTT subtitle file from captions
 * @param {Object[]} captions - Array of caption objects
 * @returns {string} - VTT file content
 */
export function generateVTT(captions) {
    const header = 'WEBVTT\n\n';
    const cues = captions.map((caption, index) => {
        const startTime = formatVTTTime(caption.startTime);
        const endTime = formatVTTTime(caption.endTime);
        return `${index + 1}\n${startTime} --> ${endTime}\n${caption.text}\n`;
    }).join('\n');

    return header + cues;
}

/**
 * Format seconds to VTT timestamp (HH:MM:SS.mmm)
 */
function formatVTTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

/**
 * Synchronous transcription (for smaller files)
 * @param {string} videoId - Video ID
 * @param {string} userId - User ID
 * @param {string} language - Language code
 * @returns {Promise<Object>} - Transcription result
 */
export async function transcribeVideoSync(videoId, userId, language = 'auto') {
    let audioPath = null;

    try {
        // Get video and user
        const video = await Video.findById(videoId, userId);
        if (!video) {
            throw new ApiError(404, 'Video not found');
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        // Calculate credits required
        const creditsRequired = TranscriptionJob.calculateCredits(video.durationSeconds || 60);
        
        // Check if user has enough credits
        if (!user.hasCredits(creditsRequired)) {
            throw new ApiError(402, `Insufficient credits. Required: ${creditsRequired}, Available: ${user.creditsRemaining}`);
        }

        // Consume credits upfront for sync transcription
        await user.consumeCredits(creditsRequired, `Sync transcription for video ${video.originalName}`);

        // Extract audio from video
        const videoPath = path.join(config.upload.uploadDir, video.filename);
        audioPath = await extractAudio(videoPath);

        // Transcribe audio
        const whisperResult = await transcribeWithWhisper(audioPath, language);

        // Format captions
        const captions = formatCaptions(whisperResult);

        // Create completed job record
        const job = await TranscriptionJob.create({
            videoId,
            userId,
            languageCode: language,
            modelUsed: config.ai.whisperModel
        });

        await job.saveCaptions(captions);
        await job.markAsCompleted({
            wordCount: whisperResult.words?.length || 0,
            accuracyScore: calculateAccuracyScore(whisperResult),
            creditsUsed: creditsRequired
        });

        return {
            success: true,
            language: whisperResult.language,
            duration: whisperResult.duration,
            text: whisperResult.text,
            captions,
            wordCount: whisperResult.words?.length || 0,
            jobId: job.id
        };

    } finally {
        // Clean up temporary audio file
        if (audioPath && fs.existsSync(audioPath)) {
            try {
                await fs.promises.unlink(audioPath);
                logger.info('Cleaned up temporary audio file', { audioPath });
            } catch (cleanupError) {
                logger.warn('Failed to clean up audio file', { audioPath, error: cleanupError.message });
            }
        }
    }
}

/**
 * Calculate accuracy score from Whisper result
 */
function calculateAccuracyScore(whisperResult) {
    if (!whisperResult.words || whisperResult.words.length === 0) {
        return null;
    }

    // Calculate average confidence from words
    const totalConfidence = whisperResult.words.reduce((sum, word) => {
        return sum + (word.confidence || 0.8); // Default confidence if not provided
    }, 0);

    return Math.round((totalConfidence / whisperResult.words.length) * 100) / 100;
}