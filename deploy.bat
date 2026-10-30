@echo off
title Deploying SPR App to Production
cls
echo ========================================================
echo   SPR MONEY STUDIO - ONE-CLICK PRODUCTION DEPLOY
echo ========================================================
echo.
echo [1/3] Exporting latest web build...
call npx expo export -p web
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Web export failed! Check above errors.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Injecting production page titles...
node scripts/inject-title.js

echo.
echo [3/3] Pushing directly to https://spr-app.expo.app ...
call npx eas deploy --prod --non-interactive
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Deployment failed! Check above errors.
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================================
echo   DEPLOYMENT SUCCESSFUL!
echo   Live URL: https://spr-app.expo.app
echo ========================================================
echo.
echo (Tip: Press Ctrl + Shift + R in your browser to hard refresh)
pause

