'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
    getProject,
    deleteProject,
    removeVideoFromProject,
    Project,
    ProjectVideo,
    ProjectStats
} from '@/lib/api';

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [project, setProject] = useState<Project | null>(null);
    const [stats, setStats] = useState<ProjectStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (projectId) {
            loadProject();
        }
    }, [projectId]);

    async function loadProject() {
        setLoading(true);
        setError(null);
        try {
            const response = await getProject(projectId);
            if (response.success && response.data) {
                setProject(response.data.project);
                setStats(response.data.stats);
            } else {
                setError(response.message || 'Project not found');
            }
        } catch (err) {
            setError('Failed to load project');
        } finally {
            setLoading(false);
        }
    }

    async function handleDeleteProject() {
        if (!project) return;
        if (!confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await deleteProject(projectId);
            if (response.success) {
                router.push('/projects');
            }
        } catch (err) {
            console.error('Failed to delete project:', err);
        }
    }

    async function handleRemoveVideo(videoId: string, videoName: string) {
        if (!confirm(`Remove "${videoName}" from this project?`)) {
            return;
        }

        try {
            const response = await removeVideoFromProject(projectId, videoId);
            if (response.success) {
                loadProject();
            }
        } catch (err) {
            console.error('Failed to remove video:', err);
        }
    }

    function formatDate(dateString: string) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function formatDuration(seconds: number) {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="card text-center max-w-md">
                    <div className="w-16 h-16 rounded-full bg-[var(--error-bg)] flex-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-[var(--error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
                    <p className="text-[var(--text-secondary)] mb-6">
                        {error || 'The project you are looking for does not exist.'}
                    </p>
                    <Link href="/projects" className="btn btn-primary">
                        Back to Projects
                    </Link>
                </div>
            </div>
        );
    }

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
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            All Projects
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="pt-24 pb-12">
                <div className="container">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6">
                        <Link href="/projects" className="hover:text-[var(--text-primary)]">
                            Projects
                        </Link>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="text-[var(--text-primary)]">{project.name}</span>
                    </div>

                    {/* Project Header */}
                    <div className="card mb-8">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 rounded-xl bg-[var(--accent-primary)]/10 flex-center text-[var(--accent-primary)]">
                                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold mb-1">{project.name}</h1>
                                    {project.description && (
                                        <p className="text-[var(--text-secondary)] mb-3">{project.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
                                        <span>Created {formatDate(project.createdAt)}</span>
                                        {project.isPublic && (
                                            <span className="badge badge-accent">Public</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleDeleteProject}
                                className="btn btn-ghost text-[var(--error)]"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete Project
                            </button>
                        </div>

                        {/* Stats */}
                        {stats && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[var(--border-primary)]">
                                <div>
                                    <div className="text-2xl font-bold text-[var(--accent-primary)]">
                                        {stats.videoCount}
                                    </div>
                                    <div className="text-sm text-[var(--text-muted)]">Videos</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-[var(--accent-primary)]">
                                        {stats.totalDurationFormatted}
                                    </div>
                                    <div className="text-sm text-[var(--text-muted)]">Total Duration</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-[var(--accent-primary)]">
                                        {stats.totalSizeFormatted}
                                    </div>
                                    <div className="text-sm text-[var(--text-muted)]">Total Size</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-[var(--accent-primary)]">
                                        {formatDate(stats.lastUpdated)}
                                    </div>
                                    <div className="text-sm text-[var(--text-muted)]">Last Updated</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Videos Section */}
                    <div className="mb-6 flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Videos</h2>
                        <Link href="/editor" className="btn btn-primary text-sm">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Upload New Video
                        </Link>
                    </div>

                    {/* Empty Videos State */}
                    {(!project.videos || project.videos.length === 0) && (
                        <div className="card text-center py-12">
                            <div className="w-16 h-16 rounded-full bg-[var(--bg-secondary)] flex-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No videos in this project</h3>
                            <p className="text-[var(--text-secondary)] mb-4">
                                Upload videos and add them to this project
                            </p>
                            <Link href="/editor" className="btn btn-primary">
                                Upload Video
                            </Link>
                        </div>
                    )}

                    {/* Videos List */}
                    {project.videos && project.videos.length > 0 && (
                        <div className="space-y-3">
                            {project.videos.map((video: ProjectVideo) => (
                                <div
                                    key={video.id}
                                    className="card flex items-center gap-4 p-4 hover:border-[var(--accent-primary)]/50"
                                >
                                    {/* Thumbnail */}
                                    <div className="w-24 h-14 rounded-lg bg-[var(--bg-secondary)] flex-center overflow-hidden flex-shrink-0">
                                        {video.thumbnail_url ? (
                                            <img
                                                src={video.thumbnail_url}
                                                alt={video.original_name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                    </div>

                                    {/* Video Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium truncate">{video.original_name}</h4>
                                        <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                                            <span>{formatDuration(video.duration_seconds)}</span>
                                            <span className={`badge ${video.status === 'ready' ? 'badge-success' : ''}`}>
                                                {video.status}
                                            </span>
                                            <span>Added {formatDate(video.addedAt)}</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={`/editor?video=${video.id}`}
                                            className="btn btn-secondary text-sm"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => handleRemoveVideo(video.id, video.original_name)}
                                            className="btn btn-ghost text-[var(--text-muted)] hover:text-[var(--error)]"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
