'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getDashboardData, DashboardData } from '@/lib/api';

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);

    useEffect(() => {
        loadDashboard();
    }, [days]);

    async function loadDashboard() {
        setLoading(true);
        try {
            const response = await getDashboardData(days);
            if (response.success && response.data) {
                setData(response.data);
            }
        } catch (err) {
            console.error('Failed to load dashboard:', err);
        } finally {
            setLoading(false);
        }
    }

    function formatNumber(num: number): string {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    function formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    const tierColors: Record<string, string> = {
        free: 'text-[var(--text-muted)]',
        creator: 'text-[var(--accent-primary)]',
        business: 'text-[var(--accent-alt)]'
    };

    return (
        <div className="min-h-screen">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 glass">
                <div className="container h-14 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)] flex-center">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <span className="font-semibold text-lg">Kalakar</span>
                    </Link>

                    <div className="flex items-center gap-3">
                        <Link href="/projects" className="btn btn-ghost text-sm">
                            Projects
                        </Link>
                        <Link href="/editor" className="btn btn-ghost text-sm">
                            Editor
                        </Link>
                        <Link href="/pricing" className="btn btn-primary text-sm">
                            Upgrade
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="pt-24 pb-12">
                <div className="container">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
                            <p className="text-[var(--text-secondary)]">
                                Track your usage and performance metrics
                            </p>
                        </div>

                        {/* Time Range Selector */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-[var(--text-muted)]">Period:</span>
                            <select
                                value={days}
                                onChange={(e) => setDays(parseInt(e.target.value))}
                                className="input py-2 px-3 w-auto"
                            >
                                <option value={7}>Last 7 days</option>
                                <option value={30}>Last 30 days</option>
                                <option value={90}>Last 90 days</option>
                            </select>
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="flex items-center justify-center py-20">
                            <div className="spinner" />
                        </div>
                    )}

                    {!loading && data && (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                <div className="card">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-[var(--accent-primary)]/10 flex-center text-[var(--accent-primary)]">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div className="text-sm text-[var(--text-muted)]">Credits Left</div>
                                    </div>
                                    <div className="text-2xl font-bold">{formatNumber(data.summary.creditsRemaining)}</div>
                                    <div className="text-xs text-[var(--text-muted)] mt-1">
                                        {formatNumber(data.summary.creditsUsed)} used
                                    </div>
                                </div>

                                <div className="card">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-[var(--success)]/10 flex-center text-[var(--success)]">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div className="text-sm text-[var(--text-muted)]">Videos</div>
                                    </div>
                                    <div className="text-2xl font-bold">{data.summary.videoCount}</div>
                                    <div className="text-xs text-[var(--text-muted)] mt-1">
                                        {data.summary.projectCount} projects
                                    </div>
                                </div>

                                <div className="card">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-[var(--info)]/10 flex-center text-[var(--info)]">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <div className="text-sm text-[var(--text-muted)]">Transcriptions</div>
                                    </div>
                                    <div className="text-2xl font-bold">{data.summary.transcriptionCount}</div>
                                    <div className="text-xs text-[var(--text-muted)] mt-1">
                                        {formatNumber(data.summary.totalWords)} words
                                    </div>
                                </div>

                                <div className="card">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-[var(--warning)]/10 flex-center text-[var(--warning)]">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </div>
                                        <div className="text-sm text-[var(--text-muted)]">Exports</div>
                                    </div>
                                    <div className="text-2xl font-bold">{data.summary.exportCount}</div>
                                    <div className="text-xs text-[var(--text-muted)] mt-1">
                                        {formatBytes(data.exports.totalSize)}
                                    </div>
                                </div>
                            </div>

                            {/* Main Grid */}
                            <div className="grid lg:grid-cols-3 gap-6 mb-8">
                                {/* Activity Timeline */}
                                <div className="lg:col-span-2 card">
                                    <h2 className="text-lg font-semibold mb-4">Activity Over Time</h2>
                                    {data.stats.timeline.length > 0 ? (
                                        <div className="h-48 flex items-end gap-1">
                                            {data.stats.timeline.slice(-30).map((item, index) => {
                                                const maxCredits = Math.max(...data.stats.timeline.map(t => t.creditsUsed));
                                                const height = maxCredits > 0 ? (item.creditsUsed / maxCredits) * 100 : 0;
                                                return (
                                                    <div
                                                        key={index}
                                                        className="flex-1 bg-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]/40 rounded-t transition-all group relative"
                                                        style={{ height: `${Math.max(height, 4)}%` }}
                                                        title={`${item.date}: ${item.creditsUsed} credits`}
                                                    >
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                            <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded px-2 py-1 text-xs whitespace-nowrap">
                                                                {item.creditsUsed} credits
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="h-48 flex items-center justify-center text-[var(--text-muted)]">
                                            No activity data yet
                                        </div>
                                    )}
                                    <div className="flex justify-between mt-4 text-xs text-[var(--text-muted)]">
                                        <span>{formatDate(data.period.startDate)}</span>
                                        <span>{formatDate(data.period.endDate)}</span>
                                    </div>
                                </div>

                                {/* Account Info */}
                                <div className="card">
                                    <h2 className="text-lg font-semibold mb-4">Account</h2>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[var(--text-muted)]">Plan</span>
                                            <span className={`font-semibold capitalize ${tierColors[data.summary.subscriptionTier] || ''}`}>
                                                {data.summary.subscriptionTier}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[var(--text-muted)]">Member since</span>
                                            <span>{formatDate(data.summary.memberSince)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[var(--text-muted)]">Success rate</span>
                                            <span className="text-[var(--success)]">{data.stats.summary.successRate}%</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[var(--text-muted)]">Avg. credits/day</span>
                                            <span>{data.stats.summary.averageCreditsPerDay}</span>
                                        </div>
                                    </div>

                                    {data.summary.subscriptionTier === 'free' && (
                                        <Link href="/pricing" className="btn btn-primary w-full mt-6">
                                            Upgrade Plan
                                        </Link>
                                    )}
                                </div>
                            </div>

                            {/* Transcription & Export Analytics */}
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Transcription Analytics */}
                                <div className="card">
                                    <h2 className="text-lg font-semibold mb-4">Transcription Stats</h2>
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                                            <div className="text-2xl font-bold text-[var(--accent-primary)]">
                                                {data.transcriptions.successRate}%
                                            </div>
                                            <div className="text-xs text-[var(--text-muted)]">Success Rate</div>
                                        </div>
                                        <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                                            <div className="text-2xl font-bold text-[var(--accent-primary)]">
                                                {data.transcriptions.avgAccuracy}
                                            </div>
                                            <div className="text-xs text-[var(--text-muted)]">Avg. Accuracy</div>
                                        </div>
                                    </div>

                                    <h3 className="text-sm font-medium mb-3 text-[var(--text-secondary)]">Languages Used</h3>
                                    {data.transcriptions.languages.length > 0 ? (
                                        <div className="space-y-2">
                                            {data.transcriptions.languages.slice(0, 5).map((lang) => (
                                                <div key={lang.code} className="flex items-center justify-between">
                                                    <span className="text-sm capitalize">{lang.code}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-[var(--text-muted)]">
                                                            {formatNumber(lang.words)} words
                                                        </span>
                                                        <span className="text-sm font-medium">{lang.count}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-[var(--text-muted)]">No transcriptions yet</p>
                                    )}
                                </div>

                                {/* Export Analytics */}
                                <div className="card">
                                    <h2 className="text-lg font-semibold mb-4">Export Stats</h2>
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                                            <div className="text-2xl font-bold text-[var(--accent-primary)]">
                                                {data.exports.completed}
                                            </div>
                                            <div className="text-xs text-[var(--text-muted)]">Completed</div>
                                        </div>
                                        <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                                            <div className="text-2xl font-bold text-[var(--accent-primary)]">
                                                {formatBytes(data.exports.totalSize)}
                                            </div>
                                            <div className="text-xs text-[var(--text-muted)]">Total Size</div>
                                        </div>
                                    </div>

                                    <h3 className="text-sm font-medium mb-3 text-[var(--text-secondary)]">Export Types</h3>
                                    {data.exports.types.length > 0 ? (
                                        <div className="space-y-2">
                                            {data.exports.types.map((type) => (
                                                <div key={type.type} className="flex items-center justify-between">
                                                    <span className="text-sm capitalize">{type.type.replace(/_/g, ' ')}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-[var(--text-muted)]">
                                                            {formatBytes(type.totalSize)}
                                                        </span>
                                                        <span className="text-sm font-medium">{type.count}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-[var(--text-muted)]">No exports yet</p>
                                    )}

                                    {Object.keys(data.exports.qualityBreakdown).length > 0 && (
                                        <>
                                            <h3 className="text-sm font-medium mb-3 mt-6 text-[var(--text-secondary)]">Quality Distribution</h3>
                                            <div className="flex gap-2">
                                                {Object.entries(data.exports.qualityBreakdown).map(([quality, count]) => (
                                                    <span key={quality} className="badge capitalize">
                                                        {quality}: {count}
                                                    </span>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Empty State */}
                    {!loading && !data && (
                        <div className="card text-center py-16 max-w-lg mx-auto">
                            <div className="w-16 h-16 rounded-full bg-[var(--bg-secondary)] flex-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold mb-2">No data available</h2>
                            <p className="text-[var(--text-secondary)] mb-6">
                                Start uploading videos and creating transcriptions to see your analytics
                            </p>
                            <Link href="/editor" className="btn btn-primary">
                                Go to Editor
                            </Link>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
