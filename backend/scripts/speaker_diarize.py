#!/usr/bin/env python3
"""
Kalakar - Speaker Diarization Script

Uses pyannote-audio for speaker diarization when available.
Falls back to simple speaker detection if not installed.

Requirements:
    pip install pyannote.audio torch

Note: You need a HuggingFace token with access to pyannote models.
    Set HUGGINGFACE_TOKEN environment variable or pass via --token
"""

import sys
import json
import os
import argparse

def simple_diarization(audio_path):
    """
    Simple placeholder diarization when pyannote is not available.
    Returns single speaker result.
    """
    return {
        "success": True,
        "method": "fallback",
        "speaker_count": 1,
        "segments": [],
        "speakers": [{"id": 1, "name": "Speaker 1", "total_duration": 0}]
    }

def pyannote_diarization(audio_path, hf_token=None):
    """
    Full speaker diarization using pyannote-audio.
    """
    try:
        from pyannote.audio import Pipeline
        import torch
    except ImportError:
        return {
            "success": False,
            "error": "pyannote.audio not installed. Run: pip install pyannote.audio torch"
        }

    # Get HuggingFace token
    token = hf_token or os.environ.get("HUGGINGFACE_TOKEN") or os.environ.get("HF_TOKEN")

    if not token:
        return {
            "success": False,
            "error": "HuggingFace token required. Set HUGGINGFACE_TOKEN environment variable."
        }

    try:
        # Load the diarization pipeline
        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=token
        )

        # Use GPU if available
        if torch.cuda.is_available():
            pipeline.to(torch.device("cuda"))

        # Run diarization
        diarization = pipeline(audio_path)

        # Process results
        segments = []
        speaker_times = {}
        speaker_mapping = {}
        speaker_counter = 1

        for turn, _, speaker in diarization.itertracks(yield_label=True):
            # Map speaker labels to numbers
            if speaker not in speaker_mapping:
                speaker_mapping[speaker] = speaker_counter
                speaker_counter += 1

            speaker_id = speaker_mapping[speaker]
            speaker_name = f"Speaker {speaker_id}"

            # Track speaker duration
            if speaker_id not in speaker_times:
                speaker_times[speaker_id] = 0
            speaker_times[speaker_id] += turn.end - turn.start

            segments.append({
                "start": round(turn.start, 3),
                "end": round(turn.end, 3),
                "speaker": speaker_name,
                "speakerId": speaker_id
            })

        # Build speakers list
        speakers = [
            {
                "id": speaker_id,
                "name": f"Speaker {speaker_id}",
                "total_duration": round(duration, 2)
            }
            for speaker_id, duration in sorted(speaker_times.items())
        ]

        return {
            "success": True,
            "method": "pyannote",
            "speaker_count": len(speakers),
            "segments": segments,
            "speakers": speakers
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def main():
    parser = argparse.ArgumentParser(description="Speaker diarization for audio files")
    parser.add_argument("audio_path", help="Path to audio file")
    parser.add_argument("--token", help="HuggingFace token for pyannote models")
    parser.add_argument("--simple", action="store_true", help="Use simple fallback method")

    args = parser.parse_args()

    if not os.path.exists(args.audio_path):
        result = {"success": False, "error": f"Audio file not found: {args.audio_path}"}
        print(json.dumps(result))
        sys.exit(1)

    if args.simple:
        result = simple_diarization(args.audio_path)
    else:
        result = pyannote_diarization(args.audio_path, args.token)

    print(json.dumps(result))
    sys.exit(0 if result.get("success") else 1)


if __name__ == "__main__":
    main()
