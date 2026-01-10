'use client';

import { useState, useRef, useEffect } from 'react';

interface Caption {
    id: string;
    text: string;
    startTime: number;
    endTime: number;
}

interface CaptionEditorProps {
    captions: Caption[];
    selectedCaption: string | null;
    currentTime: number;
    onCaptionUpdate: (id: string, updates: Partial<Caption>) => void;
    onCaptionSelect: (id: string) => void;
    onCaptionDelete: (id: string) => void;
    onCaptionAdd: (startTime: number) => void;
    onSeekToCaption: (time: number) => void;
}

export default function CaptionEditor({
    captions,
    selectedCaption,
    currentTime,
    onCaptionUpdate,
    onCaptionSelect,
    onCaptionDelete,
    onCaptionAdd,
    onSeekToCaption
}: CaptionEditorProps) {
    const [editingCaption, setEditingCaption] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [replaceMode, setReplaceMode] = useState(false);
    const [replaceTerm, setReplaceTerm] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-focus textarea when editing starts
    useEffect(() => {
        if (editingCaption && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.select();
        }
    }, [editingCaption]);

    // Format time for display
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    // Parse time input (MM:SS.MS format)
    const parseTime = (timeStr: string): number => {
        const parts = timeStr.split(':');
        if (parts.length !== 2) return 0;
        
        const minutes = parseInt(parts[0]) || 0;
        const secondsParts = parts[1].split('.');
        const seconds = parseInt(secondsParts[0]) || 0;
        const milliseconds = parseInt(secondsParts[1]?.padEnd(2, '0') || '0') || 0;
        
        return minutes * 60 + seconds + milliseconds / 100;
    };

    // Get current caption based on playback time
    const currentCaption = captions.find(
        (cap) => currentTime >= cap.startTime && currentTime < cap.endTime
    );

    // Filter captions based on search
    const filteredCaptions = captions.filter(caption =>
        searchTerm === '' || caption.text.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handle text editing
    const handleTextEdit = (caption: Caption, newText: string) => {
        onCaptionUpdate(caption.id, { text: newText });
    };

    // Handle time editing
    const handleTimeEdit = (caption: Caption, field: 'startTime' | 'endTime', value: string) => {
        const newTime = parseTime(value);
        if (field === 'startTime' && newTime < caption.endTime) {
            onCaptionUpdate(caption.id, { startTime: newTime });
        } else if (field === 'endTime' && newTime > caption.startTime) {
            onCaptionUpdate(caption.id, { endTime: newTime });
        }
    };

    // Handle search and replace
    const handleReplaceAll = () => {
        if (!searchTerm || !replaceTerm) return;
        
        captions.forEach(caption => {
            if (caption.text.toLowerCase().includes(searchTerm.toLowerCase())) {
                const newText = caption.text.replace(
                    new RegExp(searchTerm, 'gi'),
                    replaceTerm
                );
                onCaptionUpdate(caption.id, { text: newText });
            }
        });
        
        setSearchTerm('');
        setReplaceTerm('');
        setReplaceMode(false);
    };

    // Handle keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent, caption: Caption) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            setEditingCaption(null);
        } else if (e.key === 'Escape') {
            setEditingCaption(null);
        } else if (e.key === 'Delete' && e.ctrlKey) {
            e.preventDefault();
            onCaptionDelete(caption.id);
        }
    };

    return (
        <div className="caption-editor h-full flex flex-col">
            {/* Header with Search */}
            <div className="p-4 border-b border-[var(--border-primary)]">
                <div className="flex items-center gap-2 mb-3">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Search captions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input text-sm pl-8"
                        />
                        <svg className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    
                    <button
                        onClick={() => setReplaceMode(!replaceMode)}
                        className={`btn btn-icon ${replaceMode ? 'btn-primary' : 'btn-secondary'}`}
                        title="Search & Replace"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                    </button>
                    
                    <button
                        onClick={() => onCaptionAdd(currentTime)}
                        className="btn btn-primary text-sm"
                        title="Add Caption at Current Time"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add
                    </button>
                </div>

                {/* Replace Mode */}
                {replaceMode && (
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Replace with..."
                            value={replaceTerm}
                            onChange={(e) => setReplaceTerm(e.target.value)}
                            className="input text-sm flex-1"
                        />
                        <button
                            onClick={handleReplaceAll}
                            disabled={!searchTerm || !replaceTerm}
                            className="btn btn-primary text-sm"
                        >
                            Replace All
                        </button>
                    </div>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mt-2">
                    <span>
                        {filteredCaptions.length} of {captions.length} captions
                        {searchTerm && ` matching "${searchTerm}"`}
                    </span>
                    <span>
                        Total duration: {formatTime(captions.reduce((acc, cap) => acc + (cap.endTime - cap.startTime), 0))}
                    </span>
                </div>
            </div>

            {/* Caption List */}
            <div className="flex-1 overflow-y-auto">
                {filteredCaptions.length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-muted)]">
                        {captions.length === 0 ? (
                            <>
                                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                </svg>
                                <p>No captions yet</p>
                                <p className="text-xs mt-1">Upload a video and transcribe to get started</p>
                            </>
                        ) : (
                            <>
                                <p>No captions match "{searchTerm}"</p>
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="text-[var(--accent-primary)] text-xs mt-1 hover:underline"
                                >
                                    Clear search
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-1 p-2">
                        {filteredCaptions.map((caption, index) => {
                            const isSelected = selectedCaption === caption.id;
                            const isCurrent = currentCaption?.id === caption.id;
                            const isEditing = editingCaption === caption.id;
                            
                            return (
                                <div
                                    key={caption.id}
                                    className={`caption-item p-3 rounded-lg border transition-all cursor-pointer ${
                                        isSelected
                                            ? 'bg-[var(--accent-primary)]/20 border-[var(--accent-primary)]'
                                            : isCurrent
                                                ? 'bg-[var(--bg-elevated)] border-[var(--border-secondary)] ring-1 ring-[var(--accent-primary)]/30'
                                                : 'bg-[var(--bg-card)] border-transparent hover:border-[var(--border-primary)]'
                                    }`}
                                    onClick={() => onCaptionSelect(caption.id)}
                                >
                                    {/* Caption Header */}
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                                                #{index + 1}
                                            </span>
                                            {isCurrent && (
                                                <span className="text-xs bg-[var(--accent-primary)] text-white px-2 py-1 rounded">
                                                    PLAYING
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSeekToCaption(caption.startTime);
                                                }}
                                                className="btn btn-icon btn-ghost text-xs"
                                                title="Seek to caption"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-10V4a2 2 0 00-2-2H5a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2V4z" />
                                                </svg>
                                            </button>
                                            
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingCaption(isEditing ? null : caption.id);
                                                }}
                                                className="btn btn-icon btn-ghost text-xs"
                                                title="Edit caption"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onCaptionDelete(caption.id);
                                                }}
                                                className="btn btn-icon btn-ghost text-xs text-red-400 hover:text-red-300"
                                                title="Delete caption"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Timing Controls */}
                                    <div className="flex items-center gap-2 mb-2 text-xs">
                                        <input
                                            type="text"
                                            value={formatTime(caption.startTime)}
                                            onChange={(e) => handleTimeEdit(caption, 'startTime', e.target.value)}
                                            className="font-mono bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded px-2 py-1 w-20 text-center"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <span className="text-[var(--text-muted)]">→</span>
                                        <input
                                            type="text"
                                            value={formatTime(caption.endTime)}
                                            onChange={(e) => handleTimeEdit(caption, 'endTime', e.target.value)}
                                            className="font-mono bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded px-2 py-1 w-20 text-center"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <span className="text-[var(--text-muted)] ml-auto">
                                            {formatTime(caption.endTime - caption.startTime)}
                                        </span>
                                    </div>

                                    {/* Caption Text */}
                                    {isEditing ? (
                                        <textarea
                                            ref={textareaRef}
                                            value={caption.text}
                                            onChange={(e) => handleTextEdit(caption, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, caption)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full bg-[var(--bg-primary)] border border-[var(--accent-primary)] rounded px-3 py-2 text-sm resize-none"
                                            rows={3}
                                            placeholder="Enter caption text..."
                                        />
                                    ) : (
                                        <div
                                            className="text-sm text-[var(--text-primary)] leading-relaxed cursor-text"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingCaption(caption.id);
                                            }}
                                        >
                                            {caption.text || (
                                                <span className="text-[var(--text-muted)] italic">
                                                    Click to add text...
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Character Count */}
                                    <div className="flex items-center justify-between mt-2 text-xs text-[var(--text-muted)]">
                                        <span>{caption.text.length} characters</span>
                                        <span>
                                            {Math.ceil(caption.text.length / 40)} lines
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer with Shortcuts */}
            <div className="p-3 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
                <div className="text-xs text-[var(--text-muted)] space-y-1">
                    <div className="flex items-center justify-between">
                        <span>Shortcuts:</span>
                        <span>Enter: Save • Esc: Cancel • Ctrl+Del: Delete</span>
                    </div>
                </div>
            </div>
        </div>
    );
}