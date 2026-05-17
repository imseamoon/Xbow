<#
.SYNOPSIS
    Red Sentinel — Windows Service Launcher.
    Starts all dev servers in separate PowerShell windows.
    Each service runs in its own terminal (no tmux needed).

    Usage:
      .\start.ps1          (starts all services)

    Services launched:
      Window 1 — Redis              :6379
      Window 2 — PostgreSQL         :5432
      Window 3 — Context Module     :5001
      Window 4 — Payload Gen        :5002
      Window 5 — Fuzzer Module      :5003
      Window 6 — Core API (NestJS)  :3000
      Window 7 — Dashboard (Next.js):8080
      Window 8 — Exploitable Site   :9090
#>

param(
    [switch]$Detach
)

$ROOT = $PSScriptRoot
$VENV = "$ROOT\venv"

# Ensure venv exists
if (-not (Test-Path "$VENV\Scripts\Activate.ps1")) {
    Write-Host "[X] Virtual environment not found at $VENV" -ForegroundColor Red
    Write-Host "    Run .\setup.ps1 first" -ForegroundColor Yellow
    exit 1
}

# Detect available PowerShell executable
$PS_EXE = "powershell.exe"
if (Get-Command pwsh.exe -ErrorAction SilentlyContinue) {
    $PS_EXE = "pwsh.exe"
}

# Common environment variables
$ENV_COMMON = @(
    "REDIS_HOST=localhost",
    "REDIS_PORT=6379",
    "DATA_DIR=$ROOT\dataset",
    "CONTEXT_URL=http://localhost:5001",
    "PAYLOAD_GEN_URL=http://localhost:5002",
    "FUZZER_URL=http://localhost:5003",
    "DATABASE_URL=postgresql://rs:rs@localhost:5432/redsentinel",
    "NODE_ENV=development"
)

# Build env var prefix string for spawned windows
$envPrefix = ""
foreach ($e in $ENV_COMMON) {
    $parts = $e -split '=', 2
    $envPrefix += "`$env:$($parts[0])='$($parts[1])'; "
}

function Start-ServiceWindow {
    param(
        [string]$Title,
        [string]$Command,
        [string]$WorkDir = $ROOT,
        [string[]]$ExtraEnv = @(),
        [switch]$Minimized
    )

    # Extend env prefix with extra vars
    $fullPrefix = $envPrefix
    foreach ($e in $ExtraEnv) {
        $parts = $e -split '=', 2
        $fullPrefix += "`$env:$($parts[0])='$($parts[1])'; "
    }

    $psCommand = @"
`$Host.UI.RawUI.WindowTitle = '$Title'
$fullPrefix
Set-Location '$WorkDir'
Write-Host ''
Write-Host '--- $Title ---' -ForegroundColor Cyan
Write-Host ''
$Command
"@

    $winArgs = @("-NoExit", "-Command", $psCommand)

    if ($Minimized) {
        Start-Process $PS_EXE -ArgumentList $winArgs -WindowStyle Minimized
    } else {
        Start-Process $PS_EXE -ArgumentList $winArgs
    }

    Start-Sleep -Milliseconds 800
}

# Stop previous instances
Write-Host "  [..] Stopping any previous instances..." -ForegroundColor Cyan
& "$ROOT\stop.ps1"
Start-Sleep -Seconds 2

# 1 — Redis
Start-ServiceWindow -Title "Redis :6379" -Command "redis-server" -Minimized

# 2 — PostgreSQL
$pgCmd = "pg_isready -h localhost 2>`$null; if (`$LASTEXITCODE -ne 0) { Write-Host 'PostgreSQL not running - start from Services.msc'; } while (`$true) { Start-Sleep -Seconds 30; pg_isready -h localhost }"
Start-ServiceWindow -Title "PostgreSQL :5432" -Command $pgCmd -Minimized

# 3 — Context Module :5001
$ctxCmd = "& '$VENV\Scripts\Activate.ps1'; Write-Host 'Context Module starting on http://localhost:5001' -ForegroundColor Green; python app.py"
Start-ServiceWindow -Title "Context Module :5001" -WorkDir "$ROOT\modules\context-module" -ExtraEnv @("PORT=5001") -Command $ctxCmd

# 4 — Payload Gen :5002
$payCmd = "& '$VENV\Scripts\Activate.ps1'; Write-Host 'Payload Generator starting on http://localhost:5002' -ForegroundColor Green; python app.py"
Start-ServiceWindow -Title "Payload Gen :5002" -WorkDir "$ROOT\modules\payload-gen-module" -ExtraEnv @("PORT=5002", "DATASET_DIR=$ROOT\dataset\splits", "RANKER_MODEL_DIR=$ROOT\model\ranker") -Command $payCmd

# 5 — Fuzzer Module :5003
$fuzzCmd = "& '$VENV\Scripts\Activate.ps1'; Write-Host 'Fuzzer Module starting on http://localhost:5003' -ForegroundColor Green; python app.py"
Start-ServiceWindow -Title "Fuzzer Module :5003" -WorkDir "$ROOT\modules\fuzzer-module" -ExtraEnv @("PORT=5003") -Command $fuzzCmd

# 6 — Core API (NestJS) :3000
$coreCmd = "Write-Host 'Core API (NestJS) starting on http://localhost:3000' -ForegroundColor Green; npm run start:dev"
Start-ServiceWindow -Title "Core API (NestJS) :3000" -WorkDir "$ROOT\core" -ExtraEnv @("PORT=3000") -Command $coreCmd

# 7 — Dashboard (Next.js) :8080
$dashCmd = "Write-Host 'Dashboard (Next.js) starting on http://localhost:8080' -ForegroundColor Green; npx next dev -p 8080"
Start-ServiceWindow -Title "Dashboard (Next.js) :8080" -WorkDir "$ROOT\dashboard" -ExtraEnv @("PORT=8080", "NEXT_PUBLIC_API_URL=http://localhost:3000") -Command $dashCmd

# 8 — Exploitable Test Site :9090
$expCmd = "& '$VENV\Scripts\Activate.ps1'; Write-Host 'Exploitable test site starting on http://localhost:9090' -ForegroundColor Green; python app.py"
Start-ServiceWindow -Title "Exploitable Site :9090" -WorkDir "$ROOT\exploitable" -ExtraEnv @("PORT=9090") -Command $expCmd

# Summary
Write-Host ""
Write-Host "  ==================================================" -ForegroundColor Magenta
Write-Host "        Red Sentinel - Running" -ForegroundColor Magenta
Write-Host "  ==================================================" -ForegroundColor Magenta
Write-Host "  Redis           :6379" -ForegroundColor Magenta
Write-Host "  PostgreSQL      :5432" -ForegroundColor Magenta
Write-Host "  Context API     http://localhost:5001" -ForegroundColor Magenta
Write-Host "  Payload-Gen     http://localhost:5002" -ForegroundColor Magenta
Write-Host "  Fuzzer          http://localhost:5003" -ForegroundColor Magenta
Write-Host "  Core API        http://localhost:3000" -ForegroundColor Magenta
Write-Host "  Dashboard       http://localhost:8080" -ForegroundColor Magenta
Write-Host "  Vuln Test Site  http://localhost:9090" -ForegroundColor Magenta
Write-Host "  Swagger Docs    http://localhost:3000/docs" -ForegroundColor Magenta
Write-Host "  ==================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Stop all services with:  .\stop.ps1" -ForegroundColor Yellow
Write-Host ""
