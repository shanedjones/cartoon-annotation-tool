#!/bin/bash

# This script removes all comments from TypeScript, TypeScript React, and JavaScript files
# It preserves JSDoc comments with @param, @returns, etc. that provide type information

# Find all .ts, .tsx, and .js files
echo "Finding files..."
TS_FILES=$(find . -name "*.ts" -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/build/*")
TSX_FILES=$(find . -name "*.tsx" -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/build/*")
JS_FILES=$(find . -name "*.js" -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/build/*")

ALL_FILES="$TS_FILES $TSX_FILES $JS_FILES"

# Create a backup directory
BACKUP_DIR="./comment-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "Created backup directory: $BACKUP_DIR"

# Function to process each file
process_file() {
  local file=$1
  local relative_path=${file#./}
  local backup_path="$BACKUP_DIR/$relative_path"
  
  # Create backup directory structure
  mkdir -p "$(dirname "$backup_path")"
  
  # Copy original file to backup
  cp "$file" "$backup_path"
  
  echo "Processing $file"
  
  # Remove single-line comments and multi-line comments without JSDoc annotations
  # Handle both // comments and /* */ comments
  # Complex sed expression that:
  # 1. Removes single-line comments that start with //
  # 2. Removes multi-line comments that don't appear to be JSDoc comments
  # Note: This is a best-effort approach and might not be perfect for all edge cases
  
  sed -i.bak \
    -e 's/\/\/.*$//' \
    -e '/\/\*/ {
      /\*\//{
        /[@]param\|[@]returns\|[@]type\|[@]interface/{
          b
        }
        s/\/\*.*\*\///g
      }
      /\*\//{
        s/\/\*.*\*\///g
      }
      /\*\//{
        b
      }
      /[@]param\|[@]returns\|[@]type\|[@]interface/{
        b
      }
      :a
      N
      /\*\//{
        /[@]param\|[@]returns\|[@]type\|[@]interface/{
          b
        }
        s/\/\*.*\*\///g
        b
      }
      ba
    }' "$file"
    
  # Remove the .bak files created by sed
  rm "${file}.bak"
}

# Count total files
TOTAL_FILES=$(echo $ALL_FILES | wc -w)
echo "Found $TOTAL_FILES files to process"

# Process each file
for file in $ALL_FILES; do
  process_file "$file"
done

echo "All comments removed. Original files backed up to $BACKUP_DIR"
echo "Note: Some JSDoc comments may have been preserved if they contain type information."