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

// =====================
// AUDIO ENHANCEMENT API
// =====================

export interface AudioAnalysis {
    meanVolume: number | null;
    maxVolume: number | null;
    quality: 'too_loud' | 'too_quiet' | 'slightly_quiet' | 'good' | 'unknown';
    recommendations: string[];
}

export interface EnhancementPresets {
    noiseReduction: string[];
    normalize: string[];
    voiceClarity: string[];
}

export interface AudioEnhanceOptions {
    noiseReduction?: 'light' | 'medium' | 'heavy';
    normalize?: boolean;
    normalizePreset?: 'standard' | 'podcast' | 'broadcast';
    voiceClarity?: 'light' | 'medium' | 'heavy';
    applyNoise?: boolean;
    applyClarity?: boolean;
}

export interface AudioEnhanceResult {
    success: boolean;
    enhanceId: string;
    videoId: string;
    filename: string;
    url: string;
    size: number;
    sizeFormatted: string;
    enhancements: {
        noiseReduction: string;
        normalize: string;
        voiceClarity: string;
    };
}

/**
 * Get available audio enhancement presets
 */
export async function getAudioPresets() {
    return apiRequest<{ presets: EnhancementPresets }>('/api/audio/presets');
}

/**
 * Analyze audio levels in a video
 */
export async function analyzeAudio(videoId: string) {
    return apiRequest<{ videoId: string; analysis: AudioAnalysis }>('/api/audio/analyze', {
        method: 'POST',
        body: JSON.stringify({ videoId }),
    });
}

/**
 * Enhance audio in a video
 */
export async function enhanceAudio(videoId: string, options: AudioEnhanceOptions = {}) {
    return apiRequest<AudioEnhanceResult>('/api/audio/enhance', {
        method: 'POST',
        body: JSON.stringify({ videoId, options }),
    });
}

/**
 * Quick enhance audio with a preset
 */
export async function quickEnhanceAudio(videoId: string, preset: 'balanced' | 'podcast' | 'music' | 'clean' = 'balanced') {
    return apiRequest<AudioEnhanceResult>('/api/audio/quick-enhance', {
        method: 'POST',
        body: JSON.stringify({ videoId, preset }),
    });
}

// =====================
// PAYMENT API
// =====================

export interface SubscriptionPlan {
    id: string;
    name: string;
    description: string;
    priceMonthly: number;
    priceYearly: number;
    credits: number;
    features: string[];
}

export interface CreditPackage {
    id: string;
    name: string;
    credits: number;
    price: number;
    description: string;
    popular?: boolean;
}

export interface PaymentOrder {
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    planName?: string;
    packageName?: string;
    billingCycle?: string;
    credits?: number;
}

export interface PlansResponse {
    subscriptions: SubscriptionPlan[];
    creditPackages: CreditPackage[];
    currency: string;
    razorpayKeyId: string;
}

/**
 * Get all subscription plans and credit packages
 */
export async function getPlans() {
    return apiRequest<PlansResponse>('/api/payments/plans');
}

/**
 * Check if payment gateway is configured
 */
export async function getPaymentStatus() {
    return apiRequest<{ configured: boolean; gateway: string }>('/api/payments/status');
}

/**
 * Create order for subscription
 */
export async function createSubscriptionOrder(planId: string, billingCycle: 'monthly' | 'yearly' = 'monthly') {
    return apiRequest<{ order: PaymentOrder }>('/api/payments/subscribe', {
        method: 'POST',
        body: JSON.stringify({ planId, billingCycle }),
    });
}

/**
 * Create order for credit package
 */
export async function createCreditOrder(packageId: string) {
    return apiRequest<{ order: PaymentOrder }>('/api/payments/credits', {
        method: 'POST',
        body: JSON.stringify({ packageId }),
    });
}

/**
 * Verify payment after Razorpay checkout
 */
export async function verifyPayment(razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string) {
    return apiRequest<{ success: boolean; message: string }>('/api/payments/verify', {
        method: 'POST',
        body: JSON.stringify({ razorpay_order_id, razorpay_payment_id, razorpay_signature }),
    });
}

/**
 * Get payment history
 */
export async function getPaymentHistory(limit: number = 20) {
    return apiRequest<{ payments: any[] }>(`/api/payments/history?limit=${limit}`);
}

/**
 * Get current subscription status
 */
export async function getSubscriptionStatus() {
    return apiRequest<{
        currentPlan: string;
        planDetails: SubscriptionPlan;
        expiresAt: string | null;
        isExpired: boolean;
        creditsRemaining: number;
    }>('/api/payments/subscription');
}

// =====================
// PROJECTS API
// =====================

export interface Project {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    thumbnailUrl: string | null;
    isPublic: boolean;
    videoCount: number;
    videos: ProjectVideo[];
    createdAt: string;
    updatedAt: string;
    stats?: ProjectStats;
}

export interface ProjectVideo {
    id: string;
    original_name: string;
    filename: string;
    duration_seconds: number;
    thumbnail_url: string | null;
    status: string;
    created_at: string;
    addedAt: string;
}

export interface ProjectStats {
    videoCount: number;
    totalDurationSeconds: number;
    totalDurationFormatted: string;
    totalSize: number;
    totalSizeFormatted: string;
    lastUpdated: string;
}

/**
 * Create a new project
 */
export async function createProject(name: string, description?: string, isPublic: boolean = false) {
    return apiRequest<{ project: Project }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name, description, isPublic }),
    });
}

/**
 * Get all projects for current user
 */
export async function getProjects(options: { limit?: number; offset?: number; includeVideos?: boolean } = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.includeVideos) params.append('includeVideos', 'true');

    const queryString = params.toString();
    return apiRequest<{ projects: Project[]; pagination: { limit: number; offset: number; total: number } }>(
        `/api/projects${queryString ? `?${queryString}` : ''}`
    );
}

/**
 * Get single project by ID
 */
export async function getProject(id: string) {
    return apiRequest<{ project: Project; stats: ProjectStats }>(`/api/projects/${id}`);
}

/**
 * Update project
 */
export async function updateProject(id: string, data: { name?: string; description?: string; isPublic?: boolean }) {
    return apiRequest<{ project: Project }>(`/api/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

/**
 * Delete project
 */
export async function deleteProject(id: string) {
    return apiRequest(`/api/projects/${id}`, { method: 'DELETE' });
}

/**
 * Add video to project
 */
export async function addVideoToProject(projectId: string, videoId: string) {
    return apiRequest<{ projectId: string; videoId: string }>(`/api/projects/${projectId}/videos`, {
        method: 'POST',
        body: JSON.stringify({ videoId }),
    });
}

/**
 * Remove video from project
 */
export async function removeVideoFromProject(projectId: string, videoId: string) {
    return apiRequest(`/api/projects/${projectId}/videos/${videoId}`, { method: 'DELETE' });
}

/**
 * Get videos in a project
 */
export async function getProjectVideos(projectId: string) {
    return apiRequest<{ videos: ProjectVideo[]; total: number }>(`/api/projects/${projectId}/videos`);
}

// =====================
// ANALYTICS API
// =====================

export interface AnalyticsSummary {
    creditsRemaining: number;
    creditsUsed: number;
    subscriptionTier: string;
    memberSince: string;
    videoCount: number;
    transcriptionCount: number;
    exportCount: number;
    projectCount: number;
    totalWords: number;
}

export interface UsageStats {
    timeline: Array<{
        date: string;
        actions: number;
        creditsUsed: number;
        successRate: number;
    }>;
    topActions: Array<{ action: string; count: number }>;
    summary: {
        totalActions: number;
        totalCredits: number;
        averageCreditsPerDay: number;
        successRate: number;
    };
}

export interface TranscriptionAnalytics {
    total: number;
    completed: number;
    failed: number;
    successRate: number;
    totalWords: number;
    totalCreditsUsed: number;
    avgProcessingTime: number;
    avgAccuracy: number;
    languages: Array<{ code: string; count: number; words: number; credits: number }>;
}

export interface ExportAnalytics {
    total: number;
    completed: number;
    failed: number;
    totalSize: number;
    types: Array<{ type: string; count: number; totalSize: number }>;
    qualityBreakdown: Record<string, number>;
}

export interface DashboardData {
    summary: AnalyticsSummary;
    stats: UsageStats;
    transcriptions: TranscriptionAnalytics;
    exports: ExportAnalytics;
    period: {
        days: number;
        startDate: string;
        endDate: string;
    };
}

/**
 * Get user analytics summary
 */
export async function getAnalyticsSummary() {
    return apiRequest<AnalyticsSummary>('/api/analytics/summary');
}

/**
 * Get usage statistics over time
 */
export async function getUsageStats(period: 'hour' | 'day' | 'week' | 'month' = 'day', days: number = 30) {
    return apiRequest<UsageStats>(`/api/analytics/stats?period=${period}&days=${days}`);
}

/**
 * Get transcription analytics
 */
export async function getTranscriptionAnalytics(days: number = 30) {
    return apiRequest<TranscriptionAnalytics>(`/api/analytics/transcriptions?days=${days}`);
}

/**
 * Get export analytics
 */
export async function getExportAnalytics(days: number = 30) {
    return apiRequest<ExportAnalytics>(`/api/analytics/exports?days=${days}`);
}

/**
 * Get full dashboard data in one call
 */
export async function getDashboardData(days: number = 30) {
    return apiRequest<DashboardData>(`/api/analytics/dashboard?days=${days}`);
}

// =====================
// MULTI-SPEAKER TRANSCRIPTION API
// =====================

export interface Speaker {
    id: number;
    name: string;
    totalDuration: number;
}

export interface DiarizationMethod {
    id: string;
    name: string;
    description: string;
    available: boolean;
}

export interface MultiSpeakerTranscriptionResult extends TranscriptionResult {
    speakerCount: number;
    speakers: Speaker[];
    diarizationMethod: string;
}

/**
 * Transcribe video with multi-speaker detection
 */
export async function transcribeWithSpeakers(videoId: string, language: string = 'auto', enableSpeakers: boolean = true) {
    return apiRequest<MultiSpeakerTranscriptionResult>('/api/transcription/speakers', {
        method: 'POST',
        body: JSON.stringify({ videoId, language, enableSpeakers }),
    });
}

/**
 * Get available speaker diarization methods
 */
export async function getDiarizationMethods() {
    return apiRequest<{ methods: DiarizationMethod[] }>('/api/transcription/diarization/methods');
}