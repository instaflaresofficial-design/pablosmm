@echo off
echo [1/3] Staging changes...
git add package.json
git add .

echo [2/3] Committing fix...
git commit -m "Fix: Remove next-auth and stale lockfile to fix Vercel build"

echo [3/3] Pushing to production...
git push production main
pause
