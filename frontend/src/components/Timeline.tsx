'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Caption {
    id: string;
    text: string;
    startTime: number;
    endTime: number;
}

interface TimelineProps {
    duration: number;
    currentTime: number;
    captions: Caption[];
    selectedCaption: string | null;
    onTimeSeek: (time: number) => void;
    onCaptionSelect: (id: string) => void;
    onCaptionTimeChange: (id: string, startTime: number, endTime: number) => void;
    waveformData?: number[];
}

export default function Timeline({
    duration,
    currentTime,
    captions,
    selectedCaption,
    onTimeSeek,
    onCaptionSelect,
    onCaptionTimeChange,
    waveformData = []
}: TimelineProps) {
    const timelineRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragType, setDragType] = useState<'playhead' | 'caption-start' | 'caption-end' | null>(null);
    const [dragCaptionId, setDragCaptionId] = useState<string | null>(null);

    // Convert pixel position to time
    const pixelToTime = useCallback((pixel: number) => {
        if (!timelineRef.current) return 0;
        const rect = timelineRef.current.getBoundingClientRect();
        const percentage = Math.max(0, Math.min(1, pixel / rect.width));
        return percentage * duration;
    }, [duration]);

    // Convert time to pixel position
    const timeToPixel = useCallback((time: number) => {
        if (!timelineRef.current) return 0;
        const rect = timelineRef.current.getBoundingClientRect();
        return (time / duration) * rect.width;
    }, [duration]);

    // Handle timeline click
    const handleTimelineClick = (e: React.MouseEvent) => {
        if (isDragging) return;
        
        const rect = timelineRef.current?.getBoundingClientRect();
        if (!rect) return;

        const clickX = e.clientX - rect.left;
        const newTime = pixelToTime(clickX);
        onTimeSeek(newTime);
    };

    // Handle mouse down for dragging
    const handleMouseDown = (e: React.MouseEvent, type: 'playhead' | 'caption-start' | 'caption-end', captionId?: string) => {
        e.stopPropagation();
        setIsDragging(true);
        setDragType(type);
        if (captionId) {
            setDragCaptionId(captionId);
        }
    };

    // Handle mouse move for dragging
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !timelineRef.current) return;

            const rect = timelineRef.current.getBoundingClientRect();
            const newTime = pixelToTime(e.clientX - rect.left);

            if (dragType === 'playhead') {
                onTimeSeek(Math.max(0, Math.min(duration, newTime)));
            } else if (dragType === 'caption-start' && dragCaptionId) {
                const caption = captions.find(c => c.id === dragCaptionId);
                if (caption) {
                    const clampedTime = Math.max(0, Math.min(caption.endTime - 0.1, newTime));
                    onCaptionTimeChange(dragCaptionId, clampedTime, caption.endTime);
                }
            } else if (dragType === 'caption-end' && dragCaptionId) {
                const caption = captions.find(c => c.id === dragCaptionId);
                if (caption) {
                    const clampedTime = Math.max(caption.startTime + 0.1, Math.min(duration, newTime));
                    onCaptionTimeChange(dragCaptionId, caption.startTime, clampedTime);
                }
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setDragType(null);
            setDragCaptionId(null);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragType, dragCaptionId, captions, duration, onTimeSeek, onCaptionTimeChange, pixelToTime]);

    // Format time for display
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    // Generate time markers
    const generateTimeMarkers = () => {
        const markers = [];
        const interval = duration > 60 ? 10 : duration > 30 ? 5 : 1; // Adjust interval based on duration
        
        for (let i = 0; i <= duration; i += interval) {
            const percentage = (i / duration) * 100;
            markers.push(
                <div
                    key={i}
                    className="absolute top-0 bottom-0 flex flex-col items-center"
                    style={{ left: `${percentage}%` }}
                >
                    <div className="w-px bg-[var(--border-primary)] h-2" />
                    <span className="text-xs text-[var(--text-muted)] mt-1 font-mono">
                        {formatTime(i)}
                    </span>
                </div>
            );
        }
        return markers;
    };

    return (
        <div className="timeline-container bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] p-4">
            {/* Timeline Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <span className="text-sm font-mono text-[var(--text-muted)]">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                    <div className="flex items-center gap-2">
                        <button className="btn btn-icon btn-secondary text-xs">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>
                        <button className="btn btn-icon btn-secondary text-xs">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)]">Zoom:</span>
                    <input
                        type="range"
                        min="1"
                        max="10"
                        defaultValue="1"
                        className="w-20"
                    />
                </div>
            </div>

            {/* Main Timeline */}
            <div className="relative">
                {/* Time Markers */}
                <div className="relative h-8 mb-2">
                    {generateTimeMarkers()}
                </div>

                {/* Waveform */}
                {waveformData.length > 0 && (
                    <div className="relative h-16 bg-[var(--bg-tertiary)] rounded-lg mb-2 overflow-hidden">
                        <svg className="w-full h-full">
                            {waveformData.map((amplitude, index) => {
                                const x = (index / waveformData.length) * 100;
                                const height = amplitude * 60; // Scale to fit container
                                return (
                                    <rect
                                        key={index}
                                        x={`${x}%`}
                                        y={`${(60 - height) / 2}`}
                                        width="2"
                                        height={height}
                                        fill="var(--accent-primary)"
                                        opacity="0.6"
                                    />
                                );
                            })}
                        </svg>
                    </div>
                )}

                {/* Caption Track */}
                <div
                    ref={timelineRef}
                    className="relative h-12 bg-[var(--bg-tertiary)] rounded-lg cursor-pointer select-none"
                    onClick={handleTimelineClick}
                >
                    {/* Caption Blocks */}
                    {captions.map((caption) => {
                        const left = (caption.startTime / duration) * 100;
                        const width = ((caption.endTime - caption.startTime) / duration) * 100;
                        const isSelected = selectedCaption === caption.id;
                        
                        return (
                            <div
                                key={caption.id}
                                className={`absolute top-1 bottom-1 rounded cursor-pointer transition-all group ${
                                    isSelected
                                        ? 'bg-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/50'
                                        : 'bg-[var(--accent-primary)]/60 hover:bg-[var(--accent-primary)]/80'
                                }`}
                                style={{ left: `${left}%`, width: `${Math.max(2, width)}%` }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCaptionSelect(caption.id);
                                }}
                            >
                                {/* Caption Text */}
                                <div className="px-2 py-1 text-xs text-white truncate">
                                    {caption.text}
                                </div>

                                {/* Resize Handles */}
                                {isSelected && (
                                    <>
                                        {/* Start Handle */}
                                        <div
                                            className="absolute left-0 top-0 bottom-0 w-2 bg-white/20 cursor-ew-resize hover:bg-white/40 transition-colors"
                                            onMouseDown={(e) => handleMouseDown(e, 'caption-start', caption.id)}
                                        >
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-white rounded-r" />
                                        </div>

                                        {/* End Handle */}
                                        <div
                                            className="absolute right-0 top-0 bottom-0 w-2 bg-white/20 cursor-ew-resize hover:bg-white/40 transition-colors"
                                            onMouseDown={(e) => handleMouseDown(e, 'caption-end', caption.id)}
                                        >
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-white rounded-l" />
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}

                    {/* Playhead */}
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 cursor-ew-resize"
                        style={{ left: `${(currentTime / duration) * 100}%` }}
                        onMouseDown={(e) => handleMouseDown(e, 'playhead')}
                    >
                        {/* Playhead Handle */}
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg cursor-ew-resize" />
                        
                        {/* Playhead Line */}
                        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-red-500" />
                    </div>
                </div>

                {/* Timeline Controls */}
                <div className="flex items-center justify-between mt-3 text-xs text-[var(--text-muted)]">
                    <div className="flex items-center gap-4">
                        <span>Captions: {captions.length}</span>
                        <span>Duration: {formatTime(duration)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button className="hover:text-[var(--text-primary)] transition-colors">
                            Snap to Grid
                        </button>
                        <button className="hover:text-[var(--text-primary)] transition-colors">
                            Auto-fit
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}