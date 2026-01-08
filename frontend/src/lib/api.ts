/**
 * API Configuration for Frontend
 * 
 * Centralized API client with proper error handling
 * API keys are NEVER stored here - all sensitive calls go through backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

interface UploadProgressCallback {
    (progress: number): void;
}

/**
 * Generic API request wrapper with error handling
 */
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    try {
        const url = `${API_BASE_URL}${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: data.error || 'Request failed',
                message: data.message || 'An error occurred',
            };
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        return {
            success: false,
            error: 'NETWORK_ERROR',
            message: 'Failed to connect to server. Please check your connection.',
        };
    }
}

/**
 * Upload video with progress tracking
 */
export async function uploadVideo(
    file: File,
    onProgress?: UploadProgressCallback
): Promise<ApiResponse<{ video: VideoInfo }>> {
    return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('video', file);

        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable && onProgress) {
                const progress = Math.round((event.loaded / event.total) * 100);
                onProgress(progress);
            }
        });

        xhr.addEventListener('load', () => {
            try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
            } catch {
                resolve({
                    success: false,
                    error: 'PARSE_ERROR',
                    message: 'Failed to parse server response',
                });
            }
        });

        xhr.addEventListener('error', () => {
            resolve({
                success: false,
                error: 'UPLOAD_ERROR',
                message: 'Failed to upload video. Please try again.',
            });
        });

        xhr.open('POST', `${API_BASE_URL}/api/videos/upload`);
        xhr.send(formData);
    });
}

/**
 * Get video info
 */
export async function getVideo(id: string) {
    return apiRequest<{ video: VideoInfo }>(`/api/videos/${id}`);
}

/**
 * Delete video
 */
export async function deleteVideo(id: string) {
    return apiRequest(`/api/videos/${id}`, { method: 'DELETE' });
}

/**
 * Health check
 */
export async function checkHealth() {
    return apiRequest<{ status: string }>('/api/health');
}

// =====================
// TRANSCRIPTION API
// =====================

/**
 * Get supported languages for transcription
 */
export async function getTranscriptionLanguages() {
    return apiRequest<{ languages: Language[] }>('/api/transcription/languages');
}

/**
 * Start asynchronous transcription job
 */
export async function startTranscription(videoId: string, language: string = 'auto') {
    return apiRequest<TranscriptionJobStart>('/api/transcription/start', {
        method: 'POST',
        body: JSON.stringify({ videoId, language }),
    });
}

/**
 * Get transcription job status
 */
export async function getTranscriptionStatus(jobId: string) {
    return apiRequest<{ job: TranscriptionJob }>(`/api/transcription/status/${jobId}`);
}

/**
 * Synchronous transcription (waits for completion)
 * Best for smaller videos or when you need immediate results
 */
export async function transcribeSync(videoId: string, language: string = 'auto') {
    return apiRequest<TranscriptionResult>('/api/transcription/sync', {
        method: 'POST',
        body: JSON.stringify({ videoId, language }),
    });
}

/**
 * Export captions as SRT or VTT file
 */
export async function exportCaptions(
    captions: Caption[],
    format: 'srt' | 'vtt' = 'srt'
): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/api/transcription/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captions, format }),
    });

    if (!response.ok) {
        throw new Error('Failed to export captions');
    }

    return response.blob();
}

/**
 * Poll for transcription completion
 * Resolves when transcription is complete or fails
 */
export async function waitForTranscription(
    jobId: string,
    onProgress?: (status: TranscriptionJob) => void,
    pollInterval: number = 2000,
    maxAttempts: number = 150 // 5 minutes max
): Promise<TranscriptionResult> {
    return new Promise((resolve, reject) => {
        let attempts = 0;

        const poll = async () => {
            attempts++;

            try {
                const response = await getTranscriptionStatus(jobId);

                if (!response.success || !response.data) {
                    reject(new Error(response.error || 'Failed to get transcription status'));
                    return;
                }

                const job = response.data.job;
                onProgress?.(job);

                if (job.status === 'completed' && job.result) {
                    resolve(job.result);
                    return;
                }

                if (job.status === 'failed') {
                    reject(new Error(job.error || 'Transcription failed'));
                    return;
                }

                if (attempts >= maxAttempts) {
                    reject(new Error('Transcription timed out'));
                    return;
                }

                // Continue polling
                setTimeout(poll, pollInterval);
            } catch (error) {
                reject(error);
            }
        };

        poll();
    });
}

// Types
export interface VideoInfo {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    sizeFormatted: string;
    url: string;
    status?: string;
    createdAt?: string;
}

export interface Caption {
    id: string;
    text: string;
    startTime: number;
    endTime: number;
    words?: Word[];
}

export interface Word {
    text: string;
    startTime: number;
    endTime: number;
    confidence?: number;
}

// Transcription Types
export interface Language {
    code: string;
    name: string;
}

export interface TranscriptionJobStart {
    jobId: string;
    videoId: string;
    status: string;
    statusUrl: string;
}

export interface TranscriptionJob {
    id: string;
    videoId: string;
    status: 'processing' | 'completed' | 'failed';
    progress: number;
    language: string;
    startedAt: string;
    completedAt?: string;
    error?: string;
    result?: TranscriptionResult;
}

export interface TranscriptionResult {
    success: boolean;
    language: string;
    duration: number;
    text: string;
    captions: Caption[];
    wordCount: number;
}

// Export Types
export interface CaptionStyle {
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    position?: 'top' | 'center' | 'bottom';
    bold?: boolean;
    italic?: boolean;
    shadow?: boolean;
}

export interface ExportOptions {
    quality?: 'low' | 'medium' | 'high';
    format?: 'mp4' | 'mov' | 'webm';
}

export interface ExportResult {
    success: boolean;
    exportId: string;
    outputPath: string;
    filename: string;
    url: string;
    size: number;
    sizeFormatted: string;
    quality: string;
    captionCount: number;
}

export interface ExportStatus {
    success: boolean;
    status: 'processing' | 'completed' | 'failed' | 'not_found';
    filename?: string;
    url?: string;
    size?: number;
    sizeFormatted?: string;
    createdAt?: string;
    message?: string;
}

export interface ExportPreview {
    videoId: string;
    style: CaptionStyle;
    captionCount: number;
    estimatedFileSize: string;
    estimatedProcessingTime: string;
}

/**
 * Export video with burned-in captions
 */
export async function exportVideoWithCaptions(
    videoId: string,
    captions: Caption[],
    style: CaptionStyle = {},
    options: ExportOptions = {}
) {
    return apiRequest<{ export: ExportResult }>('/api/export/video', {
        method: 'POST',
        body: JSON.stringify({ videoId, captions, style, options }),
    });
}

/**
 * Get export status
 */
export async function getExportStatus(exportId: string) {
    return apiRequest<{ export: ExportStatus }>(`/api/export/status/${exportId}`);
}

/**
 * Delete export
 */
export async function deleteExport(exportId: string) {
    return apiRequest(`/api/export/${exportId}`, { method: 'DELETE' });
}

/**
 * Generate export preview
 */
export async function getExportPreview(videoId: string, captions: Caption[], style: CaptionStyle = {}) {
    return apiRequest<{ preview: ExportPreview }>('/api/export/preview', {
        method: 'POST',
        body: JSON.stringify({ videoId, captions, style }),
    });
}

export { API_BASE_URL };