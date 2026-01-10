'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import VideoPlayer from '@/components/VideoPlayer';
import VideoUploader from '@/components/VideoUploader';
import Timeline from '@/components/Timeline';
import CaptionEditor from '@/components/CaptionEditor';
import StylePanel from '@/components/StylePanel';
import TemplateGallery from '@/components/TemplateGallery';
import ExportPanel from '@/components/ExportPanel';
import AudioPanel from '@/components/AudioPanel';
import {
    startTranscription,
    waitForTranscription,
    getTranscriptionLanguages,
    exportVideoWithCaptions,
    API_BASE_URL,
    Caption as ApiCaption,
    Language,
    TranscriptionJob,
    CaptionStyle as ApiCaptionStyle,
    ExportOptions,
    ExportResult
} from '@/lib/api';

interface Caption {
    id: string;
    text: string;
    startTime: number;
    endTime: number;
}

interface CaptionStyle {
    fontFamily: string;
    fontSize: number;
    color: string;
    backgroundColor: string;
    position: 'top' | 'center' | 'bottom';
    bold: boolean;
    italic: boolean;
    shadow: boolean;
    outline: boolean;
    outlineColor: string;
    padding: number;
    borderRadius: number;
    opacity: number;
    letterSpacing: number;
    lineHeight: number;
}

interface ExportJob {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    filename?: string;
    url?: string;
    sizeFormatted?: string;
    error?: string;
}

const defaultStyle: CaptionStyle = {
    fontFamily: 'Inter',
    fontSize: 24,
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    position: 'bottom',
    bold: true,
    italic: false,
    shadow: true,
    outline: false,
    outlineColor: '#000000',
    padding: 8,
    borderRadius: 4,
    opacity: 1,
    letterSpacing: 0,
    lineHeight: 1.2,
};

function EditorContent() {
    const searchParams = useSearchParams();
    const videoId = searchParams.get('video');

    const [currentVideoId, setCurrentVideoId] = useState<string | null>(videoId);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [captions, setCaptions] = useState<Caption[]>([]);
    const [selectedCaption, setSelectedCaption] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [style, setStyle] = useState<CaptionStyle>(defaultStyle);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcriptionProgress, setTranscriptionProgress] = useState<string>('');
    const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState('auto');
    const [languages, setLanguages] = useState<Language[]>([]);
    const [activeTab, setActiveTab] = useState<'captions' | 'style' | 'templates' | 'audio' | 'export'>('captions');
    const [isExporting, setIsExporting] = useState(false);
    const [exportJob, setExportJob] = useState<ExportJob | null>(null);

    // Load video from URL param
    useEffect(() => {
        if (videoId) {
            setVideoUrl(`${API_BASE_URL}/uploads/${videoId}.mp4`);
            setCurrentVideoId(videoId);
        }
    }, [videoId]);

    // Fetch supported languages
    useEffect(() => {
        getTranscriptionLanguages().then(response => {
            if (response.success && response.data?.languages) {
                setLanguages(response.data.languages);
            }
        });
    }, []);

    // Get current caption based on playback time
    const currentCaption = captions.find(
        (cap) => currentTime >= cap.startTime && currentTime < cap.endTime
    );

    const handleVideoUpload = (url: string, id: string) => {
        setVideoUrl(url);
        setCurrentVideoId(id);
        setCaptions([]); // Clear previous captions
        setTranscriptionError(null);
    };

    const handleTranscribe = async () => {
        if (!currentVideoId) {
            setTranscriptionError('Please upload a video first');
            return;
        }

        setIsTranscribing(true);
        setTranscriptionError(null);
        setTranscriptionProgress('Starting transcription...');

        try {
            // Start the transcription job
            const startResponse = await startTranscription(currentVideoId, selectedLanguage);

            if (!startResponse.success || !startResponse.data?.jobId) {
                throw new Error(startResponse.error || 'Failed to start transcription');
            }

            const { jobId } = startResponse.data;
            setTranscriptionProgress('Processing audio...');

            // Wait for completion with progress updates
            const result = await waitForTranscription(
                jobId,
                (job: TranscriptionJob) => {
                    if (job.status === 'processing') {
                        setTranscriptionProgress(`Transcribing... ${job.progress}%`);
                    }
                }
            );

            // Convert API captions to our format
            const newCaptions: Caption[] = result.captions.map(cap => ({
                id: cap.id,
                text: cap.text,
                startTime: cap.startTime,
                endTime: cap.endTime,
            }));

            setCaptions(newCaptions);
            setTranscriptionProgress(`Completed! Detected language: ${result.language}`);

            // Clear progress message after 3 seconds
            setTimeout(() => setTranscriptionProgress(''), 3000);

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Transcription failed';
            setTranscriptionError(message);
            setTranscriptionProgress('');
        } finally {
            setIsTranscribing(false);
        }
    };

    // Handle caption updates
    const handleCaptionUpdate = (id: string, updates: Partial<Caption>) => {
        setCaptions(prev =>
            prev.map(cap => cap.id === id ? { ...cap, ...updates } : cap)
        );
    };

    // Handle caption deletion
    const handleCaptionDelete = (id: string) => {
        setCaptions(prev => prev.filter(cap => cap.id !== id));
        if (selectedCaption === id) {
            setSelectedCaption(null);
        }
    };

    // Handle caption addition
    const handleCaptionAdd = (startTime: number) => {
        const newCaption: Caption = {
            id: `cap_${Date.now()}`,
            text: '',
            startTime,
            endTime: startTime + 3, // 3 second default duration
        };
        setCaptions(prev => [...prev, newCaption].sort((a, b) => a.startTime - b.startTime));
        setSelectedCaption(newCaption.id);
    };

    // Handle time seeking
    const handleTimeSeek = (time: number) => {
        setCurrentTime(time);
        // You would also seek the video player here
    };

    // Handle caption timing changes
    const handleCaptionTimeChange = (id: string, startTime: number, endTime: number) => {
        handleCaptionUpdate(id, { startTime, endTime });
    };

    // Handle template selection
    const handleTemplateSelect = (template: any) => {
        setStyle(prev => ({
            ...prev,
            ...template.style
        }));
        setActiveTab('style'); // Switch to style tab to see changes
    };

    // Handle style changes
    const handleStyleChange = (updates: Partial<CaptionStyle>) => {
        setStyle(prev => ({ ...prev, ...updates }));
    };

    // Handle export
    const handleExportVideo = async (options: ExportOptions) => {
        if (!currentVideoId || captions.length === 0) {
            return;
        }

        setIsExporting(true);
        setExportJob({
            id: `export_${Date.now()}`,
            status: 'processing',
            progress: 0
        });

        try {
            // Convert style to API format (only use basic properties for API)
            const exportStyle = {
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
                color: style.color,
                backgroundColor: style.backgroundColor,
                position: style.position,
                bold: style.bold,
                italic: style.italic,
                shadow: style.shadow,
            };

            const result = await exportVideoWithCaptions(
                currentVideoId,
                captions,
                exportStyle,
                options
            );

            if (result.success && result.data?.export) {
                setExportJob({
                    id: result.data.export.exportId,
                    status: 'completed',
                    progress: 100,
                    filename: result.data.export.filename,
                    url: result.data.export.url,
                    sizeFormatted: result.data.export.sizeFormatted
                });
            } else {
                throw new Error(result.error || 'Export failed');
            }

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Export failed';
            setExportJob({
                id: `export_${Date.now()}`,
                status: 'failed',
                progress: 0,
                error: message
            });
        } finally {
            setIsExporting(false);
        }
    };

    // Handle download
    const handleDownload = (url: string, filename: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getCaptionStyle = () => ({
        fontFamily: style.fontFamily,
        fontSize: `${style.fontSize}px`,
        color: style.color,
        backgroundColor: style.backgroundColor,
        fontWeight: style.bold ? 'bold' : 'normal',
        fontStyle: style.italic ? 'italic' : 'normal',
        textShadow: style.shadow ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none',
        WebkitTextStroke: style.outline ? `1px ${style.outlineColor}` : 'none',
        padding: `${style.padding}px`,
        borderRadius: `${style.borderRadius}px`,
        opacity: style.opacity,
        letterSpacing: `${style.letterSpacing}px`,
        lineHeight: style.lineHeight,
        display: 'inline-block',
        maxWidth: '300px',
        textAlign: 'center' as const,
    });

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
            {/* Editor Header */}
            <div className="h-14 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back
                    </Link>
                    <div className="h-6 w-px bg-[var(--border-primary)]" />
                    <h1 className="font-semibold">Video Editor</h1>
                </div>

                <div className="flex items-center gap-3">
                    <button className="btn btn-secondary text-sm py-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        Save Project
                    </button>
                    <button
                        onClick={() => handleExportVideo({ quality: 'high', format: 'mp4' })}
                        disabled={!videoUrl || captions.length === 0 || isExporting}
                        className="btn btn-primary text-sm py-2"
                    >
                        {isExporting ? (
                            <>
                                <div className="spinner w-4 h-4" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Export Video
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Main Editor Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Controls */}
                <div className="w-80 border-r border-[var(--border-primary)] bg-[var(--bg-secondary)] flex flex-col">
                    {/* Tabs */}
                    <div className="flex border-b border-[var(--border-primary)]">
                        {(['captions', 'style', 'templates', 'audio', 'export'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-3 text-xs font-medium capitalize transition-colors ${activeTab === tab
                                    ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-hidden">
                        {activeTab === 'captions' && (
                            <CaptionEditor
                                captions={captions}
                                selectedCaption={selectedCaption}
                                currentTime={currentTime}
                                onCaptionUpdate={handleCaptionUpdate}
                                onCaptionSelect={setSelectedCaption}
                                onCaptionDelete={handleCaptionDelete}
                                onCaptionAdd={handleCaptionAdd}
                                onSeekToCaption={handleTimeSeek}
                            />
                        )}

                        {activeTab === 'style' && (
                            <StylePanel
                                style={style}
                                onStyleChange={handleStyleChange}
                                previewText={currentCaption?.text || "Sample Caption Text"}
                            />
                        )}

                        {activeTab === 'templates' && (
                            <TemplateGallery
                                onTemplateSelect={handleTemplateSelect}
                                currentStyle={style}
                            />
                        )}

                        {activeTab === 'audio' && (
                            <AudioPanel
                                videoId={currentVideoId}
                                onEnhanced={(url) => {
                                    setVideoUrl(url);
                                }}
                            />
                        )}

                        {activeTab === 'export' && (
                            <ExportPanel
                                videoId={currentVideoId}
                                captionsCount={captions.length}
                                onExport={handleExportVideo}
                                exportJob={exportJob}
                                onDownload={handleDownload}
                            />
                        )}
                    </div>
                </div>

                {/* Center - Video Preview */}
                <div className="flex-1 flex flex-col bg-[var(--bg-primary)]">
                    <div className="flex-1 flex items-center justify-center p-8">
                        {videoUrl ? (
                            <div className="w-full max-w-4xl">
                                <div className="relative">
                                    <VideoPlayer
                                        src={videoUrl}
                                        onTimeUpdate={setCurrentTime}
                                        onDurationChange={setDuration}
                                    />
                                    {/* Custom Caption Overlay with Styling */}
                                    {currentCaption && (
                                        <div
                                            className="absolute left-0 right-0 flex justify-center pointer-events-none"
                                            style={{
                                                top: style.position === 'top' ? '20px' : undefined,
                                                bottom: style.position === 'bottom' ? '80px' : style.position === 'center' ? '50%' : undefined,
                                                transform: style.position === 'center' ? 'translateY(50%)' : undefined,
                                            }}
                                        >
                                            <span style={getCaptionStyle()}>
                                                {currentCaption.text}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="w-full max-w-2xl">
                                <VideoUploader
                                    onUploadComplete={handleVideoUpload}
                                    onError={(error) => console.error(error)}
                                />
                            </div>
                        )}
                    </div>

                    {/* Timeline */}
                    {videoUrl && duration > 0 && (
                        <Timeline
                            duration={duration}
                            currentTime={currentTime}
                            captions={captions}
                            selectedCaption={selectedCaption}
                            onTimeSeek={handleTimeSeek}
                            onCaptionSelect={setSelectedCaption}
                            onCaptionTimeChange={handleCaptionTimeChange}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// Loading fallback component
function EditorLoading() {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
            <div className="text-center">
                <div className="spinner w-8 h-8 mx-auto mb-4" />
                <p className="text-[var(--text-muted)]">Loading editor...</p>
            </div>
        </div>
    );
}

// Default export with Suspense boundary for useSearchParams
export default function EditorPage() {
    return (
        <Suspense fallback={<EditorLoading />}>
            <EditorContent />
        </Suspense>
    );
}
