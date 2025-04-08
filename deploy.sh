#!/bin/bash

# Get Google Cloud credentials
CREDENTIALS=$(cat google-credentials-single-line.json)

# Deploy to Vercel with all required environment variables
npx vercel deploy \
  --env NEXT_PUBLIC_SUPABASE_URL="https://kpcusodyeijpmyikthzs.supabase.co" \
  --env SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwY3Vzb2R5ZWlqcG15aWt0aHpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMTQ4MzU5MiwiZXhwIjoyMDM3MDU5NTkyfQ.DCUtVrr-pSEZMWIa8uHV9jWUIjViNiJn48bMJiYi3ms" \
  --env NEXT_PUBLIC_ELEVENLABS_API_KEY="sk_f63450dbf56dae571e3f72ef7a6020b6812fd0dc35ccbd47" \
  --env GOOGLE_CLOUD_PROJECT_ID="filtareeq-61610" \
  --env GOOGLE_CLOUD_BUCKET_NAME="ftvoicerecords" \
  --env GOOGLE_APPLICATION_CREDENTIALS_JSON="$CREDENTIALS" \
  --force \
  --prod
