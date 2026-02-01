@echo off
echo ===================================================
echo   PUSHING DEPLOYMENT FIXES (GO 1.24 + COMPONENTS)
echo ===================================================

echo [1/4] Staging all changes...
git add .

echo [2/4] Committing fixes...
git commit -m "Fix: Upgrade to Go 1.24 and add missing components for Vercel"

echo [3/4] Pushing to production...
git push production main

echo.
echo ===================================================
echo     SUCCESS! NOW REDEPLOY IN VERCEL & RENDER
echo ===================================================
pause
