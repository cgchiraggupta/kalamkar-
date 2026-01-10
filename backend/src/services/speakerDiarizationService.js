/**
 * Kalakar - Speaker Diarization Service
 *
 * Speaker identification and diarization for multi-speaker transcription.
 * Supports:
 * - Simple energy-based speaker change detection
 * - Integration with pyannote-audio (when available)
 * - Speaker labeling in transcription
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

const execAsync = promisify(exec);

/**
 * Check if pyannote is available
 */
async function isPyannotAvailable() {
    try {
        const scriptPath = path.join(process.cwd(), 'backend', 'scripts', 'check_pyannote.py');
        if (fs.existsSync(scriptPath)) {
            await execAsync(`python3 "${scriptPath}"`, { timeout: 10000 });
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

/**
 * Simple speaker change detection using audio energy analysis
 * This is a fallback when pyannote is not available
 */
async function detectSpeakerChangesSimple(audioPath, segments) {
    try {
        // Use FFmpeg to analyze audio levels at segment boundaries
        const command = `ffmpeg -i "${audioPath}" -af "silencedetect=noise=-30dB:d=0.5" -f null - 2>&1`;
        const { stdout } = await execAsync(command, { timeout: 120000 });

        // Parse silence detection to find potential speaker changes
        const silencePattern = /silence_end: ([\d.]+)/g;
        const silenceEnds = [];
        let match;
        while ((match = silencePattern.exec(stdout)) !== null) {
            silenceEnds.push(parseFloat(match[1]));
        }

        // Simple heuristic: assign alternating speakers at silence boundaries
        let currentSpeaker = 1;
        const speakerChangeTimes = silenceEnds.filter(time => {
            // Filter to significant silences (potential speaker changes)
            return time > 1.0;
        });

        // Map segments to speakers based on timing
        const diarizedSegments = segments.map((segment, index) => {
            // Find if there's a silence (potential speaker change) just before this segment
            const precedingSilence = speakerChangeTimes.find(time =>
                time > segment.start - 0.5 && time < segment.start + 0.3
            );

            if (precedingSilence && index > 0) {
                currentSpeaker = currentSpeaker === 1 ? 2 : 1;
            }

            return {
                ...segment,
                speaker: `Speaker ${currentSpeaker}`,
                speakerId: currentSpeaker
            };
        });

        // Count unique speakers
        const uniqueSpeakers = [...new Set(diarizedSegments.map(s => s.speakerId))];

        return {
            success: true,
            method: 'energy_based',
            speakerCount: uniqueSpeakers.length,
            segments: diarizedSegments,
            speakers: uniqueSpeakers.map(id => ({
                id: id,
                name: `Speaker ${id}`,
                totalDuration: diarizedSegments
                    .filter(s => s.speakerId === id)
                    .reduce((sum, s) => sum + (s.end - s.start), 0)
            }))
        };
    } catch (error) {
        logger.error('Simple speaker detection failed', { error: error.message });
        // Return segments with default speaker
        return {
            success: true,
            method: 'fallback',
            speakerCount: 1,
            segments: segments.map(s => ({ ...s, speaker: 'Speaker 1', speakerId: 1 })),
            speakers: [{ id: 1, name: 'Speaker 1', totalDuration: 0 }]
        };
    }
}

/**
 * Advanced speaker diarization using pyannote-audio
 */
async function diarizeWithPyannote(audioPath) {
    const scriptPath = path.join(
        process.cwd().includes('/backend') ? process.cwd() : path.join(process.cwd(), 'backend'),
        'scripts',
        'speaker_diarize.py'
    );

    if (!fs.existsSync(scriptPath)) {
        throw new Error('Diarization script not found');
    }

    const command = `python3 "${scriptPath}" "${audioPath}"`;

    try {
        const { stdout, stderr } = await execAsync(command, { timeout: 300000 });

        if (stderr && stderr.includes('Error')) {
            logger.warn('Pyannote stderr', { stderr: stderr.substring(0, 200) });
        }

        const result = JSON.parse(stdout.trim());

        if (!result.success) {
            throw new Error(result.error || 'Diarization failed');
        }

        return {
            success: true,
            method: 'pyannote',
            speakerCount: result.speaker_count,
            segments: result.segments,
            speakers: result.speakers
        };
    } catch (error) {
        logger.error('Pyannote diarization failed', { error: error.message });
        throw error;
    }
}

/**
 * Main diarization function - tries pyannote first, falls back to simple detection
 */
export async function diarizeAudio(audioPath, transcriptionSegments = []) {
    try {
        logger.info('Starting speaker diarization', { audioPath });

        // Check if advanced diarization is available
        const hasPyannote = await isPyannotAvailable();

        if (hasPyannote) {
            try {
                const result = await diarizeWithPyannote(audioPath);
                logger.info('Pyannote diarization completed', {
                    speakerCount: result.speakerCount
                });
                return result;
            } catch (pyannoteError) {
                logger.warn('Pyannote failed, falling back to simple detection', {
                    error: pyannoteError.message
                });
            }
        }

        // Fallback to simple detection
        const result = await detectSpeakerChangesSimple(audioPath, transcriptionSegments);
        logger.info('Simple speaker detection completed', {
            speakerCount: result.speakerCount,
            method: result.method
        });
        return result;

    } catch (error) {
        logger.error('Speaker diarization failed', { error: error.message, audioPath });
        // Return a default single-speaker result
        return {
            success: true,
            method: 'default',
            speakerCount: 1,
            segments: transcriptionSegments.map(s => ({
                ...s,
                speaker: 'Speaker 1',
                speakerId: 1
            })),
            speakers: [{ id: 1, name: 'Speaker 1', totalDuration: 0 }]
        };
    }
}

/**
 * Merge transcription segments with diarization results
 */
export function mergeTranscriptionWithSpeakers(transcriptionResult, diarizationResult) {
    if (!diarizationResult || !diarizationResult.success) {
        // Return transcription as-is with default speaker
        return {
            ...transcriptionResult,
            speakerCount: 1,
            segments: transcriptionResult.segments.map(s => ({
                ...s,
                speaker: 'Speaker 1',
                speakerId: 1
            }))
        };
    }

    const diarizedSegments = diarizationResult.segments || [];

    // Match transcription segments with diarization segments by time overlap
    const mergedSegments = transcriptionResult.segments.map(segment => {
        // Find the diarization segment that overlaps most with this transcription segment
        let bestMatch = null;
        let maxOverlap = 0;

        for (const diarSegment of diarizedSegments) {
            const overlapStart = Math.max(segment.start, diarSegment.start || 0);
            const overlapEnd = Math.min(segment.end, diarSegment.end || segment.end);
            const overlap = Math.max(0, overlapEnd - overlapStart);

            if (overlap > maxOverlap) {
                maxOverlap = overlap;
                bestMatch = diarSegment;
            }
        }

        return {
            ...segment,
            speaker: bestMatch?.speaker || 'Speaker 1',
            speakerId: bestMatch?.speakerId || 1
        };
    });

    return {
        ...transcriptionResult,
        speakerCount: diarizationResult.speakerCount,
        speakers: diarizationResult.speakers,
        segments: mergedSegments
    };
}

/**
 * Format captions with speaker labels
 */
export function formatCaptionsWithSpeakers(captions, includeLabels = true) {
    if (!includeLabels) {
        return captions;
    }

    let lastSpeakerId = null;

    return captions.map(caption => {
        const speakerId = caption.speakerId || 1;
        const speakerLabel = caption.speaker || `Speaker ${speakerId}`;

        // Only add speaker label if speaker changed
        if (speakerId !== lastSpeakerId) {
            lastSpeakerId = speakerId;
            return {
                ...caption,
                text: `[${speakerLabel}] ${caption.text}`,
                showSpeakerLabel: true
            };
        }

        return {
            ...caption,
            showSpeakerLabel: false
        };
    });
}

/**
 * Get available diarization methods
 */
export async function getAvailableMethods() {
    const methods = [
        {
            id: 'energy_based',
            name: 'Basic Detection',
            description: 'Simple speaker change detection using audio energy analysis',
            available: true
        }
    ];

    const hasPyannote = await isPyannotAvailable();
    methods.unshift({
        id: 'pyannote',
        name: 'Advanced (Pyannote)',
        description: 'AI-powered speaker diarization with voice embedding',
        available: hasPyannote
    });

    return methods;
}

export default {
    diarizeAudio,
    mergeTranscriptionWithSpeakers,
    formatCaptionsWithSpeakers,
    getAvailableMethods
};
