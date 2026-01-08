#!/usr/bin/env python3
"""
Local Whisper Transcription Script for Kalakar
Provides word-level timestamps and segment information
"""

import sys
import json
import argparse
from pathlib import Path

try:
    import whisper
except ImportError:
    print(json.dumps({
        "error": "Whisper not installed. Run: pip install openai-whisper",
        "success": False
    }))
    sys.exit(1)

def transcribe_audio(audio_path, model_name="small", language=None):
    """
    Transcribe audio file using Whisper
    
    Args:
        audio_path (str): Path to audio file
        model_name (str): Whisper model size (tiny, base, small, medium, large)
        language (str): Language code (optional, None for auto-detect)
    
    Returns:
        dict: Transcription result with segments and word timestamps
    """
    try:
        # Load Whisper model (suppress output)
        model = whisper.load_model(model_name)
        
        # Transcribe with word timestamps
        
        # Set up transcription options
        options = {
            "word_timestamps": True,
            "verbose": False
        }
        
        if language and language != "auto":
            options["language"] = language
        
        result = model.transcribe(str(audio_path), **options)
        
        # Format result to match expected structure
        formatted_result = {
            "success": True,
            "text": result["text"],
            "language": result.get("language", "unknown"),
            "segments": [],
            "words": []
        }
        
        # Process segments and extract words
        if "segments" in result:
            for segment in result["segments"]:
                segment_data = {
                    "start": segment["start"],
                    "end": segment["end"],
                    "text": segment["text"]
                }
                formatted_result["segments"].append(segment_data)
                
                # Extract word-level timestamps
                if "words" in segment:
                    for word in segment["words"]:
                        word_data = {
                            "word": word["word"],
                            "start": word["start"],
                            "end": word["end"]
                        }
                        formatted_result["words"].append(word_data)
        
        return formatted_result
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def main():
    parser = argparse.ArgumentParser(description="Transcribe audio using local Whisper")
    parser.add_argument("audio_path", help="Path to audio file")
    parser.add_argument("--model", default="small", 
                       choices=["tiny", "base", "small", "medium", "large"],
                       help="Whisper model size")
    parser.add_argument("--language", help="Language code (optional)")
    
    args = parser.parse_args()
    
    # Check if audio file exists
    audio_path = Path(args.audio_path)
    if not audio_path.exists():
        result = {
            "success": False,
            "error": f"Audio file not found: {audio_path}"
        }
        print(json.dumps(result))
        sys.exit(1)
    
    # Transcribe
    result = transcribe_audio(args.audio_path, args.model, args.language)
    
    # Output JSON result
    print(json.dumps(result, indent=2))
    
    # Exit with error code if transcription failed
    if not result.get("success", False):
        sys.exit(1)

if __name__ == "__main__":
    main()