#!/usr/bin/env python3
"""
Quick check for pyannote availability.
Returns exit code 0 if pyannote is available, 1 otherwise.
"""

try:
    from pyannote.audio import Pipeline
    print("pyannote available")
    exit(0)
except ImportError:
    print("pyannote not available")
    exit(1)
