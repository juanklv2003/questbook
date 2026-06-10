const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let changed = false;
      content = content.replace(/import\s+{([^}]+)}\s+from\s+['"](.*?)['"]/g, (match, importsStr, modulePath) => {
        if (modulePath.includes('../types') || modulePath.includes('./types') || modulePath.includes('types')) {
            changed = true;
            return `import type { ${importsStr.trim()} } from '${modulePath}'`;
        }
        return match;
      });

      if (changed) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

processDir(path.join(process.cwd(), 'src'));
