#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
function findFiles(dir, extensions) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory() &&
        file !== 'node_modules' &&
        file !== '.git' &&
        file !== 'dist' &&
        file !== 'build' &&
        file !== '.next') {
      results = results.concat(findFiles(filePath, extensions));
    } else if (stat.isFile() && extensions.includes(path.extname(filePath))) {
      results.push(filePath);
    }
  }
  return results;
}
function removeComments(filePath) {
  console.log(`Processing: ${filePath}`);
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/\/\/.*$/gm, '');
    content = content.replace(/\/\*[\s\S]*?\*\
    content = content.replace(/^\s*[\r\n]/gm, '');
    content = content.replace(/[ \t]+$/gm, '');
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return false;
  }
}
function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = `comment-backup-${timestamp}`;
  console.log(`Creating backup in ${backupDir}...`);
  execSync(`mkdir -p ${backupDir}`);
  execSync(`cp -r ./app ./src ./middleware.ts ./next.config.ts ./${backupDir}/`);
  console.log('Finding all TypeScript, React, and JavaScript files...');
  const rootDir = './';
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];
  const files = findFiles(rootDir, extensions);
  console.log(`Found ${files.length} files to process.`);
  let successCount = 0;
  let failCount = 0;
  for (const file of files) {
    const success = removeComments(file);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  console.log(`
===== COMMENT REMOVAL COMPLETE =====
Successfully processed: ${successCount} files
Failed to process: ${failCount} files
Backup created in: ${backupDir}
`);
}
main();