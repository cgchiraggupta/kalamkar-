/**
 * API Configuration for Frontend
 * 
 * Centralized API client with proper error handling
 * API keys are NEVER stored here - all sensitive calls go through backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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

export { API_BASE_URL };
