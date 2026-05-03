#!/bin/bash
INPUT=$1
OUTPUT=$2
ffmpeg -y -i "$INPUT" \
  -t 8 \
  -vf "scale=1280:-2" \
  -c:v libx264 \
  -crf 28 \
  -preset slow \
  -movflags +faststart \
  -an \
  "$OUTPUT"
