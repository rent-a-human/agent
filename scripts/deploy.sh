#!/bin/bash
set -e

# Configuration
REPO_URL="https://github.com/rent-a-human/agent.git"

echo "🚀 Starting Force-Push Deploy for Jarvis Dashboard..."

# 1. Build the project
# We explicitly inject the production API URL during build
echo "📦 Building project with Production API..."
VITE_API_URL=https://api-llm-production.up.railway.app npm run build

# 2. Manual Force-Push Strategy
# This ensures we don't rely on gh-pages utility internal logic/caching
echo "📦 Preparing clean gh-pages artifacts..."
rm -rf temp_gh_pages
mkdir temp_gh_pages

# Copy build artifacts to temp directory
cp -r dist/* temp_gh_pages/

# Fix SPA routing on GitHub Pages by copying index.html to 404.html
cp temp_gh_pages/index.html temp_gh_pages/404.html

cd temp_gh_pages

# Initialize a clean git repo for the push
git init
git remote add origin "$REPO_URL"

# We create the branch locally
git checkout -b gh-pages

# Add all artifacts
git add .
git commit -m "deploy: force update from local build $(date)"

echo "📤 Force-pushing to GitHub (gh-pages branch)..."
# This is the "agent-neo style" force push
git push -f origin gh-pages

# Clean up
cd ..
rm -rf temp_gh_pages

echo "✅ Deployment complete! Production should update in 1-2 minutes."
