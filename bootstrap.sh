#!/bin/bash

set -e

echo "=============================================="
echo "Backgrndy Interactive Bootstrap"
echo "=============================================="

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed."
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Error: Node.js 18+ required. Current version: $(node -v)"
    exit 1
fi

echo "Node.js version: $(node -v) ✓"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed."
    exit 1
fi

echo "npm version: $(npm -v) ✓"

# Prompt for credentials
echo ""
echo "Please enter your Supabase credentials:"
echo ""

read -rp "SUPABASE_URL (e.g., https://xxxxx.supabase.co): " SUPABASE_URL
while [ -z "$SUPABASE_URL" ]; do
    read -rp "SUPABASE_URL: " SUPABASE_URL
done

read -rsp "SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY
while [ -z "$SUPABASE_ANON_KEY" ]; do
    read -rsp "SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY
done
echo ""

read -rsp "SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE_ROLE_KEY
while [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; do
    read -rsp "SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE_ROLE_KEY
done
echo ""

read -rsp "GEMINI_API_KEY: " GEMINI_API_KEY
while [ -z "$GEMINI_API_KEY" ]; do
    read -rsp "GEMINI_API_KEY: " GEMINI_API_KEY
done
echo ""

# Write .env.local
echo ""
echo "Writing .env.local..."

cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
AI_PROVIDER=gemini
GEMINI_API_KEY=$GEMINI_API_KEY
EOF

# Install dependencies
echo ""
echo "Installing dependencies..."
yarn install

# Print migrations
echo ""
echo "=============================================="
echo "MIGRATIONS"
echo "=============================================="
echo ""
echo "Go to your Supabase SQL Editor:"
echo "https://supabase.com/dashboard/project/$(echo $SUPABASE_URL | grep -oP '(?<=https://)[^.]+')/sql"
echo ""
echo "Run the following migrations in order:"
echo ""

for file in supabase/migrations/*.sql; do
    echo "--- $file ---"
    cat "$file"
    echo ""
done

echo "=============================================="
echo ""
read -p "Press Enter after running migrations... "

# Verify migrations
echo ""
echo "Verifying migrations..."

curl -s "$SUPABASE_URL/rest/v1/rmc_claims" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -o /dev/null -w "%{http_code}" | grep -q "200" && echo "✓ rmc_claims table exists" || echo "✗ rmc_claims table not found"

# Start dev server
echo ""
echo "Starting development server..."
echo "=============================================="
echo ""
echo "App will be available at: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

yarn dev
