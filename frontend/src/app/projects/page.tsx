'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    getProjects,
    createProject,
    updateProject,
    deleteProject,
    Project
} from '@/lib/api';

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '', isPublic: false });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadProjects();
    }, []);

    async function loadProjects() {
        setLoading(true);
        try {
            const response = await getProjects({ includeVideos: true });
            if (response.success && response.data) {
                setProjects(response.data.projects);
            }
        } catch (err) {
            console.error('Failed to load projects:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!formData.name.trim()) {
            setError('Project name is required');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            if (editingProject) {
                const response = await updateProject(editingProject.id, formData);
                if (response.success) {
                    loadProjects();
                    closeModal();
                } else {
                    setError(response.message || 'Failed to update project');
                }
            } else {
                const response = await createProject(formData.name, formData.description, formData.isPublic);
                if (response.success) {
                    loadProjects();
                    closeModal();
                } else {
                    setError(response.message || 'Failed to create project');
                }
            }
        } catch (err) {
            setError('An error occurred');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(project: Project) {
        if (!confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await deleteProject(project.id);
            if (response.success) {
                loadProjects();
            }
        } catch (err) {
            console.error('Failed to delete project:', err);
        }
    }

    function openCreateModal() {
        setFormData({ name: '', description: '', isPublic: false });
        setEditingProject(null);
        setError(null);
        setShowCreateModal(true);
    }

    function openEditModal(project: Project) {
        setFormData({
            name: project.name,
            description: project.description || '',
            isPublic: project.isPublic
        });
        setEditingProject(project);
        setError(null);
        setShowCreateModal(true);
    }

    function closeModal() {
        setShowCreateModal(false);
        setEditingProject(null);
        setFormData({ name: '', description: '', isPublic: false });
        setError(null);
    }

    function formatDate(dateString: string) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
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
                        <Link href="/editor" className="btn btn-ghost text-sm">
                            Editor
                        </Link>
                        <Link href="/pricing" className="btn btn-ghost text-sm">
                            Pricing
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
                            <h1 className="text-3xl font-bold mb-2">My Projects</h1>
                            <p className="text-[var(--text-secondary)]">
                                Organize your videos into projects for easy management
                            </p>
                        </div>
                        <button onClick={openCreateModal} className="btn btn-primary">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New Project
                        </button>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="flex items-center justify-center py-20">
                            <div className="spinner" />
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && projects.length === 0 && (
                        <div className="card text-center py-16 max-w-lg mx-auto">
                            <div className="w-16 h-16 rounded-full bg-[var(--bg-secondary)] flex-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
                            <p className="text-[var(--text-secondary)] mb-6">
                                Create your first project to start organizing your videos
                            </p>
                            <button onClick={openCreateModal} className="btn btn-primary">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Create Project
                            </button>
                        </div>
                    )}

                    {/* Projects Grid */}
                    {!loading && projects.length > 0 && (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {projects.map((project) => (
                                <div key={project.id} className="card group hover:border-[var(--accent-primary)]/50">
                                    {/* Project Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-[var(--accent-primary)]/10 flex-center text-[var(--accent-primary)]">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">{project.name}</h3>
                                                <p className="text-xs text-[var(--text-muted)]">
                                                    {project.stats?.videoCount || project.videoCount || 0} videos
                                                </p>
                                            </div>
                                        </div>

                                        {/* Actions Dropdown */}
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEditModal(project)}
                                                className="btn btn-ghost btn-icon text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(project)}
                                                className="btn btn-ghost btn-icon text-[var(--text-muted)] hover:text-[var(--error)]"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {project.description && (
                                        <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2">
                                            {project.description}
                                        </p>
                                    )}

                                    {/* Stats */}
                                    <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mb-4">
                                        <span className="flex items-center gap-1">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {project.stats?.totalDurationFormatted || '0:00'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
                                            </svg>
                                            {project.stats?.totalSizeFormatted || '0 Bytes'}
                                        </span>
                                        {project.isPublic && (
                                            <span className="badge badge-accent">Public</span>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between pt-4 border-t border-[var(--border-primary)]">
                                        <span className="text-xs text-[var(--text-muted)]">
                                            Created {formatDate(project.createdAt)}
                                        </span>
                                        <Link
                                            href={`/projects/${project.id}`}
                                            className="btn btn-ghost text-xs py-1 px-3"
                                        >
                                            View Details
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={closeModal}
                    />

                    {/* Modal */}
                    <div className="relative w-full max-w-md card animate-slideUp">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold">
                                {editingProject ? 'Edit Project' : 'Create New Project'}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="btn btn-ghost btn-icon"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {error && (
                                <div className="mb-4 p-3 rounded-lg bg-[var(--error-bg)] text-[var(--error)] text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Project Name <span className="text-[var(--error)]">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="My Awesome Project"
                                        className="input"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Brief description of your project..."
                                        rows={3}
                                        className="input resize-none"
                                    />
                                </div>

                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="isPublic"
                                        checked={formData.isPublic}
                                        onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                                        className="checkbox"
                                    />
                                    <label htmlFor="isPublic" className="text-sm">
                                        Make this project public
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="btn btn-secondary flex-1"
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary flex-1"
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <>
                                            <div className="spinner w-4 h-4" />
                                            {editingProject ? 'Saving...' : 'Creating...'}
                                        </>
                                    ) : (
                                        editingProject ? 'Save Changes' : 'Create Project'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
