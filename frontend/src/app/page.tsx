'use client';

import { useState } from 'react';
import Link from 'next/link';
import VideoUploader from '@/components/VideoUploader';
import VideoPlayer from '@/components/VideoPlayer';

export default function HomePage() {
  const [uploadedVideo, setUploadedVideo] = useState<{ url: string; id: string } | null>(null);

  const handleUploadComplete = (videoUrl: string, videoId: string) => {
    setUploadedVideo({ url: videoUrl, id: videoId });
  };

  const features = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: 'AI Transcription',
      description: '95% accuracy for Hindi, Tamil, Telugu & 15+ languages with word-level timing.',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
      title: '50+ Templates',
      description: 'MrBeast, Hormozi & creator-style templates. One-click professional styling.',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
      title: 'Audio Enhancement',
      description: 'Noise reduction, volume normalization & voice clarity boost built-in.',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
      title: 'Easy Export',
      description: 'MP4 with burned captions, SRT/VTT files, all formats supported.',
    },
  ];

  const languages = [
    { name: 'Hindi', code: 'hi' },
    { name: 'Tamil', code: 'ta' },
    { name: 'Telugu', code: 'te' },
    { name: 'English', code: 'en' },
    { name: 'Kannada', code: 'kn' },
    { name: 'Malayalam', code: 'ml' },
    { name: 'Bengali', code: 'bn' },
    { name: 'Marathi', code: 'mr' },
  ];

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
            <Link href="/dashboard" className="btn btn-ghost text-sm">
              Dashboard
            </Link>
            <Link href="/projects" className="btn btn-ghost text-sm">
              Projects
            </Link>
            <Link href="/pricing" className="btn btn-ghost text-sm">
              Pricing
            </Link>
            <Link href="/editor" className="btn btn-primary text-sm">
              Open Editor
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-[var(--accent-primary)]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-[var(--error)]/5 rounded-full blur-3xl" />
        </div>

        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center mb-12">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 badge badge-accent mb-6 animate-slideUp">
              <span className="w-1.5 h-1.5 bg-[var(--success)] rounded-full animate-pulse" />
              <span>Trusted by 10,000+ Indian creators</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight animate-slideUp" style={{ animationDelay: '0.1s' }}>
              Add <span className="gradient-text">Stunning Captions</span>
              <br />
              to Your Videos
            </h1>

            {/* Subheading */}
            <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-8 animate-slideUp" style={{ animationDelay: '0.2s' }}>
              AI-powered transcription for Hindi, Tamil, Telugu & 15+ languages.
              Beautiful styles. Export in one click.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap justify-center gap-3 animate-slideUp" style={{ animationDelay: '0.3s' }}>
              <Link href="/editor" className="btn btn-primary px-6 py-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Start Creating Free
              </Link>
              <Link href="/pricing" className="btn btn-secondary px-6 py-3">
                View Pricing
              </Link>
            </div>
          </div>

          {/* Upload Area */}
          <div className="max-w-3xl mx-auto animate-slideUp" style={{ animationDelay: '0.4s' }}>
            {uploadedVideo ? (
              <div className="space-y-4">
                <VideoPlayer src={uploadedVideo.url} />
                <div className="flex justify-center gap-3">
                  <Link href={`/editor?video=${uploadedVideo.id}`} className="btn btn-primary">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Open in Editor
                  </Link>
                  <button
                    onClick={() => setUploadedVideo(null)}
                    className="btn btn-secondary"
                  >
                    Upload Another
                  </button>
                </div>
              </div>
            ) : (
              <VideoUploader
                onUploadComplete={handleUploadComplete}
                onError={(error) => console.error(error)}
              />
            )}
          </div>
        </div>
      </section>

      {/* Languages */}
      <section className="py-12 border-y border-[var(--border-primary)]">
        <div className="container">
          <div className="flex flex-wrap justify-center gap-2">
            {languages.map((lang) => (
              <span
                key={lang.code}
                className="px-4 py-2 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-sm text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)] transition-colors cursor-default"
              >
                {lang.name}
              </span>
            ))}
            <span className="px-4 py-2 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-sm text-[var(--text-muted)]">
              +8 more
            </span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">
              Everything You Need for <span className="gradient-text">Perfect Captions</span>
            </h2>
            <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
              From AI transcription to beautiful styling, all the tools to make your videos engaging.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="card group hover:border-[var(--accent-primary)]/50"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--accent-primary)]/10 flex-center mb-4 text-[var(--accent-primary)] group-hover:bg-[var(--accent-primary)] group-hover:text-white transition-colors">
                  {feature.icon}
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-[var(--text-muted)]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-[var(--bg-secondary)]">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto text-center">
            <div>
              <div className="text-3xl font-bold gradient-text mb-1">50K+</div>
              <div className="text-sm text-[var(--text-muted)]">Videos Captioned</div>
            </div>
            <div>
              <div className="text-3xl font-bold gradient-text mb-1">15+</div>
              <div className="text-sm text-[var(--text-muted)]">Languages</div>
            </div>
            <div>
              <div className="text-3xl font-bold gradient-text mb-1">95%</div>
              <div className="text-sm text-[var(--text-muted)]">Accuracy</div>
            </div>
            <div>
              <div className="text-3xl font-bold gradient-text mb-1">40%</div>
              <div className="text-sm text-[var(--text-muted)]">More Engagement</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Videos?</h2>
            <p className="text-[var(--text-secondary)] mb-8">
              Join thousands of creators boosting engagement with AI-powered captions.
            </p>
            <Link href="/editor" className="btn btn-primary px-8 py-3 text-base">
              Get Started Free
            </Link>
            <p className="text-sm text-[var(--text-muted)] mt-4">
              10 minutes free • No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-[var(--border-primary)]">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[var(--accent-primary)] flex-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="font-medium text-sm">Kalakar</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-[var(--text-muted)]">
              <Link href="/pricing" className="hover:text-[var(--text-primary)]">Pricing</Link>
              <span>© 2024 Kalakar. Made in India</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
