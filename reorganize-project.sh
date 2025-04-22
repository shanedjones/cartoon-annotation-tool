#!/bin/bash

# Create reorganization script
echo "Starting project reorganization..."

# 1. Move all app content to src/app
mkdir -p src/app

# Move app/* to src/app/
echo "Moving app/ content to src/app/..."
cp -r app/* src/app/
cp app/favicon.ico src/app/

# 2. Create proper folder structure
echo "Creating domain-based folder structure..."

# Create necessary directories if they don't exist
mkdir -p src/components
mkdir -p src/contexts/factory
mkdir -p src/utils
mkdir -p src/lib
mkdir -p src/types
mkdir -p src/api
mkdir -p src/middleware
mkdir -p src/hooks
mkdir -p src/styles

# Move API routes to src/api if not already there
if [ -d "src/app/api" ]; then
  echo "Moving API routes from src/app/api to src/api..."
  cp -r src/app/api/* src/api/
fi

# 3. Copy global styles to src/styles
if [ -f "src/app/globals.css" ]; then
  echo "Moving global styles to src/styles..."
  cp src/app/globals.css src/styles/
fi

echo "Reorganization structure created successfully!"
echo ""
echo "IMPORTANT: This script has only copied files to the new structure."
echo "Review the new structure in src/ and then:"
echo "1. Update import paths in code files"
echo "2. Update Next.js configuration to use the new structure"
echo "3. After verification, remove the old app/ directory"