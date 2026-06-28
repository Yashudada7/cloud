const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('alert(')) {
    console.log(`Processing ${filePath}`);
    // Replace alert( with toast(
    // We should differentiate success from error based on content, or just use generic toast, or toast.info.
    // Actually, toast.error for anything with "failed" or "error", toast.success for "success" etc.
    let modified = false;
    content = content.replace(/alert\((.*?)\)/g, (match, p1) => {
      modified = true;
      let lower = p1.toLowerCase();
      if (lower.includes('failed') || lower.includes('error') || lower.includes('invalid') || lower.includes('not found') || lower.includes('must be') || lower.includes('required') || lower.includes('please') || lower.includes('could not')) {
        return `toast.error(${p1})`;
      } else if (lower.includes('success') || lower.includes('submitted') || lower.includes('thank you') || lower.includes('published') || lower.includes('created')) {
        return `toast.success(${p1})`;
      } else {
        return `toast.info(${p1})`;
      }
    });

    if (modified) {
      if (!content.includes("import { toast } from 'react-toastify'")) {
        // Find last import
        const importRegex = /^import .* from .*;/gm;
        let lastMatch;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
          lastMatch = match;
        }
        
        if (lastMatch) {
          const insertPos = lastMatch.index + lastMatch[0].length;
          content = content.slice(0, insertPos) + "\nimport { toast } from 'react-toastify';" + content.slice(insertPos);
        } else {
          content = "import { toast } from 'react-toastify';\n" + content;
        }
      }
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

walkDir(path.join(__dirname, 'frontend', 'src'));
console.log("Done");
