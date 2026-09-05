[CmdletBinding()]
param(
    [switch]$Mocks
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendRoot = Join-Path $projectRoot "backend"
$frontendRoot = Join-Path $projectRoot "frontend"
$backendPython = Join-Path $backendRoot ".venv\Scripts\python.exe"
$viteEntry = Join-Path $frontendRoot "node_modules\vite\bin\vite.js"

if (-not (Test-Path -LiteralPath $backendPython)) {
    throw "Backend environment is missing. Follow the First-time setup section in README.md."
}

if (-not (Test-Path -LiteralPath $viteEntry)) {
    throw "Frontend dependencies are missing. Run npm install in the frontend folder first."
}

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
    throw "Node.js is not available on PATH. Install Node.js 20 or newer and try again."
}

$backendIsRunning = $false
try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/health/" -TimeoutSec 1
    $backendIsRunning = $health.status -eq "ok"
}
catch {
    $backendIsRunning = $false
}

$frontendIsRunning = $false
try {
    $page = Invoke-WebRequest -Uri "http://127.0.0.1:5173/" -UseBasicParsing -TimeoutSec 1
    $frontendIsRunning = $page.StatusCode -eq 200 -and $page.Content -match "Studio"
}
catch {
    $frontendIsRunning = $false
}

$jobs = @()

if (-not $backendIsRunning -and -not $Mocks) {
    $jobs += Start-Job -Name "studio-backend" -ArgumentList $backendRoot, $backendPython -ScriptBlock {
        param($workingDirectory, $python)
        Set-Location -LiteralPath $workingDirectory
        & $python manage.py runserver 127.0.0.1:8000 --noreload
    }
}

if (-not $frontendIsRunning) {
    $jobs += Start-Job -Name "studio-frontend" -ArgumentList $frontendRoot, $nodeCommand.Source, $viteEntry, $Mocks.IsPresent -ScriptBlock {
        param($workingDirectory, $node, $vite, $useMocks)
        Set-Location -LiteralPath $workingDirectory
        if ($useMocks) {
            $env:VITE_USE_MOCKS = "true"
        }
        & $node $vite --host 127.0.0.1 --strictPort
    }
}

if ($jobs.Count -eq 0) {
    Write-Host "Studio is already running." -ForegroundColor Green
    Write-Host "Storefront: http://127.0.0.1:5173"
    Write-Host "API health: http://127.0.0.1:8000/api/health/"
    return
}

try {
    Write-Host "Studio is starting..." -ForegroundColor Cyan
    Write-Host "Storefront: http://127.0.0.1:5173"
    Write-Host "API health: http://127.0.0.1:8000/api/health/"
    if ($backendIsRunning) {
        Write-Host "Using the Django server that is already running on port 8000."
    }
    if ($frontendIsRunning) {
        Write-Host "Using the Vite server that is already running on port 5173."
    }
    Write-Host "Press Ctrl+C to stop both servers."

    while (($jobs | Where-Object State -eq "Running").Count -gt 0) {
        Receive-Job -Job $jobs
        Start-Sleep -Milliseconds 300
    }

    Receive-Job -Job $jobs
    $failed = $jobs | Where-Object State -eq "Failed"
    if ($failed) {
        throw "One or more development servers stopped unexpectedly."
    }
}
finally {
    Stop-Job -Job $jobs -ErrorAction SilentlyContinue
    Remove-Job -Job $jobs -Force -ErrorAction SilentlyContinue
}
