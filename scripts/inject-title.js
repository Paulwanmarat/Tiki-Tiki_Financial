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

  // Ensure /app directly loads the app screen without 404
  const appIndex = path.join(distDir, 'app', 'index.html');
  const appHtml = path.join(distDir, 'app.html');
  if (fs.existsSync(appIndex)) {
    fs.copyFileSync(appIndex, appHtml);
    console.log('Created dist/app.html alias from dist/app/index.html');
  }

  // Ensure standard web hosting 404 fallback routes to index.html for SPA client-side routing
  const rootIndex = path.join(distDir, 'index.html');
  const notFoundHtml = path.join(distDir, '404.html');
  if (fs.existsSync(rootIndex)) {
    fs.copyFileSync(rootIndex, notFoundHtml);
    console.log('Created dist/404.html fallback from dist/index.html');
  }
}

