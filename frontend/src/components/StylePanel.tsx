'use client';

import { useState } from 'react';

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

interface StylePanelProps {
    style: CaptionStyle;
    onStyleChange: (updates: Partial<CaptionStyle>) => void;
    previewText?: string;
}

const fonts = [
    'Inter', 'Poppins', 'Roboto', 'Montserrat', 'Open Sans',
    'Lato', 'Oswald', 'Playfair Display', 'Bebas Neue', 'Anton',
    'Nunito', 'Source Sans Pro', 'Raleway', 'Ubuntu', 'Merriweather'
];

const colorPresets = [
    '#FFFFFF', '#000000', '#FFFF00', '#00FF00', '#00FFFF', '#FF00FF',
    '#FF0000', '#FFA500', '#A35C5C', '#6366F1', '#8B5CF6', '#EC4899',
    '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#6B7280', '#1F2937'
];

const backgroundPresets = [
    'rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0.4)',
    'rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.4)',
    'rgba(99, 102, 241, 0.8)', 'rgba(139, 92, 246, 0.8)', 'rgba(236, 72, 153, 0.8)',
    'rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(239, 68, 68, 0.8)',
    'transparent'
];

export default function StylePanel({ style, onStyleChange, previewText = "Sample Caption Text" }: StylePanelProps) {
    const [activeSection, setActiveSection] = useState<'font' | 'color' | 'background' | 'effects' | 'layout'>('font');

    const updateStyle = (updates: Partial<CaptionStyle>) => {
        onStyleChange(updates);
    };

    const getPreviewStyle = (): React.CSSProperties => ({
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

    const sections = [
        { id: 'font', name: 'Font', icon: '🔤' },
        { id: 'color', name: 'Color', icon: '🎨' },
        { id: 'background', name: 'Background', icon: '🖼️' },
        { id: 'effects', name: 'Effects', icon: '✨' },
        { id: 'layout', name: 'Layout', icon: '📐' },
    ] as const;

    return (
        <div className="style-panel h-full flex flex-col">
            {/* Preview */}
            <div className="p-4 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
                <div className="text-xs text-[var(--text-muted)] mb-2">Preview</div>
                <div className="flex items-center justify-center min-h-[80px] bg-gradient-to-br from-gray-900 to-gray-700 rounded-lg p-4">
                    <div style={getPreviewStyle()}>
                        {previewText}
                    </div>
                </div>
            </div>

            {/* Section Tabs */}
            <div className="flex border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
                {sections.map((section) => (
                    <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`flex-1 py-2 px-1 text-xs font-medium transition-colors ${
                            activeSection === section.id
                                ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        <div className="flex flex-col items-center gap-1">
                            <span>{section.icon}</span>
                            <span>{section.name}</span>
                        </div>
                    </button>
                ))}
            </div>

            {/* Section Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeSection === 'font' && (
                    <div className="space-y-4">
                        {/* Font Family */}
                        <div>
                            <label className="text-sm text-[var(--text-secondary)] mb-2 block">Font Family</label>
                            <select
                                value={style.fontFamily}
                                onChange={(e) => updateStyle({ fontFamily: e.target.value })}
                                className="input text-sm"
                            >
                                {fonts.map(font => (
                                    <option key={font} value={font} style={{ fontFamily: font }}>
                                        {font}
                                    </option>
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
                                onChange={(e) => updateStyle({ fontSize: parseInt(e.target.value) })}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                                <span>12px</span>
                                <span>72px</span>
                            </div>
                        </div>

                        {/* Letter Spacing */}
                        <div>
                            <label className="text-sm text-[var(--text-secondary)] mb-2 block">
                                Letter Spacing: {style.letterSpacing}px
                            </label>
                            <input
                                type="range"
                                min={-2}
                                max={5}
                                step={0.1}
                                value={style.letterSpacing}
                                onChange={(e) => updateStyle({ letterSpacing: parseFloat(e.target.value) })}
                                className="w-full"
                            />
                        </div>

                        {/* Line Height */}
                        <div>
                            <label className="text-sm text-[var(--text-secondary)] mb-2 block">
                                Line Height: {style.lineHeight}
                            </label>
                            <input
                                type="range"
                                min={1}
                                max={2}
                                step={0.1}
                                value={style.lineHeight}
                                onChange={(e) => updateStyle({ lineHeight: parseFloat(e.target.value) })}
                                className="w-full"
                            />
                        </div>

                        {/* Text Styles */}
                        <div>
                            <label className="text-sm text-[var(--text-secondary)] mb-2 block">Text Style</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => updateStyle({ bold: !style.bold })}
                                    className={`btn btn-icon ${style.bold ? 'btn-primary' : 'btn-secondary'}`}
                                    title="Bold"
                                >
                                    <span className="font-bold">B</span>
                                </button>
                                <button
                                    onClick={() => updateStyle({ italic: !style.italic })}
                                    className={`btn btn-icon ${style.italic ? 'btn-primary' : 'btn-secondary'}`}
                                    title="Italic"
                                >
                                    <span className="italic">I</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'color' && (
                    <div className="space-y-4">
                        {/* Text Color */}
                        <div>
                            <label className="text-sm text-[var(--text-secondary)] mb-2 block">Text Color</label>
                            <div className="grid grid-cols-6 gap-2 mb-3">
                                {colorPresets.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => updateStyle({ color })}
                                        className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${
                                            style.color === color ? 'border-white ring-2 ring-[var(--accent-primary)]' : 'border-[var(--border-primary)]'
                                        }`}
                                        style={{ backgroundColor: color }}
                                        title={color}
                                    />
                                ))}
                            </div>
                            <input
                                type="text"
                                value={style.color}
                                onChange={(e) => updateStyle({ color: e.target.value })}
                                className="input text-sm font-mono"
                                placeholder="#FFFFFF"
                            />
                        </div>

                        {/* Outline */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm text-[var(--text-secondary)]">Text Outline</label>
                                <button
                                    onClick={() => updateStyle({ outline: !style.outline })}
                                    className={`btn btn-sm ${style.outline ? 'btn-primary' : 'btn-secondary'}`}
                                >
                                    {style.outline ? 'On' : 'Off'}
                                </button>
                            </div>
                            {style.outline && (
                                <div className="grid grid-cols-6 gap-2">
                                    {colorPresets.slice(0, 12).map(color => (
                                        <button
                                            key={color}
                                            onClick={() => updateStyle({ outlineColor: color })}
                                            className={`w-6 h-6 rounded border-2 transition-transform hover:scale-110 ${
                                                style.outlineColor === color ? 'border-white' : 'border-[var(--border-primary)]'
                                            }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeSection === 'background' && (
                    <div className="space-y-4">
                        {/* Background Color */}
                        <div>
                            <label className="text-sm text-[var(--text-secondary)] mb-2 block">Background</label>
                            <div className="grid grid-cols-4 gap-2 mb-3">
                                {backgroundPresets.map((bg, index) => (
                                    <button
                                        key={index}
                                        onClick={() => updateStyle({ backgroundColor: bg })}
                                        className={`h-8 rounded-lg border-2 transition-transform hover:scale-105 relative overflow-hidden ${
                                            style.backgroundColor === bg ? 'border-white ring-2 ring-[var(--accent-primary)]' : 'border-[var(--border-primary)]'
                                        }`}
                                        style={{ backgroundColor: bg === 'transparent' ? 'transparent' : bg }}
                                        title={bg}
                                    >
                                        {bg === 'transparent' && (
                                            <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-red-500 opacity-50" 
                                                 style={{ 
                                                     backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                                                     backgroundSize: '8px 8px',
                                                     backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
                                                 }} 
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="text"
                                value={style.backgroundColor}
                                onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                                className="input text-sm font-mono"
                                placeholder="rgba(0, 0, 0, 0.8)"
                            />
                        </div>

                        {/* Padding */}
                        <div>
                            <label className="text-sm text-[var(--text-secondary)] mb-2 block">
                                Padding: {style.padding}px
                            </label>
                            <input
                                type="range"
                                min={0}
                                max={20}
                                value={style.padding}
                                onChange={(e) => updateStyle({ padding: parseInt(e.target.value) })}
                                className="w-full"
                            />
                        </div>

                        {/* Border Radius */}
                        <div>
                            <label className="text-sm text-[var(--text-secondary)] mb-2 block">
                                Border Radius: {style.borderRadius}px
                            </label>
                            <input
                                type="range"
                                min={0}
                                max={20}
                                value={style.borderRadius}
                                onChange={(e) => updateStyle({ borderRadius: parseInt(e.target.value) })}
                                className="w-full"
                            />
                        </div>

                        {/* Opacity */}
                        <div>
                            <label className="text-sm text-[var(--text-secondary)] mb-2 block">
                                Opacity: {Math.round(style.opacity * 100)}%
                            </label>
                            <input
                                type="range"
                                min={0.1}
                                max={1}
                                step={0.1}
                                value={style.opacity}
                                onChange={(e) => updateStyle({ opacity: parseFloat(e.target.value) })}
                                className="w-full"
                            />
                        </div>
                    </div>
                )}

                {activeSection === 'effects' && (
                    <div className="space-y-4">
                        {/* Shadow */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm text-[var(--text-secondary)]">Drop Shadow</label>
                                <button
                                    onClick={() => updateStyle({ shadow: !style.shadow })}
                                    className={`btn btn-sm ${style.shadow ? 'btn-primary' : 'btn-secondary'}`}
                                >
                                    {style.shadow ? 'On' : 'Off'}
                                </button>
                            </div>
                            <p className="text-xs text-[var(--text-muted)]">
                                Adds a subtle shadow behind text for better readability
                            </p>
                        </div>

                        {/* Animation Presets */}
                        <div>
                            <label className="text-sm text-[var(--text-secondary)] mb-2 block">Animation (Coming Soon)</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['Fade In', 'Slide Up', 'Type Writer', 'Bounce'].map((animation) => (
                                    <button
                                        key={animation}
                                        disabled
                                        className="btn btn-secondary text-xs opacity-50 cursor-not-allowed"
                                    >
                                        {animation}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'layout' && (
                    <div className="space-y-4">
                        {/* Position */}
                        <div>
                            <label className="text-sm text-[var(--text-secondary)] mb-2 block">Position</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['top', 'center', 'bottom'] as const).map(pos => (
                                    <button
                                        key={pos}
                                        onClick={() => updateStyle({ position: pos })}
                                        className={`btn text-sm capitalize ${
                                            style.position === pos ? 'btn-primary' : 'btn-secondary'
                                        }`}
                                    >
                                        {pos}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Alignment (Coming Soon) */}
                        <div>
                            <label className="text-sm text-[var(--text-secondary)] mb-2 block">Alignment (Coming Soon)</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Left', 'Center', 'Right'].map((align) => (
                                    <button
                                        key={align}
                                        disabled
                                        className="btn btn-secondary text-xs opacity-50 cursor-not-allowed"
                                    >
                                        {align}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Safe Area */}
                        <div>
                            <label className="text-sm text-[var(--text-secondary)] mb-2 block">Safe Area Margins</label>
                            <div className="text-xs text-[var(--text-muted)] p-3 bg-[var(--bg-tertiary)] rounded-lg">
                                <p>Captions will automatically avoid UI elements and maintain readable margins.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="p-3 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            // Reset to default style
                            updateStyle({
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
                            });
                        }}
                        className="btn btn-secondary text-xs flex-1"
                    >
                        Reset
                    </button>
                    <button className="btn btn-primary text-xs flex-1">
                        Save Preset
                    </button>
                </div>
            </div>
        </div>
    );
}