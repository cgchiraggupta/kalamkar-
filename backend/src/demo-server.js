/**
 * Kalakar Demo Server
 * 
 * Simplified server for demonstration without database setup
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

import config from './config/index.js';
import logger from './utils/logger.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Routes (simplified versions)
import healthRoutes from './routes/healthRoutes.js';
import { videoUpload, getFileInfo } from './services/uploadService.js';
import { transcribeVideoSync, getSupportedLanguages } from './services/transcriptionService.js';
import { asyncHandler, Errors } from './middleware/errorHandler.js';

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// ======================
// SECURITY MIDDLEWARE
// ======================

app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const corsOptions = {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
};
app.use(cors(corsOptions));

app.use(globalLimiter);

// ======================
// PARSING & LOGGING
// ======================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
        logger[logLevel](`${req.method} ${req.path}`, {
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
        });
    });
    next();
});

// ======================
// STATIC FILES
// ======================

const uploadsPath = path.resolve(config.upload.uploadDir);
app.use('/uploads', express.static(uploadsPath));

// ======================
// DEMO API ROUTES
// ======================

app.use('/api/health', healthRoutes);

// Demo video upload
app.post('/api/videos/upload', videoUpload.single('video'), asyncHandler(async (req, res) => {
    if (!req.file) {
        throw Errors.badRequest('No video file provided');
    }

    const fileInfo = getFileInfo(req.file);
    
    logger.info('Demo video uploaded', {
        id: fileInfo.id,
        size: fileInfo.sizeFormatted,
        originalName: fileInfo.originalName,
    });

    res.status(201).json({
        success: true,
        message: 'Video uploaded successfully',
        data: {
            video: fileInfo,
        },
    });
}));

// Demo transcription
app.post('/api/transcription/sync', asyncHandler(async (req, res) => {
    const { videoId, language = 'auto' } = req.body;

    if (!videoId) {
        throw Errors.badRequest('Video ID is required');
    }

    logger.info('Demo transcription started', { videoId, language });

    // For demo, we'll simulate the transcription process
    try {
        // Build video path
        const videoPath = path.join(config.upload.uploadDir, `${videoId}.mp4`);
        
        // Use the actual transcription service but without database
        const result = await transcribeVideoDemo(videoPath, language);

        res.json({
            success: true,
            message: 'Transcription completed',
            data: result,
        });
    } catch (error) {
        logger.error('Demo transcription failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'TRANSCRIPTION_FAILED',
            message: error.message
        });
    }
}));

// Demo transcription function (simplified)
async function transcribeVideoDemo(videoPath, language) {
    const fs = await import('fs');
    
    // Check if video exists
    if (!fs.existsSync(videoPath)) {
        throw new Error('Video file not found');
    }

    // For demo purposes, return mock data if Whisper is not available
    try {
        // Try to use actual Whisper transcription (without database dependencies)
        const path = await import('path');
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);

        // Extract audio
        const audioPath = videoPath.replace(/\.[^.]+$/, '.mp3');
        const ffmpegCommand = `ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -ar 16000 -ac 1 -q:a 4 -y "${audioPath}"`;
        
        try {
            await execAsync(ffmpegCommand, { timeout: 300000 });
        } catch (error) {
            throw new Error('FFmpeg not available for audio extraction');
        }

        // Try Whisper transcription
        const scriptPath = path.join(process.cwd(), 'scripts', 'run_whisper.sh');
        const whisperModel = 'small';
        
        let command = `bash "${scriptPath}" "${audioPath}" "${whisperModel}"`;
        if (language !== 'auto') {
            command += ` "${language}"`;
        }

        try {
            const { stdout } = await execAsync(command, { 
                timeout: 600000,
                maxBuffer: 1024 * 1024 * 10 
            });

            // Parse JSON output
            let cleanOutput = stdout.trim();
            if (cleanOutput.includes('\n')) {
                const lines = cleanOutput.split('\n');
                let jsonStartIndex = -1;
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].trim().startsWith('{')) {
                        jsonStartIndex = i;
                        break;
                    }
                }
                if (jsonStartIndex !== -1) {
                    cleanOutput = lines.slice(jsonStartIndex).join('\n').trim();
                }
            }

            const result = JSON.parse(cleanOutput);
            
            if (!result.success) {
                throw new Error(result.error || 'Whisper transcription failed');
            }

            // Format captions
            const captions = [];
            if (result.segments) {
                result.segments.forEach((segment, index) => {
                    const caption = {
                        id: `cap_${index + 1}`,
                        text: segment.text.trim(),
                        startTime: segment.start,
                        endTime: segment.end,
                        words: [],
                    };

                    if (result.words) {
                        caption.words = result.words
                            .filter(word => word.start >= segment.start && word.end <= segment.end)
                            .map(word => ({
                                text: word.word.trim(),
                                startTime: word.start,
                                endTime: word.end,
                            }));
                    }

                    captions.push(caption);
                });
            }

            // Clean up audio file
            if (fs.existsSync(audioPath)) {
                await fs.promises.unlink(audioPath);
            }

            return {
                success: true,
                language: result.language,
                duration: result.segments && result.segments.length > 0 
                    ? result.segments[result.segments.length - 1].end 
                    : 0,
                text: result.text,
                captions,
                wordCount: result.words?.length || 0,
            };

        } catch (whisperError) {
            // Clean up audio file
            if (fs.existsSync(audioPath)) {
                await fs.promises.unlink(audioPath);
            }
            throw whisperError;
        }

    } catch (error) {
        logger.warn('Whisper not available, using demo data', { error: error.message });
        
        // Return demo transcription data
        return {
            success: true,
            language: 'hi',
            duration: 10.5,
            text: 'यह एक डेमो ट्रांसक्रिप्शन है। कलाकार प्लेटफॉर्म आपके वीडियो के लिए सटीक कैप्शन बनाता है।',
            captions: [
                {
                    id: 'cap_1',
                    text: 'यह एक डेमो ट्रांसक्रिप्शन है।',
                    startTime: 0,
                    endTime: 3.5,
                    words: [
                        { text: 'यह', startTime: 0, endTime: 0.5 },
                        { text: 'एक', startTime: 0.5, endTime: 1.0 },
                        { text: 'डेमो', startTime: 1.0, endTime: 2.0 },
                        { text: 'ट्रांसक्रिप्शन', startTime: 2.0, endTime: 3.0 },
                        { text: 'है।', startTime: 3.0, endTime: 3.5 }
                    ]
                },
                {
                    id: 'cap_2',
                    text: 'कलाकार प्लेटफॉर्म आपके वीडियो के लिए सटीक कैप्शन बनाता है।',
                    startTime: 4.0,
                    endTime: 10.5,
                    words: [
                        { text: 'कलाकार', startTime: 4.0, endTime: 4.8 },
                        { text: 'प्लेटफॉर्म', startTime: 4.8, endTime: 5.8 },
                        { text: 'आपके', startTime: 5.8, endTime: 6.3 },
                        { text: 'वीडियो', startTime: 6.3, endTime: 7.0 },
                        { text: 'के', startTime: 7.0, endTime: 7.2 },
                        { text: 'लिए', startTime: 7.2, endTime: 7.8 },
                        { text: 'सटीक', startTime: 7.8, endTime: 8.5 },
                        { text: 'कैप्शन', startTime: 8.5, endTime: 9.2 },
                        { text: 'बनाता', startTime: 9.2, endTime: 9.8 },
                        { text: 'है।', startTime: 9.8, endTime: 10.5 }
                    ]
                }
            ],
            wordCount: 15,
            demo: true
        };
    }
}

// Get supported languages
app.get('/api/transcription/languages', asyncHandler(async (req, res) => {
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
}));

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'Kalakar Demo API',
        version: '1.0.0',
        description: 'AI-Powered Video Caption Platform (Demo Mode)',
        demo: true,
        features: [
            'Video Upload',
            'AI Transcription (Local Whisper or Demo Data)',
            'Caption Generation',
            'Multi-language Support'
        ]
    });
});

// ======================
// ERROR HANDLING
// ======================

app.use(notFoundHandler);
app.use(errorHandler);

// ======================
// SERVER STARTUP
// ======================

const server = app.listen(config.port, () => {
    logger.info(`
🎬 Kalakar Demo Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 URL: http://localhost:${config.port}
🌍 Environment: ${config.nodeEnv}
📁 Uploads: ${uploadsPath}
🔒 CORS: ${corsOptions.origin.join(', ')}
🎭 Mode: DEMO (No Database Required)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully...');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

export default app;