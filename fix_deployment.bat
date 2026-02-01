@echo off
echo ===================================================
echo   FIXING DEPLOYMENT (VERCEL & RENDER)
echo ===================================================

echo [1/5] Removing pnpm-lock.yaml (Fixes Vercel)...
del pnpm-lock.yaml 2>nul
git rm --cached pnpm-lock.yaml 2>nul
git rm -f pnpm-lock.yaml 2>nul

echo [2/5] Ensuring 'backend' folder is tracked (Fixes Render)...
git add backend
git add .

echo [3/5] Committing fixes...
git commit -m "Fix: Remove pnpm-lock.yaml and force track backend"

echo [4/5] Pushing to GitHub (production)...
echo       (Please enter your PAT Token if asked, NOT password)
git push production main

echo.
echo ===================================================
echo     FIX PUSHED. NOW REDEPLOY IN VERCEL & RENDER
echo ===================================================
pause
