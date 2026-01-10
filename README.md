# Kalakar - AI Video Caption Platform

AI-powered video caption platform for Indian content creators. Automatically add accurate captions to videos using local OpenAI Whisper, supporting 15+ languages with focus on Hindi, Tamil, Telugu, and more.

## Features

- **AI Transcription** - 95% accuracy using local Whisper with word-level timestamps
- **50+ Templates** - MrBeast, Alex Hormozi, and custom creator styles
- **15+ Languages** - Hindi, Tamil, Telugu, English, and more
- **Real-time Processing** - Minutes, not hours
- **Enterprise Security** - JWT auth, RLS, rate limiting, input validation
- **Credit System** - Pay-per-use with subscription tiers

## Tech Stack

```
Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS 4
Backend: Node.js, Express, ES Modules, JWT Auth, Whisper AI
Database: Supabase PostgreSQL with RLS
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.8+ with Whisper
- FFmpeg
- Supabase account

### 1. Clone & Setup Backend

```bash
git clone https://github.com/your-org/kalakar.git
cd kalakar/backend
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 2. Setup Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit with: NEXT_PUBLIC_API_URL=http://localhost:5001
```

### 3. Install Whisper

```bash
cd ~
python3 -m venv whisper-venv
source whisper-venv/bin/activate
pip install openai-whisper
whisper --help  # verify installation
```

### 4. Run

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

Visit `http://localhost:3000`

---

## Project Structure

```
kalamkar/
├── backend/
│   ├── src/
│   │   ├── config/          # Environment configuration
│   │   ├── database/        # Supabase setup & migrations
│   │   ├── middleware/      # auth, errorHandler, rateLimiter
│   │   ├── models/          # User, Video, TranscriptionJob
│   │   ├── routes/          # auth, videos, transcription, export
│   │   ├── services/        # transcription, upload, videoExport, s3
│   │   └── utils/           # logger
│   ├── scripts/             # run_whisper.sh
│   └── uploads/             # local file storage
│
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js pages (editor, landing)
│   │   ├── components/      # VideoPlayer, CaptionEditor, Timeline, etc.
│   │   └── lib/             # API client
│   └── public/
```

---

## API Reference

**Base URL**: `http://localhost:5001`

All authenticated endpoints require: `Authorization: Bearer <token>`

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh token |
| GET | `/api/auth/me` | Get profile (auth) |
| PUT | `/api/auth/profile` | Update profile (auth) |

### Videos

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/videos/upload` | Upload video (auth) |
| GET | `/api/videos` | List videos (auth) |
| GET | `/api/videos/:id` | Get video (auth) |
| DELETE | `/api/videos/:id` | Delete video (auth) |

### Transcription

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transcription/languages` | Supported languages |
| POST | `/api/transcription/start` | Start async job (auth) |
| GET | `/api/transcription/status/:jobId` | Job status (auth) |
| POST | `/api/transcription/sync` | Sync transcription (auth) |
| POST | `/api/transcription/export` | Export SRT/VTT |

### Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/export/video` | Export with captions (auth) |
| GET | `/api/export/status/:exportId` | Export status (auth) |
| DELETE | `/api/export/:exportId` | Delete export (auth) |

### Supported Languages

| Code | Language | Code | Language |
|------|----------|------|----------|
| auto | Auto-detect | hi | Hindi |
| ta | Tamil | te | Telugu |
| kn | Kannada | ml | Malayalam |
| mr | Marathi | gu | Gujarati |
| pa | Punjabi | bn | Bengali |
| en | English | es | Spanish |
| fr | French | de | German |

---

## Configuration

### Backend (.env)

```bash
NODE_ENV=development
PORT=5001
FRONTEND_URL=http://localhost:3000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Whisper
USE_LOCAL_WHISPER=true
WHISPER_MODEL=small  # tiny|base|small|medium|large

# Upload
MAX_FILE_SIZE_MB=500
UPLOAD_DIR=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# AWS S3 (Production)
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=your-bucket
AWS_REGION=ap-south-1
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_APP_NAME=Kalakar
```

---

## Whisper Setup

### Model Sizes

| Model | Size | Accuracy | Speed | VRAM |
|-------|------|----------|-------|------|
| tiny | 39M | Low | Fast | ~1GB |
| base | 74M | Good | Fast | ~1GB |
| small | 244M | Better | Medium | ~2GB |
| medium | 769M | High | Slow | ~5GB |
| large | 1550M | Highest | Slowest | ~10GB |

**Recommended**: `small` for best balance of accuracy and speed.

### Troubleshooting

```bash
# Check installation
which whisper
python3 -c "import whisper"

# Test endpoint
curl http://localhost:5001/api/transcription/languages
```

---

## Database Schema

### Core Tables

```sql
users              -- User accounts and subscriptions
videos             -- Video files and metadata
transcription_jobs -- AI processing tasks
captions           -- Generated captions with timing
words              -- Word-level timestamps
export_jobs        -- Video export tasks
projects           -- User project organization
usage_analytics    -- Detailed usage tracking
```

### Security

- Row Level Security (RLS) on all tables
- JWT authentication with refresh tokens
- Rate limiting (global, per-user, per-endpoint)
- Input validation with Joi
- bcrypt password hashing

---

## Deployment

### Backend (Railway)

```bash
npm install -g @railway/cli
railway login
railway init
railway up
# Set env vars in Railway dashboard
```

### Frontend (Vercel)

```bash
npm i -g vercel
cd frontend
vercel --prod
# Set NEXT_PUBLIC_API_URL in Vercel dashboard
```

### Production Checklist

- [ ] Supabase production project
- [ ] AWS S3 bucket configured
- [ ] SSL certificates
- [ ] RLS policies tested
- [ ] Rate limiting configured
- [ ] Strong JWT secrets

---

## Subscription Tiers

| Tier | Credits | Max File | Features |
|------|---------|----------|----------|
| free | 600 (10 min) | 100MB | Basic templates, watermark |
| creator | 18,000 (5 hrs) | 500MB | All templates, no watermark |
| business | 72,000 (20 hrs) | 2GB | Team, API, custom branding |

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Global | 100 req | 15 min |
| Auth | 5 req | 1 min |
| Upload | 10 req | 1 hour |
| Transcription | 5 req | 15 min |

---

## License

MIT License

---

**Made in India for Indian creators worldwide**
