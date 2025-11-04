// This script helps Render find the correct files when uploaded as a zip
import fs from 'fs';
import path from 'path';

console.log('Setting up build environment...');

// Check if we're in a zip-extracted environment
const currentDir = process.cwd();
console.log('Current directory:', currentDir);

// List all files to help debug
const files = fs.readdirSync('.');
console.log('Available files:', files);

// If package.json exists, we're good
if (fs.existsSync('package.json')) {
  console.log('Found package.json, proceeding with build...');
  process.exit(0);
}

// If we're in a nested directory (from zip extraction), try to find the real root
const possibleRoots = files.filter(f => fs.statSync(f).isDirectory());
for (const dir of possibleRoots) {
  const packagePath = path.join(dir, 'package.json');
  if (fs.existsSync(packagePath)) {
    console.log(`Found package.json in ${dir}, copying files to root...`);
    
    // Copy all files from the subdirectory to root
    const subFiles = fs.readdirSync(dir);
    for (const file of subFiles) {
      const srcPath = path.join(dir, file);
      const destPath = file;
      
      if (fs.statSync(srcPath).isDirectory()) {
        // Copy directory recursively
        fs.cpSync(srcPath, destPath, { recursive: true });
      } else {
        // Copy file
        fs.copyFileSync(srcPath, destPath);
      }
    }
    
    console.log('Files copied successfully');
    break;
  }
}