#!/usr/bin/env bash
# Upload all PDF files from a directory to the local API endpoint using curl.
# Usage: ./scripts/upload-notes-curl.sh [DIRECTORY] [URL]
# DIRECTORY defaults to ./public
# URL defaults to http://localhost:3000/api/notes/upload

set -euo pipefail

DIR=${1:-./public}
URL=${2:-http://localhost:3000/api/notes/upload}

if [ ! -d "$DIR" ]; then
  echo "Directory $DIR does not exist"
  exit 1
fi

shopt -s nullglob
FILES=("$DIR"/*.pdf "$DIR"/*.PDF)

if [ ${#FILES[@]} -eq 0 ]; then
  echo "No PDF files found in $DIR"
  exit 0
fi

echo "Uploading ${#FILES[@]} files from $DIR to $URL"

for f in "${FILES[@]}"; do
  base=$(basename "$f")
  title="${base%.*}"
  echo "Uploading $base (title: $title) ..."

  # Send file and title. Prints HTTP status and JSON response.
  http_code=$(curl -s -w "%{http_code}" -o /tmp/upload_resp.json \
    -X POST "$URL" \
    -F "file=@${f}" \
    -F "title=${title}")

  echo "HTTP $http_code"
  cat /tmp/upload_resp.json
  echo "\n---\n"

  # small pause to avoid overwhelming server
  sleep 0.3
done

rm -f /tmp/upload_resp.json

echo "Done."
