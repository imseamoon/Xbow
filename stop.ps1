<#
.SYNOPSIS
    Red Sentinel — Stop all services.
    Kills all RedSentinel processes by known ports.
#>

$ROOT = $PSScriptRoot

Write-Host "Stopping Red Sentinel services..." -ForegroundColor Cyan

# ── Kill processes by known ports ────────────────────────────────────
$PORTS = @(6379, 5432, 5001, 5002, 5003, 3000, 8080, 9090)
$found = $false

# Try using modern Get-NetTCPConnection (Windows 8+/Server 2012+)
$useModern = $null -ne (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue)

if ($useModern) {
    foreach ($port in $PORTS) {
        try {
            $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
            foreach ($conn in $connections) {
                $processId = $conn.OwningProcess
                $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Host "  [OK] Killing PID $processId ($($proc.ProcessName)) on port :$port" -ForegroundColor Yellow
                    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                    $found = $true
                }
            }
        } catch {
            # Fall through to netstat method
        }
    }
}

# Fallback: use netstat if Get-NetTCPConnection didn't cover all ports
foreach ($port in $PORTS) {
    $conn = netstat -ano 2>$null | Select-String ":$port "
    if ($conn) {
        foreach ($line in $conn) {
            $parts = $line.ToString() -split '\s+'
            $processId = $parts[-1]
            if ($processId -and $processId -match '^\d+$') {
                $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Host "  [OK] Killing PID $processId ($($proc.ProcessName)) on port :$port" -ForegroundColor Yellow
                    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                    $found = $true
                }
            }
        }
    }
}

if (-not $found) {
    Write-Host "  .. No RedSentinel processes found running." -ForegroundColor Green
}

# ── Close orphaned service terminal windows ───────────────────────────
$KNOWN_TITLES = @(
    "Redis :6379",
    "PostgreSQL :5432",
    "Context Module :5001",
    "Payload Gen :5002",
    "Fuzzer Module :5003",
    "Core API (NestJS) :3000",
    "Dashboard (Next.js) :8080",
    "Exploitable Site :9090"
)

$closedWindows = 0
foreach ($title in $KNOWN_TITLES) {
    # taskkill with WINDOWTITLE filter targets windows matching the title
    $result = taskkill /F /FI "WINDOWTITLE eq $title*" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Closed terminal: $title" -ForegroundColor Yellow
        $closedWindows++
    }
}

if ($closedWindows -gt 0) {
    Write-Host "  [OK] $closedWindows terminal window(s) closed" -ForegroundColor Green
} else {
    Write-Host "  .. No orphaned service terminals found." -ForegroundColor Green
}

Write-Host "Done." -ForegroundColor Cyan
