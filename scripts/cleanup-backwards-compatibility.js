#!/usr/bin/env node

/**
 * This script removes backward compatibility code from the codebase
 * after the context refactoring is complete and all components are using
 * the new context hooks.
 */

const fs = require('fs');
const path = require('path');

// Files to clean up
const files = [
  '../src/contexts/AnnotationContext.tsx',
  '../src/contexts/SessionContext.tsx',
  '../src/components/AnnotationCanvas.tsx',
  '../src/components/VideoPlayer.tsx',
  '../src/components/VideoPlayerWrapper.tsx',
  '../src/components/FeedbackOrchestrator.tsx'
];

// Patterns to remove (regex)
const patterns = [
  // Window global declarations
  /window\.__lastClearTime\s*=.+;/g,
  /window\.__hasRecordedSession\s*=.+;/g,
  /window\.__videoPlayerWrapper\s*=.+;/g,

  // SessionWindowSync component from SessionContext.tsx
  /<SessionWindowSync\s*\/>/g,
  /function SessionWindowSync\(\) {[\s\S]*?return null;\s*}/g,

  // Checks for window globals
  /if\s*\(typeof window !== 'undefined'\) {[\s\S]*?}/g,
  
  // Global window access
  /window\.__lastClearTime/g,
  /window\.__hasRecordedSession/g,
  /window\.__videoPlayerWrapper/g
];

// Process each file
files.forEach(relativeFile => {
  const file = path.resolve(__dirname, relativeFile);
  
  if (!fs.existsSync(file)) {
    console.log(`Skipping non-existent file: ${file}`);
    return;
  }
  
  console.log(`Processing ${file}`);
  
  // Read file content
  let content = fs.readFileSync(file, 'utf8');
  
  // Apply all patterns
  patterns.forEach(pattern => {
    const originalSize = content.length;
    content = content.replace(pattern, '');
    const newSize = content.length;
    
    if (originalSize !== newSize) {
      console.log(`  - Removed pattern: ${pattern}`);
    }
  });
  
  // Write the cleaned content back
  fs.writeFileSync(file, content);
  console.log(`  - Saved cleaned file`);
});

console.log('Backward compatibility cleanup complete!');