#!/bin/bash

# Script to clean up the old app directory after confirming the new structure works

echo "WARNING: This script will permanently remove the old 'app/' directory."
echo "Make sure you have verified that the new structure in 'src/app/' is working correctly."
read -p "Are you sure you want to proceed? (y/N): " confirm

if [[ $confirm != "y" && $confirm != "Y" ]]; then
  echo "Operation cancelled. No files were deleted."
  exit 0
fi

echo "Removing old app directory..."
rm -rf app/

echo "Cleanup complete. The old app/ directory has been removed."
echo "Your project now uses the consolidated src/ directory structure."