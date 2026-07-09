param (
    [Parameter(Position = 0, Mandatory = $false)]
    [string]$Target = "help"
)

function Start-Dev {
    Write-Host "Starting frontend and backend..." -ForegroundColor Green
    
    # Start Go backend
    $backendProcess = Start-Process -FilePath "go" -ArgumentList "run ./cmd/server/main.go" -WorkingDirectory "apps\api" -PassThru -NoNewWindow
    
    # Start Next.js frontend
    Set-Location "apps\web"
    npm run dev
    
    # Clean up backend process when frontend is stopped
    Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
}

function Start-DevWeb {
    Set-Location "apps\web"
    npm run dev
}

function Start-DevApi {
    Set-Location "apps\api"
    go run ./cmd/server/main.go
}

function Build-All {
    Build-Web
    Build-Api
}

function Build-Web {
    Write-Host "Building Next.js frontend..." -ForegroundColor Green
    Set-Location "apps\web"
    npm run build
    Set-Location "..\.."
}

function Build-Api {
    Write-Host "Building Go backend..." -ForegroundColor Green
    Set-Location "apps\api"
    $env:CGO_ENABLED="0"
    go build -o server.exe ./cmd/server/main.go
    Set-Location "..\.."
}

function Install-Deps {
    Write-Host "Installing web dependencies..." -ForegroundColor Green
    Set-Location "apps\web"
    npm install
    Set-Location "..\.."
}

function Lint-Web {
    Set-Location "apps\web"
    npm run lint
    Set-Location "..\.."
}

function Clean-All {
    Write-Host "Cleaning build artifacts..." -ForegroundColor Green
    if (Test-Path "apps\web\.next") { Remove-Item -Recurse -Force "apps\web\.next" }
    if (Test-Path "apps\web\node_modules") { Remove-Item -Recurse -Force "apps\web\node_modules" }
    if (Test-Path "apps\api\server.exe") { Remove-Item -Force "apps\api\server.exe" }
    if (Test-Path "apps\api\server") { Remove-Item -Force "apps\api\server" }
    if (Test-Path "apps\api\*.log") { Remove-Item -Force "apps\api\*.log" }
}

function Show-Help {
    Write-Host "`nPabloSMM Monorepo (Windows)" -ForegroundColor Cyan
    Write-Host "=============================" -ForegroundColor Cyan
    Write-Host "`nUsage: .\make.ps1 <target>`n"
    Write-Host "Development:" -ForegroundColor Yellow
    Write-Host "  dev          Start frontend + backend (parallel)"
    Write-Host "  dev-web      Start Next.js dev server only"
    Write-Host "  dev-api      Start Go backend only`n"
    Write-Host "Build:" -ForegroundColor Yellow
    Write-Host "  build        Build all"
    Write-Host "  build-web    Build Next.js production bundle"
    Write-Host "  build-api    Build Go binary`n"
    Write-Host "Setup:" -ForegroundColor Yellow
    Write-Host "  install      Install web dependencies"
    Write-Host "  lint         Lint frontend code`n"
    Write-Host "Other:" -ForegroundColor Yellow
    Write-Host "  clean        Clean all build artifacts"
    Write-Host "  help         Show this help`n"
}

switch ($Target) {
    "dev"       { Start-Dev }
    "dev-web"   { Start-DevWeb }
    "dev-api"   { Start-DevApi }
    "build"     { Build-All }
    "build-web" { Build-Web }
    "build-api" { Build-Api }
    "install"   { Install-Deps }
    "lint"      { Lint-Web }
    "clean"     { Clean-All }
    "help"      { Show-Help }
    default     { Write-Host "Unknown target: $Target" -ForegroundColor Red; Show-Help }
}
