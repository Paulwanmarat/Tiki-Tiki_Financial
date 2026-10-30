Write-Host "========================================================" -ForegroundColor Magenta
Write-Host "  SPR MONEY STUDIO - ONE-CLICK PRODUCTION DEPLOY" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Magenta
Write-Host ""

Write-Host "[1/3] Exporting latest web build..." -ForegroundColor Yellow
npx expo export -p web
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Export failed." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "[2/3] Injecting production page titles..." -ForegroundColor Yellow
node scripts/inject-title.js

Write-Host ""
Write-Host "[3/3] Pushing directly to https://spr-app.expo.app ..." -ForegroundColor Yellow
npx eas deploy --prod --non-interactive
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Deployment failed." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host "  Live URL: https://spr-app.expo.app" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Green
Write-Host "(Tip: Press Ctrl + Shift + R in your browser to hard refresh)" -ForegroundColor Gray

