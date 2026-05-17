<#
.SYNOPSIS
    Red Sentinel - First-time Windows setup script.
    Installs dependencies, creates venv, sets up database, builds core.
    Run once from the project root in PowerShell.
#>

$ErrorActionPreference = "Stop"
$ROOT = $PSScriptRoot
$LOG  = "$ROOT\.setup.log"

function ok   { Write-Host "  [OK] $($args[0])" -ForegroundColor Green }
function info { Write-Host "  [..] $($args[0])" -ForegroundColor Cyan }
function warn { Write-Host "  [!] $($args[0])" -ForegroundColor Yellow }
function fail { Write-Host "  [X] $($args[0])" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "  ===============================================" -ForegroundColor Magenta
Write-Host "        Red Sentinel - Setup (Windows)" -ForegroundColor Magenta
Write-Host "  ===============================================" -ForegroundColor Magenta
Write-Host ""

# == 1. Prerequisite checks ==================================
info "Checking prerequisites..."

# Node.js
$nodeVer = node --version 2>$null
if (-not $nodeVer) {
    fail "Node.js not found - install v22+ from https://nodejs.org"
}
$nodeMajor = [int]($nodeVer -replace 'v', '' -replace '\..*', '')
if ($nodeMajor -lt 22) {
    fail "Node.js $nodeVer is too old - need v22+"
}
ok "Node.js $nodeVer"

# Python
$pyExe = "python"
$pyVer = & $pyExe --version 2>&1
if ($LASTEXITCODE -ne 0) {
    $pyExe = "python3"
    $pyVer = & $pyExe --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        fail "Python not found - install Python 3.11+ from https://python.org"
    }
}
$pyMinor = & $pyExe -c "import sys; print(sys.version_info.minor)" 2>&1
$pyMinor = $pyMinor.Trim()
if ([int]$pyMinor -lt 11) {
    fail "Python 3.11+ required (found $($pyVer.Trim()))"
}
ok "$($pyVer.Trim())"

# pip
& $pyExe -m pip --version 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    info "Installing pip..."
    & $pyExe -m ensurepip --upgrade | Out-Null
}
ok "pip available"

# PostgreSQL — add bin directory to PATH so pg_isready, psql etc. are found
$env:Path = "C:\Program Files\PostgreSQL\17\bin;" + $env:Path
$pgReady = Get-Command pg_isready -ErrorAction SilentlyContinue
if (-not $pgReady) {
    warn "pg_isready not found - ensure PostgreSQL is installed (https://www.postgresql.org/download/windows/)"
    warn "You will need to configure PostgreSQL manually after installation."
} else {
    ok "PostgreSQL tools found"
}

# Redis
$redisServer = Get-Command redis-server -ErrorAction SilentlyContinue
if (-not $redisServer) {
    warn "redis-server not found - install Redis for Windows or use WSL"
    warn "Download from: https://github.com/microsoftarchive/redis/releases"
} else {
    ok "redis-server found"
}

# == 2. Python virtual environment ============================
$VENV = "$ROOT\venv"

info "Creating Python virtual environment..."
if (-not (Test-Path "$VENV\Scripts\python.exe")) {
    & $pyExe -m venv $VENV
    if ($LASTEXITCODE -ne 0) {
        fail "Failed to create virtual environment"
    }
}
ok "venv at $VENV"

info "Installing Python dependencies from requirements.txt..."
& "$VENV\Scripts\pip.exe" install --upgrade pip 2>&1 | Out-Null
& "$VENV\Scripts\pip.exe" install -r "$ROOT\requirements.txt" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    fail "Failed to install Python dependencies"
}
ok "Python dependencies installed"

# == 3. Playwright browsers ===================================
info "Installing Playwright browsers (Chromium)..."
& "$VENV\Scripts\python.exe" -m playwright install chromium 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    warn "Playwright Chromium install had issues (may need --with-deps on Linux/WSL)"
} else {
    ok "Playwright Chromium installed"
}

# == 4. Puppeteer browser =====================================
info "Installing Puppeteer browser (Chrome) for core..."
Push-Location "$ROOT\core"
npx puppeteer browsers install chrome 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    warn "Puppeteer Chrome install had issues"
} else {
    ok "Puppeteer Chrome installed"
}
Pop-Location

# == 5. Node dependencies - core ==============================
info "Installing Node packages for core (NestJS)..."
Push-Location "$ROOT\core"
npm install 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    fail "npm install failed in core/"
}
ok "core/node_modules installed"
Pop-Location

# == 6. Node dependencies - dashboard =========================
info "Installing Node packages for dashboard (Next.js)..."
Push-Location "$ROOT\dashboard"
npm install 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    fail "npm install failed in dashboard/"
}
ok "dashboard/node_modules installed"
Pop-Location

# == 7. Environment file ======================================
$envFile = "$ROOT\.env"
if (-not (Test-Path $envFile)) {
    info "Creating .env from .env.example..."
    Copy-Item "$ROOT\.env.example" $envFile

    # Patch for local (non-Docker) mode
    $envContent = Get-Content $envFile
    $envContent = $envContent -replace 'http://context:', 'http://localhost:'
    $envContent = $envContent -replace 'http://payload-gen:', 'http://localhost:'
    $envContent = $envContent -replace 'http://fuzzer:', 'http://localhost:'
    $envContent = $envContent -replace 'REDIS_HOST=redis', 'REDIS_HOST=localhost'
    $envContent = $envContent -replace '@postgres:', '@localhost:'
    $envContent = $envContent -replace 'NODE_ENV=production', 'NODE_ENV=development'
    $envContent | Set-Content $envFile

    ok ".env created (patched for localhost)"
} else {
    ok ".env already exists"
}

# == 8. Build NestJS core =====================================
info "Building NestJS core..."
Push-Location "$ROOT\core"
npx nest build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    fail "NestJS build failed"
}
ok "core built (dist/)"
Pop-Location

# == 9. Database setup & migrations ===========================
info "Setting up PostgreSQL database..."

$PG_SETUP = $false
if ($pgReady) {
    # Check if PostgreSQL is running
    pg_isready -h localhost 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        info "PostgreSQL is running - creating role and database if needed..."

        # Check if role rs exists
        $roleCheck = psql -h localhost -U postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='rs'" 2>&1 | Out-String
        $roleExists = ($LASTEXITCODE -eq 0) -and ($roleCheck.Trim() -ne "")
        if (-not $roleExists) {
            psql -h localhost -U postgres -c "CREATE ROLE rs WITH LOGIN PASSWORD 'rs';" 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                info "  Created role 'rs'"
            } else {
                warn "  Could not create role 'rs' - you may need to run as admin or set pg_hba.conf"
            }
        } else {
            ok "  Role 'rs' exists"
        }

        # Check if database redsentinel exists
        $dbCheck = psql -h localhost -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='redsentinel'" 2>&1 | Out-String
        $dbExists = ($LASTEXITCODE -eq 0) -and ($dbCheck.Trim() -ne "")
        if (-not $dbExists) {
            psql -h localhost -U postgres -c "CREATE DATABASE redsentinel OWNER rs;" 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                info "  Created database 'redsentinel'"
            } else {
                warn "  Could not create database 'redsentinel'"
            }
        } else {
            ok "  Database 'redsentinel' exists"
        }

        $PG_SETUP = $true
    } else {
        warn "PostgreSQL is not running - start it manually then re-run migrations"
    }
}

if ($PG_SETUP) {
    info "Running database migrations..."
    Push-Location "$ROOT\core"
    $env:DATABASE_URL = "postgresql://rs:65432one@localhost:5432/redsentinel"
    npm run migration:run 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        warn "Migrations failed - you can run them later with: cd core && npm run migration:run"
    } else {
        ok "Migrations applied"
    }
    Pop-Location
} else {
    warn "Skipping migrations - PostgreSQL not configured yet."
    warn "After starting PostgreSQL, run: cd core && npm run migration:run"
}

# == Done =====================================================
Write-Host ""
Write-Host "  ===============================================" -ForegroundColor Magenta
Write-Host "          Setup complete!" -ForegroundColor Magenta
Write-Host "  ===============================================" -ForegroundColor Magenta
Write-Host "  Start all:    .\start.ps1" -ForegroundColor Magenta
Write-Host "  Stop all:     .\stop.ps1" -ForegroundColor Magenta
Write-Host "  Manual run:   see RUN.md" -ForegroundColor Magenta
Write-Host "  ===============================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Full install log: $LOG"
Write-Host ""
