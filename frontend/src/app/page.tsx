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
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: 'AI-Powered Transcription',
      description: '95% accuracy for Hindi, Tamil, Telugu, and 15+ languages. Word-level timing included.',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
      title: 'Beautiful Templates',
      description: 'MrBeast style, Alex Hormozi, and 50+ creator templates. One-click styling.',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
      title: 'Multiple Exports',
      description: 'MP4 with burned captions, SRT files, or alpha channel for compositing.',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: 'Lightning Fast',
      description: 'Process videos in minutes, not hours. GPU-accelerated cloud processing.',
    },
  ];

  const stats = [
    { value: '50K+', label: 'Videos Captioned' },
    { value: '15+', label: 'Languages Supported' },
    { value: '95%', label: 'Accuracy Rate' },
    { value: '40%', label: 'Avg. Watch Time Increase' },
  ];

  const languages = [
    { name: 'Hindi', flag: '🇮🇳' },
    { name: 'Tamil', flag: '🇮🇳' },
    { name: 'Telugu', flag: '🇮🇳' },
    { name: 'English', flag: '🇬🇧' },
    { name: 'Kannada', flag: '🇮🇳' },
    { name: 'Malayalam', flag: '🇮🇳' },
    { name: 'Bengali', flag: '🇮🇳' },
    { name: 'Marathi', flag: '🇮🇳' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="absolute top-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-[var(--border-primary)] to-transparent" />
        </div>

        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center mb-16">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-primary)] text-sm mb-8 animate-slideUp">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[var(--text-secondary)]">Trusted by 10,000+ Indian creators</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight animate-slideUp" style={{ animationDelay: '0.1s' }}>
              Add <span className="gradient-text">Stunning Captions</span>
              <br />
              to Your Videos in Seconds
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 animate-slideUp" style={{ animationDelay: '0.2s' }}>
              AI-powered transcription that understands Hindi, Tamil, Telugu, and 15+ Indian languages.
              Perfect accuracy. Beautiful styles. Export in one click.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap justify-center gap-4 animate-slideUp" style={{ animationDelay: '0.3s' }}>
              <Link href="/editor" className="btn btn-primary text-lg px-8 py-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Start Creating Free
              </Link>
              <button className="btn btn-secondary text-lg px-8 py-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Watch Demo
              </button>
            </div>
          </div>

          {/* Upload Area or Video Preview */}
          <div className="max-w-4xl mx-auto animate-slideUp" style={{ animationDelay: '0.4s' }}>
            {uploadedVideo ? (
              <div className="space-y-4">
                <VideoPlayer src={uploadedVideo.url} />
                <div className="flex justify-center gap-4">
                  <Link href={`/editor?video=${uploadedVideo.id}`} className="btn btn-primary">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      {/* Stats Section */}
      <section className="py-16 border-y border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold gradient-text mb-2">
                  {stat.value}
                </div>
                <div className="text-[var(--text-secondary)] text-sm">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Languages Section */}
      <section className="py-16">
        <div className="container">
          <h2 className="text-2xl font-bold text-center mb-8">
            Fluent in Your Language
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {languages.map((lang, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-primary)] hover:border-[var(--accent-primary)] transition-colors"
              >
                <span className="text-lg">{lang.flag}</span>
                <span className="text-sm font-medium">{lang.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-[var(--bg-secondary)]">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need for <span className="gradient-text">Perfect Captions</span>
            </h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
              From AI transcription to beautiful styling, Kalakar has all the tools to make your videos engaging and accessible.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="card hover:border-[var(--accent-primary)] group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex-center mb-4 group-hover:scale-110 transition-transform">
                  <div className="text-[var(--accent-primary)]">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-[var(--text-secondary)] text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10" />
        <div className="container relative text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to Transform Your Videos?
          </h2>
          <p className="text-[var(--text-secondary)] max-w-xl mx-auto mb-8">
            Join thousands of creators who are boosting engagement with AI-powered captions.
          </p>
          <Link href="/editor" className="btn btn-primary text-lg px-10 py-4">
            Get Started for Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-[var(--border-primary)]">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="font-semibold">Kalakar</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-[var(--text-secondary)]">
              <Link href="/privacy" className="hover:text-[var(--text-primary)]">Privacy</Link>
              <Link href="/terms" className="hover:text-[var(--text-primary)]">Terms</Link>
              <Link href="/contact" className="hover:text-[var(--text-primary)]">Contact</Link>
            </div>
            <div className="text-sm text-[var(--text-muted)]">
              © 2024 Kalakar. Made with ❤️ in India
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
