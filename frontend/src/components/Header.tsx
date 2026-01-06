'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Header() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <header className="fixed top-0 left-0 right-0 z-50 glass-strong">
            <div className="container h-16 flex-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex-center shadow-lg group-hover:scale-105 transition-transform">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold gradient-text">Kalakar</span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-8">
                    <Link href="/" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm font-medium">
                        Home
                    </Link>
                    <Link href="/editor" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm font-medium">
                        Editor
                    </Link>
                    <Link href="/templates" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm font-medium">
                        Templates
                    </Link>
                    <Link href="/pricing" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm font-medium">
                        Pricing
                    </Link>
                </nav>

                {/* CTA Buttons */}
                <div className="hidden md:flex items-center gap-3">
                    <button className="btn btn-ghost text-sm">
                        Log In
                    </button>
                    <button className="btn btn-primary text-sm">
                        Get Started Free
                    </button>
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden w-10 h-10 flex-center text-[var(--text-secondary)]"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-16 left-0 right-0 glass-strong border-t border-[var(--border-primary)] animate-slideUp">
                    <nav className="container py-4 flex flex-col gap-2">
                        <Link href="/" className="px-4 py-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors">
                            Home
                        </Link>
                        <Link href="/editor" className="px-4 py-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors">
                            Editor
                        </Link>
                        <Link href="/templates" className="px-4 py-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors">
                            Templates
                        </Link>
                        <Link href="/pricing" className="px-4 py-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors">
                            Pricing
                        </Link>
                        <div className="pt-4 flex flex-col gap-2 border-t border-[var(--border-primary)] mt-2">
                            <button className="btn btn-secondary w-full">Log In</button>
                            <button className="btn btn-primary w-full">Get Started Free</button>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
}
