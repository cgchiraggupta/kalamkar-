'use client';

import { useState, useCallback, useRef, DragEvent } from 'react';

interface VideoUploaderProps {
    onUploadComplete: (videoUrl: string, videoId: string) => void;
    onError?: (error: string) => void;
}

export default function VideoUploader({ onUploadComplete, onError }: VideoUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const validateFile = (file: File): string | null => {
        const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
        const maxSize = 500 * 1024 * 1024; // 500MB

        if (!allowedTypes.includes(file.type)) {
            return 'Invalid file type. Please upload MP4, MOV, WebM, or AVI files.';
        }

        if (file.size > maxSize) {
            return 'File too large. Maximum size is 500MB.';
        }

        return null;
    };

    const uploadFile = async (file: File) => {
        const validationError = validateFile(file);
        if (validationError) {
            setError(validationError);
            onError?.(validationError);
            return;
        }

        setIsUploading(true);
        setError(null);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('video', file);

            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    setUploadProgress(progress);
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        const videoUrl = `http://localhost:5000${response.data.video.url}`;
                        onUploadComplete(videoUrl, response.data.video.id);
                    } else {
                        throw new Error(response.message || 'Upload failed');
                    }
                } else {
                    throw new Error('Upload failed');
                }
                setIsUploading(false);
            });

            xhr.addEventListener('error', () => {
                setError('Failed to upload video. Please try again.');
                onError?.('Failed to upload video');
                setIsUploading(false);
            });

            xhr.open('POST', 'http://localhost:5000/api/videos/upload');
            xhr.send(formData);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Upload failed';
            setError(message);
            onError?.(message);
            setIsUploading(false);
        }
    };

    const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            uploadFile(files[0]);
        }
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            uploadFile(files[0]);
        }
    }, []);

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="w-full max-w-3xl mx-auto">
            <div
                className={`dropzone ${isDragging ? 'active' : ''} ${isUploading ? 'pointer-events-none opacity-70' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,.mp4,.mov,.webm,.avi"
                    onChange={handleFileSelect}
                    className="hidden"
                />

                {isUploading ? (
                    <div className="space-y-6">
                        {/* Upload Icon with Animation */}
                        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex-center animate-pulse">
                            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full max-w-md mx-auto">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-[var(--text-secondary)]">Uploading...</span>
                                <span className="text-[var(--accent-primary)] font-semibold">{uploadProgress}%</span>
                            </div>
                            <div className="h-3 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>

                        <p className="text-[var(--text-muted)] text-sm">
                            Please wait while your video is being uploaded...
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Upload Icon */}
                        <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-[var(--bg-elevated)] to-[var(--bg-tertiary)] border border-[var(--border-primary)] flex-center transition-transform hover:scale-105">
                            <svg className="w-12 h-12 text-[var(--accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </div>

                        {/* Text Content */}
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                                Drop your video here
                            </h3>
                            <p className="text-[var(--text-secondary)]">
                                or <span className="text-[var(--accent-primary)] hover:underline cursor-pointer">browse files</span>
                            </p>
                        </div>

                        {/* Supported Formats */}
                        <div className="flex flex-wrap justify-center gap-2">
                            {['MP4', 'MOV', 'WebM', 'AVI'].map((format) => (
                                <span
                                    key={format}
                                    className="px-3 py-1 text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded-full"
                                >
                                    {format}
                                </span>
                            ))}
                        </div>

                        <p className="text-xs text-[var(--text-muted)]">
                            Maximum file size: 500MB
                        </p>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {error}
                    </p>
                </div>
            )}
        </div>
    );
}
