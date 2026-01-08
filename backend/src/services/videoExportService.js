/**
 * Kalakar - Video Export Service
 * 
 * Exports videos with burned-in captions using FFmpeg
 * Supports multiple caption styles and positioning
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
 * Generate SRT file from captions for FFmpeg
 * @param {Array} captions - Array of caption objects
 * @returns {string} - SRT content
 */
function generateSRTContent(captions) {
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
 * Generate FFmpeg subtitle filter for custom styling
 * @param {Object} style - Caption style object
 * @returns {string} - FFmpeg subtitle filter
 */
function generateSubtitleFilter(style) {
    const {
        fontFamily = 'Inter',
        fontSize = 24,
        color = '#FFFFFF',
        backgroundColor = 'rgba(0,0,0,0.8)',
        position = 'bottom',
        bold = true,
        italic = false,
        shadow = true
    } = style;

    // Convert hex color to RGB for FFmpeg
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    };

    const rgb = hexToRgb(color);
    const fontColor = `0x${color.replace('#', '')}`;

    // Position mapping
    const positionMap = {
        'top': 'Alignment=2,MarginV=50',
        'center': 'Alignment=2,MarginV=0',
        'bottom': 'Alignment=2,MarginV=50'
    };

    // Build style string for ASS format
    const styleOptions = [
        `FontName=${fontFamily}`,
        `FontSize=${fontSize}`,
        `PrimaryColour=&H${color.replace('#', '').split('').reverse().join('')}&`, // BGR format for ASS
        `BackColour=&H80000000&`, // Semi-transparent black background
        `Bold=${bold ? -1 : 0}`,
        `Italic=${italic ? -1 : 0}`,
        `Shadow=${shadow ? 2 : 0}`,
        positionMap[position] || positionMap.bottom
    ].join(',');

    return styleOptions;
}

/**
 * Export video with burned-in captions
 * @param {string} videoId - Video ID
 * @param {Array} captions - Array of caption objects
 * @param {Object} style - Caption style configuration
 * @param {Object} options - Export options
 * @returns {Promise<Object>} - Export result with file path
 */
export async function exportVideoWithCaptions(videoId, captions, style = {}, options = {}) {
    const {
        quality = 'high', // 'low', 'medium', 'high'
        format = 'mp4'
    } = options;

    let tempSrtPath = null;
    let outputPath = null;

    try {
        // Validate inputs
        if (!videoId) {
            throw new ApiError(400, 'Video ID is required');
        }

        if (!captions || captions.length === 0) {
            throw new ApiError(400, 'Captions are required for export');
        }

        // Find input video file
        const inputVideoPath = path.join(config.upload.uploadDir, `${videoId}.mp4`);
        if (!fs.existsSync(inputVideoPath)) {
            throw new ApiError(404, 'Video file not found');
        }

        logger.info('Starting video export with captions', {
            videoId,
            captionCount: captions.length,
            style,
            quality
        });

        // Generate unique export ID
        const exportId = uuidv4();
        
        // Create temporary SRT file
        tempSrtPath = path.join(config.upload.uploadDir, `temp_${exportId}.srt`);
        const srtContent = generateSRTContent(captions);
        await fs.promises.writeFile(tempSrtPath, srtContent, 'utf8');

        // Output file path
        outputPath = path.join(config.upload.uploadDir, `${videoId}_captioned_${exportId}.${format}`);

        // Build FFmpeg command
        const qualitySettings = {
            low: '-crf 28 -preset fast',
            medium: '-crf 23 -preset medium', 
            high: '-crf 18 -preset slow'
        };

        // Caption styling for FFmpeg subtitles filter
        const fontPath = '/System/Library/Fonts/Arial.ttf'; // Default system font
        const fontSize = style.fontSize || 24;
        const fontColor = style.color || '#FFFFFF';
        const shadowColor = style.shadow ? '#000000' : fontColor;
        
        // Position calculation (FFmpeg uses different coordinate system)
        let yPosition = 'main_h-text_h-50'; // bottom
        if (style.position === 'top') {
            yPosition = '50';
        } else if (style.position === 'center') {
            yPosition = '(main_h-text_h)/2';
        }

        // Build subtitle filter with custom styling
        const subtitleFilter = [
            `subtitles='${tempSrtPath.replace(/'/g, "\\'")}':`,
            `force_style='FontName=${style.fontFamily || 'Arial'}`,
            `FontSize=${fontSize}`,
            `PrimaryColour=&H${fontColor.replace('#', '').split('').reverse().join('')}&`,
            `OutlineColour=&H${shadowColor.replace('#', '').split('').reverse().join('')}&`,
            `BackColour=&H80000000&`,
            `Bold=${style.bold ? -1 : 0}`,
            `Italic=${style.italic ? -1 : 0}`,
            `Outline=${style.shadow ? 2 : 0}`,
            `Shadow=${style.shadow ? 1 : 0}`,
            `Alignment=2`,
            `MarginV=${style.position === 'top' ? 50 : style.position === 'center' ? 0 : 50}'`
        ].join(',');

        const ffmpegCommand = [
            'ffmpeg',
            '-i', `"${inputVideoPath}"`,
            '-vf', `"${subtitleFilter}"`,
            '-c:v', 'libx264',
            '-c:a', 'aac',
            qualitySettings[quality],
            '-y', // Overwrite output file
            `"${outputPath}"`
        ].join(' ');

        logger.info('Executing FFmpeg command', { command: ffmpegCommand });

        // Execute FFmpeg with timeout
        const { stdout, stderr } = await execAsync(ffmpegCommand, {
            timeout: 300000, // 5 minute timeout
            maxBuffer: 1024 * 1024 * 50 // 50MB buffer
        });

        if (stderr && !stderr.includes('frame=')) {
            logger.warn('FFmpeg stderr output', { stderr });
        }

        // Verify output file was created
        if (!fs.existsSync(outputPath)) {
            throw new Error('FFmpeg failed to create output file');
        }

        const outputStats = fs.statSync(outputPath);
        const inputStats = fs.statSync(inputVideoPath);

        logger.info('Video export completed successfully', {
            videoId,
            exportId,
            inputSize: inputStats.size,
            outputSize: outputStats.size,
            compressionRatio: ((inputStats.size - outputStats.size) / inputStats.size * 100).toFixed(1) + '%'
        });

        return {
            success: true,
            exportId,
            outputPath,
            filename: path.basename(outputPath),
            url: `/uploads/${path.basename(outputPath)}`,
            size: outputStats.size,
            sizeFormatted: formatBytes(outputStats.size),
            quality,
            captionCount: captions.length
        };

    } catch (error) {
        logger.error('Video export failed', {
            videoId,
            error: error.message,
            stack: error.stack
        });

        // Clean up output file if it exists but export failed
        if (outputPath && fs.existsSync(outputPath)) {
            try {
                await fs.promises.unlink(outputPath);
            } catch (cleanupError) {
                logger.warn('Failed to clean up failed export file', { outputPath });
            }
        }

        if (error instanceof ApiError) {
            throw error;
        }

        if (error.message.includes('ffmpeg')) {
            throw new ApiError(500, 'FFmpeg not available. Please ensure FFmpeg is installed.');
        }

        throw new ApiError(500, `Video export failed: ${error.message}`);

    } finally {
        // Clean up temporary SRT file
        if (tempSrtPath && fs.existsSync(tempSrtPath)) {
            try {
                await fs.promises.unlink(tempSrtPath);
                logger.info('Cleaned up temporary SRT file', { tempSrtPath });
            } catch (cleanupError) {
                logger.warn('Failed to clean up temporary SRT file', { tempSrtPath });
            }
        }
    }
}

/**
 * Get export status and file info
 * @param {string} exportId - Export ID
 * @returns {Object} - Export status
 */
export async function getExportStatus(exportId) {
    // In a real implementation, this would check a database
    // For now, we'll check if the file exists
    const pattern = new RegExp(`.*_captioned_${exportId}\\.(mp4|mov|webm)$`);
    const uploadDir = config.upload.uploadDir;
    
    try {
        const files = await fs.promises.readdir(uploadDir);
        const exportFile = files.find(file => pattern.test(file));
        
        if (exportFile) {
            const filePath = path.join(uploadDir, exportFile);
            const stats = fs.statSync(filePath);
            
            return {
                success: true,
                status: 'completed',
                filename: exportFile,
                url: `/uploads/${exportFile}`,
                size: stats.size,
                sizeFormatted: formatBytes(stats.size),
                createdAt: stats.birthtime
            };
        } else {
            return {
                success: false,
                status: 'not_found',
                message: 'Export not found'
            };
        }
    } catch (error) {
        logger.error('Failed to get export status', { exportId, error: error.message });
        return {
            success: false,
            status: 'error',
            message: 'Failed to check export status'
        };
    }
}

/**
 * Delete exported video file
 * @param {string} exportId - Export ID
 * @returns {boolean} - Success status
 */
export async function deleteExport(exportId) {
    const pattern = new RegExp(`.*_captioned_${exportId}\\.(mp4|mov|webm)$`);
    const uploadDir = config.upload.uploadDir;
    
    try {
        const files = await fs.promises.readdir(uploadDir);
        const exportFile = files.find(file => pattern.test(file));
        
        if (exportFile) {
            const filePath = path.join(uploadDir, exportFile);
            await fs.promises.unlink(filePath);
            logger.info('Deleted export file', { exportId, filename: exportFile });
            return true;
        }
        
        return false;
    } catch (error) {
        logger.error('Failed to delete export', { exportId, error: error.message });
        return false;
    }
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