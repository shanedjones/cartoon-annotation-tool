#!/bin/bash

# Define output file
OUTPUT_FILE="cartoon-annotation-code-export.txt"

# Start with a clean output file
echo "# Cartoon Annotation Tool - Complete Source Code Export" > $OUTPUT_FILE
echo "# Generated on $(date)" >> $OUTPUT_FILE
echo "# This file contains all source code from the project" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

# Based on .gitignore patterns, here are the exclusions:
# - /node_modules
# - /.next
# - /out
# - /build
# - /coverage
# - .DS_Store
# - *.pem
# - npm-debug.log*
# - yarn-debug.log*
# - yarn-error.log*
# - .pnpm-debug.log*
# - .env*
# - .vercel
# - *.tsbuildinfo
# - next-env.d.ts

# Find all files except those excluded by the patterns
FILES=$(find . -type f -not -path "*/node_modules/*" \
                     -not -path "*/.next/*" \
                     -not -path "*/out/*" \
                     -not -path "*/build/*" \
                     -not -path "*/coverage/*" \
                     -not -path "*/.vercel/*" \
                     -not -path "*/.git/*" \
                     -not -path "*/.DS_Store" \
                     -not -name "*.pem" \
                     -not -name "npm-debug.log*" \
                     -not -name "yarn-debug.log*" \
                     -not -name "yarn-error.log*" \
                     -not -name ".pnpm-debug.log*" \
                     -not -name ".env*" \
                     -not -name "*.tsbuildinfo" \
                     -not -name "next-env.d.ts" \
                     -not -name "$OUTPUT_FILE" \
                     -not -name "export-code.sh")

# Count total files for progress tracking
TOTAL_FILES=$(echo "$FILES" | wc -l)
CURRENT=0

# Process each file
echo "$FILES" | while read -r file; do
  # Skip binary files
  if [[ "$file" == *".png" || "$file" == *".jpg" || "$file" == *".jpeg" || 
        "$file" == *".gif" || "$file" == *".ico" || "$file" == *".woff" || 
        "$file" == *".woff2" || "$file" == *".ttf" || "$file" == *".eot" || 
        "$file" == *".otf" || "$file" == *".svg" || "$file" == *".pdf" || 
        "$file" == *".lock" || "$file" == *".node" || "$file" == *".map" ]]; then
    continue
  fi
  
  # Skip node_modules' package.json files (if somehow not caught by the dir exclusion)
  if [[ "$file" == *"node_modules"*"/package.json" ]]; then
    continue
  fi
  
  # Update progress
  CURRENT=$((CURRENT + 1))
  echo "Processing file $CURRENT: $file"
  
  # Check if file exists (in case it was deleted)
  if [ ! -f "$file" ]; then
    continue
  fi
  
  # Check if file is text (skip binary files)
  if ! file -b --mime "$file" | grep -q "^text/"; then
    echo "Skipping binary file: $file"
    continue
  fi
  
  # Add file header
  echo "|| START $file ||" >> $OUTPUT_FILE
  echo "" >> $OUTPUT_FILE
  
  # Add file content
  cat "$file" >> $OUTPUT_FILE
  
  # Add file footer
  echo "" >> $OUTPUT_FILE
  echo "|| END ||" >> $OUTPUT_FILE
  echo "" >> $OUTPUT_FILE
  echo "" >> $OUTPUT_FILE
done

echo "Export complete! Source code has been saved to $OUTPUT_FILE"
echo "Total files processed: $CURRENT"