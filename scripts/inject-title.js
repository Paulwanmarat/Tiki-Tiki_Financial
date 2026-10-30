const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  fs.readdirSync(distDir).filter(f => f.endsWith('.html')).forEach(f => {
    const p = path.join(distDir, f);
    let c = fs.readFileSync(p, 'utf8');
    c = c.replace(/<title data-rh="true"><\/title>/g, '<title data-rh="true">SPR Money Studio | Student Pecuniary Routine</title>');
    fs.writeFileSync(p, c, 'utf8');
    console.log('Injected title into', f);
  });
}
