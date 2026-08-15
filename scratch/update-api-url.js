const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../frontend/src');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const targetString = 'const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";';
const targetString2 = "const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';";
const replacementString = 'const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";';

walkDir(srcDir, (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    if (content.includes(targetString)) {
      content = content.replace(targetString, replacementString);
      modified = true;
    }
    if (content.includes(targetString2)) {
      content = content.replace(targetString2, replacementString);
      modified = true;
    }
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
