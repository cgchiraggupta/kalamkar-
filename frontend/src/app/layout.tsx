import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Kalakar - AI Video Caption Platform",
  description: "Automatically add stunning captions to your videos with AI. Perfect for Hindi, Tamil, Telugu, and 15+ Indian languages. Used by top YouTube creators.",
  keywords: ["video captions", "subtitles", "AI transcription", "Hindi captions", "Tamil subtitles", "YouTube", "video editor"],
  authors: [{ name: "Kalakar Team" }],
  openGraph: {
    title: "Kalakar - AI Video Caption Platform",
    description: "Add beautiful captions to your videos in seconds with AI",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased`}>
        <Header />
        <main className="min-h-screen pt-16">
          {children}
        </main>
      </body>
    </html>
  );
}
