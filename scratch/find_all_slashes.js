const fs = require('fs');
const path = require('path');

function searchFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (f === 'node_modules' || f === '.git' || f === 'dist' || f === '.expo') continue;
    if (fs.statSync(full).isDirectory()) {
      searchFiles(full);
    } else if (/\.(tsx?|jsx?|html|css|json)$/.test(f)) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((l, i) => {
        const trimmed = l.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
        
        // Find if line contains // not part of http://, https://, file://, ://
        const idx = l.indexOf('//');
        if (idx !== -1) {
          const before = l.substring(Math.max(0, idx - 8), idx);
          if (!before.includes(':')) {
            // Check if "//" is in a string literal or JSX text
            const lineWithoutUrl = l.replace(/https?:\/\/[^\s'"]+/g, '');
            if (lineWithoutUrl.includes('//')) {
              // check if it's not just a trailing code comment
              // e.g. let x = 1; // comment
              const parts = lineWithoutUrl.split('//');
              const textBefore = parts[0];
              // If there's an odd number of quotes before //, it's inside a string!
              const singleQuotes = (textBefore.match(/'/g) || []).length;
              const doubleQuotes = (textBefore.match(/"/g) || []).length;
              const backticks = (textBefore.match(/`/g) || []).length;
              const insideString = (singleQuotes % 2 === 1) || (doubleQuotes % 2 === 1) || (backticks % 2 === 1);
              const insideJSX = textBefore.includes('>') && !textBefore.includes('<');
              if (insideString || insideJSX || trimmed.includes('[ 01') || trimmed.includes('[ 02')) {
                console.log(`${full}:${i + 1}: ${trimmed}`);
              }
            }
          }
        }
      });
    }
  }
}

searchFiles('./src');

