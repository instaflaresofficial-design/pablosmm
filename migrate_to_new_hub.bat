@echo off
echo ===================================================
echo     MIGRATING PABLOSMM TO NEW REPO (pablosmmcom)
echo ===================================================

echo [1/3] Adding new remote 'production'...
git remote remove production 2>nul
git remote add production https://pablosmmcom@github.com/pablosmmcom/pablosmm.git

echo [2/3] Verifying remotes...
git remote -v

echo [3/3] Pushing code to new repository...
echo       (A popup might appear asking for GitHub login - please sign in!)
git push -u production main --force

echo.
echo ===================================================
echo      MIGRATION COMPLETE (If no errors above)
echo ===================================================
pause
