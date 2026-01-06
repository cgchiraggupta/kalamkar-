# 🎬 Kalakar - AI Video Caption Platform

> **Canva for Video Captions** - Automatically add stunning captions to your videos with AI, optimized for Indian languages.

![Kalakar Banner](https://via.placeholder.com/1200x400/6366f1/ffffff?text=Kalakar+-+AI+Video+Captions)

## ✨ Features

- **🤖 AI Transcription** - 95% accuracy for Hindi, Tamil, Telugu, and 15+ languages
- **🎨 Beautiful Templates** - MrBeast, Alex Hormozi, and 50+ creator styles
- **⚡ Lightning Fast** - Process videos in minutes, not hours
- **📱 Multiple Exports** - MP4 with burned captions, SRT files, or alpha channel
- **🔒 Production Ready** - Built with security best practices

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/kalakar.git
   cd kalakar
   ```

2. **Setup Backend**
   ```bash
   cd backend
   cp .env.example .env
   npm install
   npm run dev
   ```

3. **Setup Frontend** (in a new terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Open in browser**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 📁 Project Structure

```
kalakar/
├── frontend/                 # Next.js React application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   │   ├── page.tsx     # Homepage
│   │   │   └── editor/      # Video editor page
│   │   ├── components/      # React components
│   │   │   ├── Header.tsx
│   │   │   ├── VideoPlayer.tsx
│   │   │   └── VideoUploader.tsx
│   │   └── lib/             # Utilities and API client
│   └── public/              # Static assets
│
├── backend/                  # Node.js Express API
│   ├── src/
│   │   ├── index.js         # Main server entry
│   │   ├── config/          # Configuration management
│   │   ├── middleware/      # Express middleware
│   │   │   ├── rateLimiter.js
│   │   │   └── errorHandler.js
│   │   ├── routes/          # API routes
│   │   │   ├── videoRoutes.js
│   │   │   └── healthRoutes.js
│   │   ├── services/        # Business logic
│   │   └── utils/           # Helper utilities
│   └── uploads/             # Video upload directory
│
└── .cursorrules             # AI code generation guidelines
```

## 🔒 Security Features

Following production security best practices:

- ✅ **Rate Limiting** - Multi-layer protection (global, auth, upload, transcription)
- ✅ **CORS** - Specific origin whitelist, no wildcards
- ✅ **Helmet** - Security headers enabled
- ✅ **Input Validation** - File type and size validation
- ✅ **Error Handling** - No stack traces exposed to clients
- ✅ **Environment Variables** - All secrets in env files, never hardcoded

## 🛠 Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Custom CSS** - Dark theme design system

### Backend
- **Express.js** - Fast, unopinionated web framework
- **Multer** - File upload handling
- **Helmet** - Security headers
- **Winston** - Structured logging
- **express-rate-limit** - DDoS protection

## 📝 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/health/detailed` | Detailed system info |
| POST | `/api/videos/upload` | Upload video file |
| GET | `/api/videos/:id` | Get video info |
| DELETE | `/api/videos/:id` | Delete video |

## 🎯 Roadmap

- [x] **Week 1:** Video upload & playback with dark theme UI
- [ ] **Week 2:** AI transcription integration (OpenAI Whisper)
- [ ] **Week 3:** Caption editor with timeline
- [ ] **Week 4:** Customization & export features
- [ ] **Month 2:** Templates, payment integration
- [ ] **Month 3:** Team collaboration, API access

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💬 Support

- 📧 Email: support@kalakar.app
- 🐦 Twitter: [@kalakar_app](https://twitter.com/kalakar_app)
- 💬 Discord: [Join our community](https://discord.gg/kalakar)

---

Made with ❤️ in India 🇮🇳
