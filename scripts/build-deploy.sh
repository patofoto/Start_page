#!/bin/bash
# Build & deploy script for Cloudflare Git integration.
# Handles KV namespace creation and wrangler.toml configuration automatically.

# Check if wrangler.toml has a real KV ID or the placeholder
KV_ID=$(grep 'id = ' wrangler.toml | head -1 | sed 's/.*id = "\(.*\)"/\1/')

if [ "$KV_ID" = "YOUR_KV_NAMESPACE_ID" ] || [ -z "$KV_ID" ]; then
  echo "Looking for existing KV namespace..."

  # Try to find an existing namespace named start-page or START_PAGE_DATA
  EXISTING=$(npx wrangler kv namespace list 2>/dev/null | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')

  if [ -n "$EXISTING" ]; then
    echo "Found existing KV namespace: $EXISTING"
    NEW_ID="$EXISTING"
  else
    echo "Creating KV namespace..."
    OUTPUT=$(npx wrangler kv namespace create START_PAGE_DATA 2>&1)
    echo "$OUTPUT"
    NEW_ID=$(echo "$OUTPUT" | grep -o 'id = "[^"]*"' | head -1 | sed 's/id = "\(.*\)"/\1/')
  fi

  if [ -n "$NEW_ID" ]; then
    echo "Using KV namespace: $NEW_ID"
    sed -i "s/YOUR_KV_NAMESPACE_ID/$NEW_ID/" wrangler.toml
  else
    echo "ERROR: Could not find or create KV namespace."
    echo "Create one manually: npx wrangler kv namespace create START_PAGE_DATA"
    exit 1
  fi
fi

npx wrangler deploy
