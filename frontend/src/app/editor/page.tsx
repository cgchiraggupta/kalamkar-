'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import VideoPlayer from '@/components/VideoPlayer';
import VideoUploader from '@/components/VideoUploader';
import {
    startTranscription,
    waitForTranscription,
    getTranscriptionLanguages,
    exportCaptions,
    exportVideoWithCaptions,
    getExportStatus,
    Caption as ApiCaption,
    Language,
    TranscriptionJob,
    CaptionStyle,
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
};

const fonts = [
    'Inter', 'Poppins', 'Roboto', 'Montserrat', 'Open Sans',
    'Lato', 'Oswald', 'Playfair Display', 'Bebas Neue', 'Anton'
];

const colorPresets = [
    '#FFFFFF', '#FFFF00', '#00FF00', '#00FFFF', '#FF00FF',
    '#FF0000', '#FFA500', '#A35C5C', '#6366F1', '#000000'
];

const templates = [
    { name: 'MrBeast', fontFamily: 'Bebas Neue', fontSize: 32, color: '#FFFF00', bold: true, shadow: true },
    { name: 'Alex Hormozi', fontFamily: 'Anton', fontSize: 28, color: '#FFFFFF', bold: true, shadow: true },
    { name: 'Ali Abdaal', fontFamily: 'Inter', fontSize: 22, color: '#FFFFFF', bold: false, shadow: false },
    { name: 'Minimal', fontFamily: 'Inter', fontSize: 20, color: '#FFFFFF', bold: false, shadow: false },
    { name: 'Bold Pink', fontFamily: 'Poppins', fontSize: 26, color: '#FF69B4', bold: true, shadow: true },
    { name: 'Classic', fontFamily: 'Roboto', fontSize: 24, color: '#FFFFFF', bold: false, shadow: true },
];

// Popular Indian language options for quick selection
const quickLanguages = [
    { code: 'auto', name: 'Auto-detect', emoji: '🌐' },
    { code: 'hi', name: 'Hindi', emoji: '🇮🇳' },
    { code: 'ta', name: 'Tamil', emoji: '🇮🇳' },
    { code: 'te', name: 'Telugu', emoji: '🇮🇳' },
    { code: 'en', name: 'English', emoji: '🇬🇧' },
];

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
    const [activeTab, setActiveTab] = useState<'captions' | 'style' | 'templates'>('captions');
    const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState<string>('');
    const [exportError, setExportError] = useState<string | null>(null);
    const [lastExport, setLastExport] = useState<ExportResult | null>(null);

    // Load video from URL param
    useEffect(() => {
        if (videoId) {
            setVideoUrl(`http://localhost:5001/uploads/${videoId}.mp4`);
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

    const updateCaption = (id: string, text: string) => {
        setCaptions(prev =>
            prev.map(cap => cap.id === id ? { ...cap, text } : cap)
        );
    };

    const applyTemplate = (template: typeof templates[0]) => {
        setStyle(prev => ({
            ...prev,
            fontFamily: template.fontFamily,
            fontSize: template.fontSize,
            color: template.color,
            bold: template.bold,
            shadow: template.shadow,
        }));
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    const handleExportVideo = async () => {
        if (!currentVideoId || captions.length === 0) {
            setExportError('Please upload a video and add captions before exporting');
            return;
        }

        setIsExporting(true);
        setExportError(null);
        setExportProgress('Preparing export...');

        try {
            // Convert style to API format
            const exportStyle: CaptionStyle = {
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
                color: style.color,
                backgroundColor: style.backgroundColor,
                position: style.position,
                bold: style.bold,
                italic: style.italic,
                shadow: style.shadow,
            };

            const exportOptions: ExportOptions = {
                quality: 'high',
                format: 'mp4'
            };

            setExportProgress('Burning captions into video...');

            const result = await exportVideoWithCaptions(
                currentVideoId,
                captions,
                exportStyle,
                exportOptions
            );

            if (result.success && result.data?.export) {
                setLastExport(result.data.export);
                setExportProgress(`Export completed! File: ${result.data.export.filename}`);
                
                // Clear progress message after 5 seconds
                setTimeout(() => setExportProgress(''), 5000);
            } else {
                throw new Error(result.error || 'Export failed');
            }

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Export failed';
            setExportError(message);
            setExportProgress('');
        } finally {
            setIsExporting(false);
        }
    };

    const handleDownloadExport = () => {
        if (lastExport) {
            const link = document.createElement('a');
            link.href = `http://localhost:5001${lastExport.url}`;
            link.download = lastExport.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const getCaptionStyle = () => ({
        fontFamily: style.fontFamily,
        fontSize: `${style.fontSize}px`,
        color: style.color,
        backgroundColor: style.backgroundColor,
        fontWeight: style.bold ? 'bold' : 'normal',
        fontStyle: style.italic ? 'italic' : 'normal',
        textShadow: style.shadow ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none',
        padding: '8px 16px',
        borderRadius: '4px',
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
                        onClick={handleExportVideo}
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
                {/* Left Sidebar - Captions List */}
                <div className="w-80 border-r border-[var(--border-primary)] bg-[var(--bg-secondary)] flex flex-col">
                    {/* Tabs */}
                    <div className="flex border-b border-[var(--border-primary)]">
                        {(['captions', 'style', 'templates'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${activeTab === tab
                                    ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {activeTab === 'captions' && (
                            <div className="space-y-3">
                                {/* Language Selector */}
                                <div className="mb-4">
                                    <label className="text-xs text-[var(--text-muted)] mb-2 block">
                                        Transcription Language
                                    </label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {quickLanguages.map(lang => (
                                            <button
                                                key={lang.code}
                                                onClick={() => setSelectedLanguage(lang.code)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedLanguage === lang.code
                                                    ? 'bg-[var(--accent-primary)] text-white'
                                                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                                                    }`}
                                            >
                                                <span className="mr-1">{lang.emoji}</span>
                                                {lang.name}
                                            </button>
                                        ))}
                                    </div>
                                    {languages.length > 5 && (
                                        <select
                                            value={selectedLanguage}
                                            onChange={(e) => setSelectedLanguage(e.target.value)}
                                            className="input text-sm"
                                        >
                                            {languages.map(lang => (
                                                <option key={lang.code} value={lang.code}>
                                                    {lang.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Transcribe Button */}
                                <button
                                    onClick={handleTranscribe}
                                    disabled={!videoUrl || isTranscribing}
                                    className="w-full btn btn-primary text-sm py-3"
                                >
                                    {isTranscribing ? (
                                        <>
                                            <div className="spinner w-4 h-4" />
                                            {transcriptionProgress || 'Transcribing...'}
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                            </svg>
                                            {captions.length > 0 ? 'Re-transcribe' : 'Auto Transcribe'}
                                        </>
                                    )}
                                </button>

                                {/* Progress Message */}
                                {transcriptionProgress && !isTranscribing && (
                                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm text-center">
                                        ✓ {transcriptionProgress}
                                    </div>
                                )}

                                {/* Error Message */}
                                {transcriptionError && (
                                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                        <div className="flex items-start gap-2">
                                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div>
                                                <p className="font-medium">Transcription Error</p>
                                                <p className="text-xs mt-1 opacity-80">{transcriptionError}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Export Progress Message */}
                                {exportProgress && !isExporting && (
                                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm text-center">
                                        ✓ {exportProgress}
                                        {lastExport && (
                                            <button
                                                onClick={handleDownloadExport}
                                                className="block w-full mt-2 btn btn-secondary text-xs py-1"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                                Download ({lastExport.sizeFormatted})
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Export Error Message */}
                                {exportError && (
                                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                        <div className="flex items-start gap-2">
                                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div>
                                                <p className="font-medium">Export Error</p>
                                                <p className="text-xs mt-1 opacity-80">{exportError}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Captions List */}
                                {captions.length === 0 && !isTranscribing && !transcriptionError ? (
                                    <div className="text-center py-6 text-[var(--text-muted)] text-sm">
                                        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                        </svg>
                                        <p>No captions yet</p>
                                        <p className="text-xs mt-1">Upload a video and click "Auto Transcribe"</p>
                                    </div>
                                ) : (
                                    captions.map((caption, index) => (
                                        <div
                                            key={caption.id}
                                            onClick={() => setSelectedCaption(caption.id)}
                                            className={`p-3 rounded-lg cursor-pointer transition-all ${selectedCaption === caption.id
                                                ? 'bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]'
                                                : currentCaption?.id === caption.id
                                                    ? 'bg-[var(--bg-elevated)] border border-[var(--border-secondary)]'
                                                    : 'bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-primary)]'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-mono text-[var(--text-muted)]">
                                                    #{index + 1}
                                                </span>
                                                <span className="text-xs font-mono text-[var(--text-muted)]">
                                                    {formatTime(caption.startTime)} → {formatTime(caption.endTime)}
                                                </span>
                                            </div>
                                            <input
                                                type="text"
                                                value={caption.text}
                                                onChange={(e) => updateCaption(caption.id, e.target.value)}
                                                className="w-full bg-transparent border-none text-sm text-[var(--text-primary)] focus:outline-none"
                                            />
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'style' && (
                            <div className="space-y-6">
                                {/* Font Family */}
                                <div>
                                    <label className="text-sm text-[var(--text-secondary)] mb-2 block">Font Family</label>
                                    <select
                                        value={style.fontFamily}
                                        onChange={(e) => setStyle(prev => ({ ...prev, fontFamily: e.target.value }))}
                                        className="input"
                                    >
                                        {fonts.map(font => (
                                            <option key={font} value={font}>{font}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Font Size */}
                                <div>
                                    <label className="text-sm text-[var(--text-secondary)] mb-2 block">
                                        Font Size: {style.fontSize}px
                                    </label>
                                    <input
                                        type="range"
                                        min={12}
                                        max={72}
                                        value={style.fontSize}
                                        onChange={(e) => setStyle(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                                        className="w-full"
                                    />
                                </div>

                                {/* Color */}
                                <div>
                                    <label className="text-sm text-[var(--text-secondary)] mb-2 block">Text Color</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {colorPresets.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setStyle(prev => ({ ...prev, color }))}
                                                className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${style.color === color ? 'border-white' : 'border-transparent'
                                                    }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        value={style.color}
                                        onChange={(e) => setStyle(prev => ({ ...prev, color: e.target.value }))}
                                        className="input text-sm"
                                        placeholder="#FFFFFF"
                                    />
                                </div>

                                {/* Text Styles */}
                                <div>
                                    <label className="text-sm text-[var(--text-secondary)] mb-2 block">Text Style</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setStyle(prev => ({ ...prev, bold: !prev.bold }))}
                                            className={`btn btn-icon ${style.bold ? 'btn-primary' : 'btn-secondary'}`}
                                        >
                                            <span className="font-bold">B</span>
                                        </button>
                                        <button
                                            onClick={() => setStyle(prev => ({ ...prev, italic: !prev.italic }))}
                                            className={`btn btn-icon ${style.italic ? 'btn-primary' : 'btn-secondary'}`}
                                        >
                                            <span className="italic">I</span>
                                        </button>
                                        <button
                                            onClick={() => setStyle(prev => ({ ...prev, shadow: !prev.shadow }))}
                                            className={`btn btn-icon ${style.shadow ? 'btn-primary' : 'btn-secondary'}`}
                                        >
                                            <span style={{ textShadow: '1px 1px 2px black' }}>S</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Position */}
                                <div>
                                    <label className="text-sm text-[var(--text-secondary)] mb-2 block">Position</label>
                                    <div className="flex gap-2">
                                        {(['top', 'center', 'bottom'] as const).map(pos => (
                                            <button
                                                key={pos}
                                                onClick={() => setStyle(prev => ({ ...prev, position: pos }))}
                                                className={`btn flex-1 text-sm capitalize ${style.position === pos ? 'btn-primary' : 'btn-secondary'
                                                    }`}
                                            >
                                                {pos}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'templates' && (
                            <div className="grid grid-cols-2 gap-3">
                                {templates.map((template, index) => (
                                    <button
                                        key={index}
                                        onClick={() => applyTemplate(template)}
                                        className="p-4 rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)] hover:border-[var(--accent-primary)] transition-all text-center"
                                    >
                                        <div
                                            className="text-sm mb-2 truncate"
                                            style={{
                                                fontFamily: template.fontFamily,
                                                color: template.color,
                                                fontWeight: template.bold ? 'bold' : 'normal',
                                                textShadow: template.shadow ? '1px 1px 2px black' : 'none',
                                            }}
                                        >
                                            Sample
                                        </div>
                                        <div className="text-xs text-[var(--text-muted)]">{template.name}</div>
                                    </button>
                                ))}
                            </div>
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
                    {videoUrl && (
                        <div className="timeline">
                            <div className="flex items-center gap-4 mb-4">
                                <span className="text-sm font-mono text-[var(--text-muted)]">
                                    {formatTime(currentTime)} / {formatTime(duration)}
                                </span>
                            </div>

                            {/* Caption Blocks on Timeline */}
                            <div className="relative h-10 bg-[var(--bg-tertiary)] rounded-lg overflow-hidden">
                                {captions.map((caption) => {
                                    const left = (caption.startTime / duration) * 100;
                                    const width = ((caption.endTime - caption.startTime) / duration) * 100;
                                    return (
                                        <div
                                            key={caption.id}
                                            onClick={() => setSelectedCaption(caption.id)}
                                            className={`absolute top-1 bottom-1 rounded cursor-pointer transition-all ${selectedCaption === caption.id
                                                ? 'bg-[var(--accent-primary)]'
                                                : 'bg-[var(--accent-primary)]/50 hover:bg-[var(--accent-primary)]/70'
                                                }`}
                                            style={{ left: `${left}%`, width: `${width}%` }}
                                        >
                                            <span className="text-xs text-white px-1 truncate block">
                                                {caption.text}
                                            </span>
                                        </div>
                                    );
                                })}

                                {/* Playhead */}
                                <div
                                    className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
                                    style={{ left: `${(currentTime / duration) * 100}%` }}
                                >
                                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full" />
                                </div>
                            </div>

                            {/* Waveform Placeholder */}
                            <div className="mt-3 waveform opacity-30" />
                        </div>
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
