'use client';

import { useState } from 'react';
import { ExportOptions as ApiExportOptions } from '@/lib/api';

interface ExportOptions {
    format: 'mp4' | 'mov' | 'webm';
    quality: 'low' | 'medium' | 'high';
    includeAudio: boolean;
    burnCaptions: boolean;
    exportSRT: boolean;
    exportVTT: boolean;
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

interface ExportPanelProps {
    videoId: string | null;
    captionsCount: number;
    onExport: (options: ApiExportOptions) => Promise<void>;
    exportJob?: ExportJob | null;
    onDownload?: (url: string, filename: string) => void;
}

const qualityOptions = [
    { value: 'low', label: '720p', description: 'Fast export, smaller file size' },
    { value: 'medium', label: '1080p', description: 'Balanced quality and size' },
    { value: 'high', label: '1080p High', description: 'Best quality, larger file' },
];

const formatOptions = [
    { value: 'mp4', label: 'MP4', description: 'Most compatible format' },
    { value: 'mov', label: 'MOV', description: 'Apple/Final Cut Pro' },
    { value: 'webm', label: 'WebM', description: 'Web optimized' },
];

export default function ExportPanel({ 
    videoId, 
    captionsCount, 
    onExport, 
    exportJob,
    onDownload 
}: ExportPanelProps) {
    const [options, setOptions] = useState<ExportOptions>({
        format: 'mp4',
        quality: 'medium',
        includeAudio: true,
        burnCaptions: true,
        exportSRT: false,
        exportVTT: false,
    });

    const [isExporting, setIsExporting] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const updateOption = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
        setOptions(prev => ({ ...prev, [key]: value }));
    };

    const handleExport = async () => {
        if (!videoId || captionsCount === 0) return;
        
        setIsExporting(true);
        try {
            await onExport(options);
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const getEstimatedSize = () => {
        const baseSize = 50; // MB for 1 minute of video
        const qualityMultiplier = {
            'low': 0.5,
            'medium': 1,
            'high': 1.5,
            '4k': 3
        };
        
        const estimatedMB = baseSize * qualityMultiplier[options.quality];
        return `~${estimatedMB}MB per minute`;
    };

    const getEstimatedTime = () => {
        const baseTime = 30; // seconds for 1 minute of video
        const qualityMultiplier = {
            'low': 0.5,
            'medium': 1,
            'high': 1.5,
            '4k': 3
        };
        
        const estimatedSeconds = baseTime * qualityMultiplier[options.quality];
        return `~${estimatedSeconds}s per minute`;
    };

    const canExport = videoId && captionsCount > 0 && !isExporting;

    return (
        <div className="export-panel h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-[var(--border-primary)]">
                <h3 className="font-semibold mb-2">Export Video</h3>
                <div className="text-sm text-[var(--text-muted)]">
                    {captionsCount} captions ready for export
                </div>
            </div>

            {/* Export Options */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Quick Export */}
                <div>
                    <h4 className="text-sm font-medium mb-3">Quick Export</h4>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => {
                                setOptions({
                                    format: 'mp4',
                                    quality: 'medium',
                                    includeAudio: true,
                                    burnCaptions: true,
                                    exportSRT: false,
                                    exportVTT: false,
                                });
                                handleExport();
                            }}
                            disabled={!canExport}
                            className="btn btn-primary text-sm py-3"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Video + Captions
                        </button>
                        
                        <button
                            onClick={() => {
                                setOptions({
                                    format: 'mp4',
                                    quality: 'medium',
                                    includeAudio: true,
                                    burnCaptions: false,
                                    exportSRT: true,
                                    exportVTT: false,
                                });
                                handleExport();
                            }}
                            disabled={!canExport}
                            className="btn btn-secondary text-sm py-3"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            SRT File Only
                        </button>
                    </div>
                </div>

                {/* Format Selection */}
                <div>
                    <h4 className="text-sm font-medium mb-3">Format</h4>
                    <div className="space-y-2">
                        {formatOptions.map(format => (
                            <label
                                key={format.value}
                                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                                    options.format === format.value
                                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                                        : 'border-[var(--border-primary)] hover:border-[var(--border-secondary)]'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="format"
                                    value={format.value}
                                    checked={options.format === format.value}
                                    onChange={(e) => updateOption('format', e.target.value as any)}
                                    className="sr-only"
                                />
                                <div className="flex-1">
                                    <div className="font-medium text-sm">{format.label}</div>
                                    <div className="text-xs text-[var(--text-muted)]">{format.description}</div>
                                </div>
                                {options.format === format.value && (
                                    <svg className="w-5 h-5 text-[var(--accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Quality Selection */}
                <div>
                    <h4 className="text-sm font-medium mb-3">Quality</h4>
                    <div className="space-y-2">
                        {qualityOptions.map(quality => (
                            <label
                                key={quality.value}
                                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                                    options.quality === quality.value
                                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                                        : 'border-[var(--border-primary)] hover:border-[var(--border-secondary)]'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="quality"
                                    value={quality.value}
                                    checked={options.quality === quality.value}
                                    onChange={(e) => updateOption('quality', e.target.value as any)}
                                    className="sr-only"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">{quality.label}</span>
                                    </div>
                                    <div className="text-xs text-[var(--text-muted)]">{quality.description}</div>
                                </div>
                                {options.quality === quality.value && (
                                    <svg className="w-5 h-5 text-[var(--accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Advanced Options */}
                <div>
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <svg 
                            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        Advanced Options
                    </button>

                    {showAdvanced && (
                        <div className="mt-3 space-y-3 pl-6">
                            {/* Include Audio */}
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={options.includeAudio}
                                    onChange={(e) => updateOption('includeAudio', e.target.checked)}
                                    className="checkbox"
                                />
                                <div>
                                    <div className="text-sm font-medium">Include Audio</div>
                                    <div className="text-xs text-[var(--text-muted)]">Export video with original audio track</div>
                                </div>
                            </label>

                            {/* Burn Captions */}
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={options.burnCaptions}
                                    onChange={(e) => updateOption('burnCaptions', e.target.checked)}
                                    className="checkbox"
                                />
                                <div>
                                    <div className="text-sm font-medium">Burn Captions</div>
                                    <div className="text-xs text-[var(--text-muted)]">Permanently embed captions in video</div>
                                </div>
                            </label>

                            {/* Export SRT */}
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={options.exportSRT}
                                    onChange={(e) => updateOption('exportSRT', e.target.checked)}
                                    className="checkbox"
                                />
                                <div>
                                    <div className="text-sm font-medium">Export SRT File</div>
                                    <div className="text-xs text-[var(--text-muted)]">Separate subtitle file for video editors</div>
                                </div>
                            </label>

                            {/* Export VTT */}
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={options.exportVTT}
                                    onChange={(e) => updateOption('exportVTT', e.target.checked)}
                                    className="checkbox"
                                />
                                <div>
                                    <div className="text-sm font-medium">Export VTT File</div>
                                    <div className="text-xs text-[var(--text-muted)]">Web-compatible subtitle format</div>
                                </div>
                            </label>
                        </div>
                    )}
                </div>

                {/* Export Estimates */}
                <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Export Estimates</h4>
                    <div className="space-y-1 text-xs text-[var(--text-muted)]">
                        <div className="flex justify-between">
                            <span>File Size:</span>
                            <span>{getEstimatedSize()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Processing Time:</span>
                            <span>{getEstimatedTime()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Credits Cost:</span>
                            <span>~10 credits per minute</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Export Status */}
            {exportJob && (
                <div className="p-4 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
                    {exportJob.status === 'processing' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Exporting...</span>
                                <span className="text-sm text-[var(--text-muted)]">{exportJob.progress}%</span>
                            </div>
                            <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-2">
                                <div 
                                    className="bg-[var(--accent-primary)] h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${exportJob.progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {exportJob.status === 'completed' && exportJob.url && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-green-400">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-sm font-medium">Export Complete!</span>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm">
                                <span>{exportJob.filename}</span>
                                <span className="text-[var(--text-muted)]">{exportJob.sizeFormatted}</span>
                            </div>

                            <button
                                onClick={() => onDownload?.(exportJob.url!, exportJob.filename!)}
                                className="w-full btn btn-primary text-sm"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download
                            </button>
                        </div>
                    )}

                    {exportJob.status === 'failed' && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-red-400">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm font-medium">Export Failed</span>
                            </div>
                            
                            <p className="text-sm text-[var(--text-muted)]">
                                {exportJob.error || 'An error occurred during export'}
                            </p>

                            <button
                                onClick={handleExport}
                                className="w-full btn btn-secondary text-sm"
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Export Button */}
            {!exportJob && (
                <div className="p-4 border-t border-[var(--border-primary)]">
                    <button
                        onClick={handleExport}
                        disabled={!canExport}
                        className="w-full btn btn-primary"
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
                                Start Export
                            </>
                        )}
                    </button>

                    {!videoId && (
                        <p className="text-xs text-[var(--text-muted)] text-center mt-2">
                            Upload a video to enable export
                        </p>
                    )}

                    {videoId && captionsCount === 0 && (
                        <p className="text-xs text-[var(--text-muted)] text-center mt-2">
                            Add captions to enable export
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}