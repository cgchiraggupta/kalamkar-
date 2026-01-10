'use client';

import { useState, useEffect } from 'react';
import { analyzeAudio, enhanceAudio, quickEnhanceAudio, AudioAnalysis, AudioEnhanceOptions } from '@/lib/api';

interface AudioPanelProps {
    videoId: string | null;
    onEnhanced?: (url: string) => void;
}

const quickPresets = [
    { id: 'balanced', name: 'Balanced', description: 'Good for most videos', icon: '⚖️' },
    { id: 'podcast', name: 'Podcast', description: 'Clear voice, minimal noise', icon: '🎙️' },
    { id: 'music', name: 'Music', description: 'Light touch, preserve dynamics', icon: '🎵' },
    { id: 'clean', name: 'Clean', description: 'Heavy noise reduction only', icon: '🧹' },
];

export default function AudioPanel({ videoId, onEnhanced }: AudioPanelProps) {
    const [analysis, setAnalysis] = useState<AudioAnalysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [enhanceResult, setEnhanceResult] = useState<{ url: string; filename: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState<string>('balanced');

    // Advanced options
    const [options, setOptions] = useState<AudioEnhanceOptions>({
        noiseReduction: 'medium',
        normalize: true,
        normalizePreset: 'standard',
        voiceClarity: 'medium',
        applyNoise: true,
        applyClarity: true,
    });

    const handleAnalyze = async () => {
        if (!videoId) return;

        setIsAnalyzing(true);
        setError(null);

        try {
            const response = await analyzeAudio(videoId);
            if (response.success && response.data) {
                setAnalysis(response.data.analysis);
            } else {
                setError(response.error || 'Analysis failed');
            }
        } catch (err) {
            setError('Failed to analyze audio');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleQuickEnhance = async (preset: string) => {
        if (!videoId) return;

        setIsEnhancing(true);
        setError(null);
        setEnhanceResult(null);

        try {
            const response = await quickEnhanceAudio(videoId, preset as any);
            if (response.success && response.data) {
                setEnhanceResult({
                    url: response.data.url,
                    filename: response.data.filename,
                });
                onEnhanced?.(response.data.url);
            } else {
                setError(response.error || 'Enhancement failed');
            }
        } catch (err) {
            setError('Failed to enhance audio');
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleAdvancedEnhance = async () => {
        if (!videoId) return;

        setIsEnhancing(true);
        setError(null);
        setEnhanceResult(null);

        try {
            const response = await enhanceAudio(videoId, options);
            if (response.success && response.data) {
                setEnhanceResult({
                    url: response.data.url,
                    filename: response.data.filename,
                });
                onEnhanced?.(response.data.url);
            } else {
                setError(response.error || 'Enhancement failed');
            }
        } catch (err) {
            setError('Failed to enhance audio');
        } finally {
            setIsEnhancing(false);
        }
    };

    const getQualityColor = (quality: string) => {
        switch (quality) {
            case 'good': return 'text-green-400';
            case 'slightly_quiet': return 'text-yellow-400';
            case 'too_quiet': return 'text-orange-400';
            case 'too_loud': return 'text-red-400';
            default: return 'text-[var(--text-muted)]';
        }
    };

    const getQualityLabel = (quality: string) => {
        switch (quality) {
            case 'good': return 'Good';
            case 'slightly_quiet': return 'Slightly Quiet';
            case 'too_quiet': return 'Too Quiet';
            case 'too_loud': return 'Too Loud';
            default: return 'Unknown';
        }
    };

    return (
        <div className="audio-panel h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-[var(--border-primary)]">
                <h3 className="font-semibold mb-2">Audio Enhancement</h3>
                <p className="text-sm text-[var(--text-muted)]">
                    Improve audio quality with AI-powered enhancements
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {!videoId ? (
                    <div className="text-center py-8 text-[var(--text-muted)]">
                        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        <p>Upload a video to enhance audio</p>
                    </div>
                ) : (
                    <>
                        {/* Analyze Audio */}
                        <div>
                            <h4 className="text-sm font-medium mb-3">Audio Analysis</h4>
                            {!analysis ? (
                                <button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing}
                                    className="w-full btn btn-secondary text-sm"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <div className="spinner w-4 h-4" />
                                            Analyzing...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                            </svg>
                                            Analyze Audio
                                        </>
                                    )}
                                </button>
                            ) : (
                                <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm">Quality:</span>
                                        <span className={`text-sm font-medium ${getQualityColor(analysis.quality)}`}>
                                            {getQualityLabel(analysis.quality)}
                                        </span>
                                    </div>
                                    {analysis.meanVolume !== null && (
                                        <div className="flex justify-between text-sm text-[var(--text-muted)]">
                                            <span>Average Volume:</span>
                                            <span>{analysis.meanVolume.toFixed(1)} dB</span>
                                        </div>
                                    )}
                                    {analysis.recommendations.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-[var(--border-primary)]">
                                            <p className="text-xs text-[var(--text-muted)] mb-1">Recommendations:</p>
                                            {analysis.recommendations.map((rec, i) => (
                                                <p key={i} className="text-xs text-yellow-400">• {rec}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Quick Presets */}
                        <div>
                            <h4 className="text-sm font-medium mb-3">Quick Enhance</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {quickPresets.map((preset) => (
                                    <button
                                        key={preset.id}
                                        onClick={() => handleQuickEnhance(preset.id)}
                                        disabled={isEnhancing}
                                        className={`p-3 rounded-lg border text-left transition-all ${
                                            selectedPreset === preset.id
                                                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                                                : 'border-[var(--border-primary)] hover:border-[var(--border-secondary)]'
                                        }`}
                                    >
                                        <div className="text-lg mb-1">{preset.icon}</div>
                                        <div className="font-medium text-sm">{preset.name}</div>
                                        <div className="text-xs text-[var(--text-muted)]">{preset.description}</div>
                                    </button>
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
                                <div className="mt-3 space-y-4 pl-4">
                                    {/* Noise Reduction */}
                                    <div>
                                        <label className="flex items-center gap-2 mb-2">
                                            <input
                                                type="checkbox"
                                                checked={options.applyNoise}
                                                onChange={(e) => setOptions({ ...options, applyNoise: e.target.checked })}
                                                className="checkbox"
                                            />
                                            <span className="text-sm font-medium">Noise Reduction</span>
                                        </label>
                                        {options.applyNoise && (
                                            <select
                                                value={options.noiseReduction}
                                                onChange={(e) => setOptions({ ...options, noiseReduction: e.target.value as any })}
                                                className="w-full input text-sm"
                                            >
                                                <option value="light">Light</option>
                                                <option value="medium">Medium</option>
                                                <option value="heavy">Heavy</option>
                                            </select>
                                        )}
                                    </div>

                                    {/* Volume Normalization */}
                                    <div>
                                        <label className="flex items-center gap-2 mb-2">
                                            <input
                                                type="checkbox"
                                                checked={options.normalize}
                                                onChange={(e) => setOptions({ ...options, normalize: e.target.checked })}
                                                className="checkbox"
                                            />
                                            <span className="text-sm font-medium">Volume Normalization</span>
                                        </label>
                                        {options.normalize && (
                                            <select
                                                value={options.normalizePreset}
                                                onChange={(e) => setOptions({ ...options, normalizePreset: e.target.value as any })}
                                                className="w-full input text-sm"
                                            >
                                                <option value="standard">Standard (-16 LUFS)</option>
                                                <option value="podcast">Podcast (-16 LUFS, tight)</option>
                                                <option value="broadcast">Broadcast (-24 LUFS)</option>
                                            </select>
                                        )}
                                    </div>

                                    {/* Voice Clarity */}
                                    <div>
                                        <label className="flex items-center gap-2 mb-2">
                                            <input
                                                type="checkbox"
                                                checked={options.applyClarity}
                                                onChange={(e) => setOptions({ ...options, applyClarity: e.target.checked })}
                                                className="checkbox"
                                            />
                                            <span className="text-sm font-medium">Voice Clarity</span>
                                        </label>
                                        {options.applyClarity && (
                                            <select
                                                value={options.voiceClarity}
                                                onChange={(e) => setOptions({ ...options, voiceClarity: e.target.value as any })}
                                                className="w-full input text-sm"
                                            >
                                                <option value="light">Light</option>
                                                <option value="medium">Medium</option>
                                                <option value="heavy">Heavy</option>
                                            </select>
                                        )}
                                    </div>

                                    <button
                                        onClick={handleAdvancedEnhance}
                                        disabled={isEnhancing || (!options.applyNoise && !options.normalize && !options.applyClarity)}
                                        className="w-full btn btn-primary text-sm"
                                    >
                                        {isEnhancing ? (
                                            <>
                                                <div className="spinner w-4 h-4" />
                                                Enhancing...
                                            </>
                                        ) : (
                                            'Apply Custom Enhancement'
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        )}

                        {/* Enhancement Result */}
                        {enhanceResult && (
                            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                                <div className="flex items-center gap-2 text-green-400 mb-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="font-medium">Audio Enhanced!</span>
                                </div>
                                <p className="text-sm text-[var(--text-muted)] mb-3">{enhanceResult.filename}</p>
                                <a
                                    href={enhanceResult.url}
                                    download={enhanceResult.filename}
                                    className="btn btn-primary text-sm w-full"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download Enhanced Video
                                </a>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
