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
    outline?: boolean;
    outlineColor?: string;
    padding?: number;
    borderRadius?: number;
    opacity?: number;
    letterSpacing?: number;
    lineHeight?: number;
}

interface Template {
    id: string;
    name: string;
    category: string;
    description: string;
    style: CaptionStyle;
    preview: string;
    popular?: boolean;
    premium?: boolean;
}

interface TemplateGalleryProps {
    onTemplateSelect: (template: Template) => void;
    currentStyle?: CaptionStyle;
}

const templates: Template[] = [
    // Creator Templates
    {
        id: 'mrbeast',
        name: 'MrBeast',
        category: 'Creator',
        description: 'Bold yellow text with strong impact',
        preview: 'INSANE CHALLENGE!',
        popular: true,
        style: {
            fontFamily: 'Bebas Neue',
            fontSize: 32,
            color: '#FFFF00',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            position: 'bottom',
            bold: true,
            italic: false,
            shadow: true,
            outline: true,
            outlineColor: '#000000',
            padding: 12,
            borderRadius: 6,
            opacity: 1,
            letterSpacing: 1,
            lineHeight: 1.1,
        }
    },
    {
        id: 'alex-hormozi',
        name: 'Alex Hormozi',
        category: 'Creator',
        description: 'Clean white text for business content',
        preview: 'Here\'s the truth...',
        popular: true,
        style: {
            fontFamily: 'Anton',
            fontSize: 28,
            color: '#FFFFFF',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            position: 'bottom',
            bold: true,
            italic: false,
            shadow: true,
            padding: 10,
            borderRadius: 4,
            opacity: 1,
            letterSpacing: 0.5,
            lineHeight: 1.2,
        }
    },
    {
        id: 'ali-abdaal',
        name: 'Ali Abdaal',
        category: 'Creator',
        description: 'Minimal and clean for educational content',
        preview: 'Let me explain this...',
        style: {
            fontFamily: 'Inter',
            fontSize: 22,
            color: '#FFFFFF',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            position: 'bottom',
            bold: false,
            italic: false,
            shadow: false,
            padding: 8,
            borderRadius: 8,
            opacity: 1,
            letterSpacing: 0,
            lineHeight: 1.3,
        }
    },
    {
        id: 'mkbhd',
        name: 'MKBHD',
        category: 'Creator',
        description: 'Tech review style with subtle background',
        preview: 'This is actually pretty cool',
        style: {
            fontFamily: 'Roboto',
            fontSize: 24,
            color: '#FFFFFF',
            backgroundColor: 'rgba(20, 20, 20, 0.85)',
            position: 'bottom',
            bold: false,
            italic: false,
            shadow: true,
            padding: 10,
            borderRadius: 6,
            opacity: 1,
            letterSpacing: 0,
            lineHeight: 1.25,
        }
    },

    // Style Categories
    {
        id: 'minimal-white',
        name: 'Minimal White',
        category: 'Minimal',
        description: 'Clean white text, no background',
        preview: 'Simple and elegant',
        style: {
            fontFamily: 'Inter',
            fontSize: 20,
            color: '#FFFFFF',
            backgroundColor: 'transparent',
            position: 'bottom',
            bold: false,
            italic: false,
            shadow: true,
            padding: 0,
            borderRadius: 0,
            opacity: 1,
            letterSpacing: 0,
            lineHeight: 1.4,
        }
    },
    {
        id: 'bold-impact',
        name: 'Bold Impact',
        category: 'Bold',
        description: 'Maximum impact with large bold text',
        preview: 'ATTENTION!',
        popular: true,
        style: {
            fontFamily: 'Oswald',
            fontSize: 36,
            color: '#FF0000',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            position: 'center',
            bold: true,
            italic: false,
            shadow: true,
            outline: true,
            outlineColor: '#000000',
            padding: 15,
            borderRadius: 8,
            opacity: 1,
            letterSpacing: 2,
            lineHeight: 1.1,
        }
    },
    {
        id: 'neon-glow',
        name: 'Neon Glow',
        category: 'Creative',
        description: 'Futuristic neon style',
        preview: 'CYBER VIBES',
        premium: true,
        style: {
            fontFamily: 'Bebas Neue',
            fontSize: 30,
            color: '#00FFFF',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            position: 'center',
            bold: true,
            italic: false,
            shadow: true,
            outline: true,
            outlineColor: '#0080FF',
            padding: 12,
            borderRadius: 10,
            opacity: 1,
            letterSpacing: 3,
            lineHeight: 1.2,
        }
    },
    {
        id: 'vintage-film',
        name: 'Vintage Film',
        category: 'Creative',
        description: 'Classic movie subtitle style',
        preview: 'Once upon a time...',
        style: {
            fontFamily: 'Playfair Display',
            fontSize: 24,
            color: '#F5F5DC',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            position: 'bottom',
            bold: false,
            italic: true,
            shadow: false,
            padding: 12,
            borderRadius: 0,
            opacity: 1,
            letterSpacing: 1,
            lineHeight: 1.4,
        }
    },

    // Indian Language Optimized
    {
        id: 'hindi-bold',
        name: 'Hindi Bold',
        category: 'Indian',
        description: 'Optimized for Hindi text',
        preview: 'यह बहुत अच्छा है!',
        style: {
            fontFamily: 'Poppins',
            fontSize: 26,
            color: '#FFFFFF',
            backgroundColor: 'rgba(255, 153, 0, 0.9)',
            position: 'bottom',
            bold: true,
            italic: false,
            shadow: true,
            padding: 10,
            borderRadius: 6,
            opacity: 1,
            letterSpacing: 0,
            lineHeight: 1.3,
        }
    },
    {
        id: 'tamil-elegant',
        name: 'Tamil Elegant',
        category: 'Indian',
        description: 'Beautiful Tamil typography',
        preview: 'இது மிகவும் அருமை!',
        style: {
            fontFamily: 'Lato',
            fontSize: 24,
            color: '#FFFFFF',
            backgroundColor: 'rgba(139, 69, 19, 0.8)',
            position: 'bottom',
            bold: false,
            italic: false,
            shadow: true,
            padding: 12,
            borderRadius: 8,
            opacity: 1,
            letterSpacing: 0.5,
            lineHeight: 1.4,
        }
    },

    // Business & Professional
    {
        id: 'corporate-clean',
        name: 'Corporate Clean',
        category: 'Business',
        description: 'Professional presentation style',
        preview: 'Key insights from our data',
        style: {
            fontFamily: 'Source Sans Pro',
            fontSize: 22,
            color: '#2D3748',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            position: 'bottom',
            bold: false,
            italic: false,
            shadow: false,
            padding: 12,
            borderRadius: 4,
            opacity: 1,
            letterSpacing: 0,
            lineHeight: 1.5,
        }
    },
    {
        id: 'news-ticker',
        name: 'News Ticker',
        category: 'Business',
        description: 'Breaking news style',
        preview: 'BREAKING: Important Update',
        style: {
            fontFamily: 'Roboto',
            fontSize: 20,
            color: '#FFFFFF',
            backgroundColor: 'rgba(220, 38, 127, 0.9)',
            position: 'bottom',
            bold: true,
            italic: false,
            shadow: false,
            padding: 8,
            borderRadius: 0,
            opacity: 1,
            letterSpacing: 1,
            lineHeight: 1.2,
        }
    }
];

const categories = ['All', 'Creator', 'Minimal', 'Bold', 'Creative', 'Indian', 'Business'];

export default function TemplateGallery({ onTemplateSelect, currentStyle }: TemplateGalleryProps) {
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTemplates = templates.filter(template => {
        const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
        const matchesSearch = searchTerm === '' || 
            template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            template.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const getPreviewStyle = (style: CaptionStyle): React.CSSProperties => ({
        fontFamily: style.fontFamily,
        fontSize: `${Math.min(style.fontSize * 0.7, 16)}px`, // Scale down for preview
        color: style.color,
        backgroundColor: style.backgroundColor,
        fontWeight: style.bold ? 'bold' : 'normal',
        fontStyle: style.italic ? 'italic' : 'normal',
        textShadow: style.shadow ? '1px 1px 2px rgba(0,0,0,0.8)' : 'none',
        WebkitTextStroke: style.outline ? `0.5px ${style.outlineColor || '#000000'}` : 'none',
        padding: `${(style.padding || 8) * 0.5}px`,
        borderRadius: `${(style.borderRadius || 4) * 0.5}px`,
        opacity: style.opacity || 1,
        letterSpacing: `${(style.letterSpacing || 0) * 0.5}px`,
        lineHeight: style.lineHeight || 1.2,
        display: 'inline-block',
        maxWidth: '100%',
        textAlign: 'center' as const,
        whiteSpace: 'nowrap' as const,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    });

    return (
        <div className="template-gallery h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-[var(--border-primary)]">
                <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-semibold">Caption Templates</h3>
                    <span className="text-xs bg-[var(--accent-primary)] text-white px-2 py-1 rounded">
                        {filteredTemplates.length}
                    </span>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                    <input
                        type="text"
                        placeholder="Search templates..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input text-sm pl-8"
                    />
                    <svg className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-1">
                    {categories.map(category => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                selectedCategory === category
                                    ? 'bg-[var(--accent-primary)] text-white'
                                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                            }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </div>

            {/* Template Grid */}
            <div className="flex-1 overflow-y-auto p-4">
                {filteredTemplates.length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-muted)]">
                        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                        <p>No templates found</p>
                        <p className="text-xs mt-1">Try adjusting your search or category filter</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {filteredTemplates.map((template) => (
                            <div
                                key={template.id}
                                onClick={() => onTemplateSelect(template)}
                                className="template-card p-4 rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)] hover:border-[var(--accent-primary)] cursor-pointer transition-all group"
                            >
                                {/* Template Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-medium text-sm">{template.name}</h4>
                                            {template.popular && (
                                                <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded">
                                                    Popular
                                                </span>
                                            )}
                                            {template.premium && (
                                                <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded">
                                                    Premium
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-[var(--text-muted)]">{template.description}</p>
                                    </div>
                                    
                                    <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                                        {template.category}
                                    </span>
                                </div>

                                {/* Preview */}
                                <div className="preview-container bg-gradient-to-br from-gray-900 to-gray-700 rounded-lg p-4 min-h-[60px] flex items-center justify-center mb-3">
                                    <div style={getPreviewStyle(template.style)}>
                                        {template.preview}
                                    </div>
                                </div>

                                {/* Style Details */}
                                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                                    <div className="flex items-center gap-3">
                                        <span>{template.style.fontFamily}</span>
                                        <span>{template.style.fontSize}px</span>
                                        <span className="capitalize">{template.style.position}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                        {template.style.bold && <span className="font-bold">B</span>}
                                        {template.style.italic && <span className="italic">I</span>}
                                        {template.style.shadow && <span>S</span>}
                                        {template.style.outline && <span>O</span>}
                                    </div>
                                </div>

                                {/* Apply Button (appears on hover) */}
                                <button className="w-full mt-3 btn btn-primary text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                    Apply Template
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>{templates.length} templates available</span>
                    <button className="text-[var(--accent-primary)] hover:underline">
                        Create Custom Template
                    </button>
                </div>
            </div>
        </div>
    );
}