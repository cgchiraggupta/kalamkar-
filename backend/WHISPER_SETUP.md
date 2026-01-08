# 🎤 Local Whisper Setup for Kalakar

Your Kalakar platform is now configured to use **local Whisper** instead of the OpenAI API. This is better because:

- ✅ **Free** - No API costs
- ✅ **Private** - Audio never leaves your machine  
- ✅ **Fast** - No network latency
- ✅ **Reliable** - No rate limits

## 🔧 Setup Instructions

### Option 1: If you already have Whisper in a virtual environment

1. **Find your Whisper virtual environment path:**
   ```bash
   # Common locations:
   ~/whisper-venv/
   ~/.whisper-venv/
   ~/venv/
   ~/.venv/
   ```

2. **Test that Whisper works:**
   ```bash
   source ~/whisper-venv/bin/activate  # adjust path
   whisper --help
   python -c "import whisper; print('Whisper ready!')"
   ```

3. **The system will automatically find your venv** - no additional config needed!

### Option 2: Create a new virtual environment

```bash
# Create new venv in your home directory
cd ~
python3 -m venv whisper-venv
source whisper-venv/bin/activate

# Install Whisper
pip install --upgrade pip
pip install openai-whisper

# Test installation
whisper --help
```

### Option 3: Global installation (if you prefer)

```bash
# Install globally (requires admin rights)
pip3 install openai-whisper

# Test
whisper --help
```

## 🧪 Test Your Setup

1. **Start your Kalakar backend** (should already be running):
   ```bash
   cd backend
   npm run dev
   ```

2. **Test the transcription endpoint:**
   ```bash
   curl http://localhost:5001/api/transcription/languages
   ```

3. **Upload a video in the frontend** and try transcription!

## ⚙️ Configuration Options

Edit `backend/.env` to customize:

```bash
# Whisper model size (larger = more accurate, slower)
WHISPER_MODEL=small  # Options: tiny, base, small, medium, large

# Use local Whisper (default: true)
USE_LOCAL_WHISPER=true
```

### Model Size Guide:
- **tiny** - Fastest, least accurate (~39 MB)
- **base** - Good balance (~74 MB) 
- **small** - Recommended default (~244 MB)
- **medium** - Better accuracy (~769 MB)
- **large** - Best accuracy (~1550 MB)

## 🐛 Troubleshooting

### "Whisper not found" error:

1. **Check if Whisper is installed:**
   ```bash
   which whisper
   python3 -c "import whisper"
   ```

2. **If using virtual environment, make sure it's in a common location:**
   - `~/whisper-venv/`
   - `~/.venv/`
   - Or edit `backend/scripts/run_whisper.sh` to add your custom path

3. **Check the backend logs** for detailed error messages

### Performance tips:

- Use `small` model for development (fast)
- Use `medium` or `large` for production (better accuracy)
- Ensure you have enough RAM (large models need ~2GB)

## 🎯 What's Next?

Once Whisper is working:

1. ✅ Upload videos and test transcription
2. ✅ Customize caption styles and templates  
3. ✅ Export videos with burned-in captions
4. 🔄 Add database for saving projects (optional)
5. 🔄 Add user authentication (optional)
6. 🔄 Deploy to production (optional)

Your platform is production-ready for local use! 🚀