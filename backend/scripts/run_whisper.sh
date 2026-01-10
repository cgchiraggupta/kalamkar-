#!/bin/bash

# Kalakar Whisper Runner Script
# This script tries to find and activate your Whisper virtual environment

set -e

AUDIO_PATH="$1"
MODEL="${2:-small}"
LANGUAGE="$3"

# Handle help flag
if [ "$AUDIO_PATH" = "--help" ] || [ "$AUDIO_PATH" = "-h" ]; then
    echo "Usage: $0 <audio_path> [model] [language]"
    echo "  audio_path: Path to audio file"
    echo "  model: Whisper model (tiny, base, small, medium, large) - default: small"
    echo "  language: Language code (optional, auto-detect if not specified)"
    exit 0
fi

if [ -z "$AUDIO_PATH" ]; then
    echo '{"success": false, "error": "Audio path is required"}'
    exit 1
fi

if [ ! -f "$AUDIO_PATH" ]; then
    echo '{"success": false, "error": "Audio file not found: '$AUDIO_PATH'"}'
    exit 1
fi

# Add pipx path to PATH
export PATH="$HOME/.local/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_SCRIPT="$SCRIPT_DIR/whisper_transcribe.py"

# Method 0: Try pipx-installed whisper directly with our Python script
if command -v whisper &> /dev/null; then
    # Use Python from pipx whisper environment
    WHISPER_VENV="$HOME/.local/share/pipx/venvs/openai-whisper"
    if [ -f "$WHISPER_VENV/bin/python" ]; then
        if "$WHISPER_VENV/bin/python" "$PYTHON_SCRIPT" "$AUDIO_PATH" --model "$MODEL" ${LANGUAGE:+--language "$LANGUAGE"} 2>/dev/null; then
            exit 0
        fi
    fi
fi

# Method 1: Try common virtual environment locations
VENV_PATHS=(
    "$HOME/whisper-venv"
    "$HOME/.whisper-venv"
    "$HOME/venv"
    "$HOME/.venv"
    "$(dirname "$SCRIPT_DIR")/whisper-venv"
    "$(dirname "$SCRIPT_DIR")/.venv"
)

for VENV_PATH in "${VENV_PATHS[@]}"; do
    if [ -f "$VENV_PATH/bin/activate" ]; then
        # Activate venv and run Python script, suppress stderr
        if (source "$VENV_PATH/bin/activate" && python3 "$PYTHON_SCRIPT" "$AUDIO_PATH" --model "$MODEL" ${LANGUAGE:+--language "$LANGUAGE"}) 2>/dev/null; then
            exit 0
        fi
    fi
done

# Method 2: Try python -m whisper with JSON output only
for PYTHON_CMD in python3 python; do
    if $PYTHON_CMD -c "import whisper" 2>/dev/null; then
        # Use our Python script which outputs clean JSON
        if $PYTHON_CMD "$PYTHON_SCRIPT" "$AUDIO_PATH" --model "$MODEL" ${LANGUAGE:+--language "$LANGUAGE"} 2>/dev/null; then
            exit 0
        fi
    fi
done

# If all methods fail
echo '{"success": false, "error": "Whisper not found. Please ensure Whisper is installed. Try: pipx install openai-whisper"}'
exit 1