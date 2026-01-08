#!/bin/bash

# Test script to check Whisper availability
echo "🔍 Testing Whisper installation..."

# Test 1: Direct whisper command
echo "Test 1: Direct whisper command"
if command -v whisper >/dev/null 2>&1; then
    echo "✅ whisper command found"
    whisper --help | head -3
else
    echo "❌ whisper command not found"
fi

echo ""

# Test 2: Python module
echo "Test 2: Python module import"
if python3 -c "import whisper; print('✅ Whisper Python module available')" 2>/dev/null; then
    echo "✅ Python whisper module works"
else
    echo "❌ Python whisper module not available"
fi

echo ""

# Test 3: Check common virtual environment locations
echo "Test 3: Checking virtual environments"
VENV_PATHS=(
    "$HOME/whisper-venv"
    "$HOME/.whisper-venv" 
    "$HOME/venv"
    "$HOME/.venv"
)

for VENV_PATH in "${VENV_PATHS[@]}"; do
    if [ -f "$VENV_PATH/bin/activate" ]; then
        echo "📁 Found venv: $VENV_PATH"
        
        # Test if whisper is in this venv
        if source "$VENV_PATH/bin/activate" && python3 -c "import whisper" 2>/dev/null; then
            echo "✅ Whisper available in $VENV_PATH"
        else
            echo "❌ Whisper not in $VENV_PATH"
        fi
    fi
done

echo ""
echo "🎯 Recommendations:"
echo "If no Whisper found, install it:"
echo "  Option 1 (Global): pip3 install openai-whisper"
echo "  Option 2 (Virtual env): python3 -m venv ~/whisper-venv && source ~/whisper-venv/bin/activate && pip install openai-whisper"