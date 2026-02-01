@echo off
echo ===================================================
echo   FINAL DEPLOYMENT PUSH
echo ===================================================

echo [1/3] Staging all changes...
git add .

echo [2/3] Committing...
git commit -m "Fix: Add lib/utils.ts for Vercel" || echo No changes to commit

echo [3/3] Pushing to production...
echo (Please paste your GitHub token when asked)
git push production main

echo.
echo ===================================================
echo   PUSHED! NOW:
echo   1. Vercel: Click "Redeploy"
echo   2. Render: Click "Clear build cache and deploy"
echo ===================================================
pause
