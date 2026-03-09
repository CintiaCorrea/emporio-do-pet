#############################################################
# Empório do Pet — Start All Services
#
# Usage:
#   .\scripts\start-all.ps1              (start everything)
#   .\scripts\start-all.ps1 -SkipDocker  (skip docker, infra already running)
#   .\scripts\start-all.ps1 -SkipNgrok   (skip ngrok tunnel)
#############################################################

param(
    [switch]$SkipDocker,
    [switch]$SkipNgrok,
    [switch]$SkipSeed
)

$ErrorActionPreference = "Continue"
$ROOT = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Emporio do Pet - Starting All Services" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# ─────────────────────────────────────────────
# 1. Docker (PostgreSQL + Redis + AI Service)
# ─────────────────────────────────────────────
if (-not $SkipDocker) {
    Write-Host "[1/6] Starting Docker services (PostgreSQL, Redis, AI Service)..." -ForegroundColor Yellow
    Push-Location $ROOT
    docker-compose -f docker-compose.emporio.yml up -d
    Pop-Location

    Write-Host "  Waiting for services to be healthy..." -ForegroundColor Gray
    Start-Sleep -Seconds 5

    # Check postgres health
    $pgReady = $false
    for ($i = 0; $i -lt 15; $i++) {
        $result = docker exec emporio-postgres pg_isready -U emporio 2>$null
        if ($LASTEXITCODE -eq 0) { $pgReady = $true; break }
        Start-Sleep -Seconds 2
    }
    if ($pgReady) {
        Write-Host "  PostgreSQL ready" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: PostgreSQL not ready yet" -ForegroundColor Red
    }

    # Check redis health
    $redisReady = docker exec emporio-redis redis-cli ping 2>$null
    if ($redisReady -eq "PONG") {
        Write-Host "  Redis ready" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: Redis not ready yet" -ForegroundColor Red
    }

    Write-Host ""
} else {
    Write-Host "[1/6] Skipping Docker (--SkipDocker)" -ForegroundColor DarkGray
}

# ─────────────────────────────────────────────
# 2. Prisma Migrations
# ─────────────────────────────────────────────
Write-Host "[2/6] Running Prisma migrations..." -ForegroundColor Yellow
Push-Location "$ROOT\backend"
npx prisma migrate deploy 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Migrations applied" -ForegroundColor Green
} else {
    Write-Host "  Generating Prisma client..." -ForegroundColor Gray
    npx prisma generate 2>$null
    npx prisma migrate deploy 2>$null
}
Pop-Location
Write-Host ""

# ─────────────────────────────────────────────
# 3. Seed — Create default WhatsApp AI Agent
# ─────────────────────────────────────────────
if (-not $SkipSeed) {
    Write-Host "[3/6] Seeding default WhatsApp AI Agent..." -ForegroundColor Yellow
    Push-Location "$ROOT\backend"
    npx ts-node prisma/seed-whatsapp-agent.ts 2>&1 | Write-Host
    Pop-Location
    Write-Host ""
} else {
    Write-Host "[3/6] Skipping seed (--SkipSeed)" -ForegroundColor DarkGray
}

# ─────────────────────────────────────────────
# 4. Start Backend (NestJS) in background
# ─────────────────────────────────────────────
Write-Host "[4/6] Starting Backend (NestJS) on port 3333..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location "$using:ROOT\backend"
    & pnpm start:dev 2>&1
}
Write-Host "  Backend starting (Job ID: $($backendJob.Id))..." -ForegroundColor Green

# Wait for backend to be ready
Write-Host "  Waiting for backend health check..." -ForegroundColor Gray
$backendReady = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 3
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:3333/api/health" -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($health) { $backendReady = $true; break }
    } catch { }
}
if ($backendReady) {
    Write-Host "  Backend ready at http://localhost:3333" -ForegroundColor Green
} else {
    Write-Host "  Backend not ready yet (may still be starting)" -ForegroundColor Yellow
}
Write-Host ""

# ─────────────────────────────────────────────
# 5. Start Frontend (Next.js) in background
# ─────────────────────────────────────────────
Write-Host "[5/6] Starting Frontend (Next.js) on port 3000..." -ForegroundColor Yellow
$frontendJob = Start-Job -ScriptBlock {
    Set-Location "$using:ROOT\vet-crm"
    & pnpm dev 2>&1
}
Write-Host "  Frontend starting (Job ID: $($frontendJob.Id))..." -ForegroundColor Green
Write-Host ""

# ─────────────────────────────────────────────
# 6. ngrok Tunnel for WhatsApp Webhook
# ─────────────────────────────────────────────
if (-not $SkipNgrok) {
    Write-Host "[6/6] Starting ngrok tunnel for WhatsApp webhook..." -ForegroundColor Yellow

    $ngrokExists = Get-Command ngrok -ErrorAction SilentlyContinue
    if ($ngrokExists) {
        Start-Process -FilePath "ngrok" -ArgumentList "http 3333" -WindowStyle Minimized
        Start-Sleep -Seconds 3

        try {
            $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -ErrorAction SilentlyContinue
            $httpsUrl = ($tunnels.tunnels | Where-Object { $_.proto -eq "https" }).public_url
            if ($httpsUrl) {
                Write-Host "  ngrok tunnel: $httpsUrl" -ForegroundColor Green
                Write-Host ""
                Write-Host "  ┌─────────────────────────────────────────────────┐" -ForegroundColor Cyan
                Write-Host "  │  WEBHOOK URL (copy to Meta Developer Portal):   │" -ForegroundColor Cyan
                Write-Host "  │  $httpsUrl/api/webhook/whatsapp" -ForegroundColor White
                Write-Host "  │                                                 │" -ForegroundColor Cyan
                Write-Host "  │  Verify Token: emporio_pet_whatsapp_webhook     │" -ForegroundColor White
                Write-Host "  │  Fields: messages                               │" -ForegroundColor White
                Write-Host "  └─────────────────────────────────────────────────┘" -ForegroundColor Cyan
            } else {
                Write-Host "  WARNING: Could not get ngrok URL" -ForegroundColor Red
            }
        } catch {
            Write-Host "  WARNING: ngrok API not responding" -ForegroundColor Red
        }
    } else {
        Write-Host "  ngrok not found. Install: https://ngrok.com/download" -ForegroundColor Red
        Write-Host "  Or install via: choco install ngrok" -ForegroundColor Gray
    }
} else {
    Write-Host "[6/6] Skipping ngrok (--SkipNgrok)" -ForegroundColor DarkGray
}

# ─────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  All services started!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend:    http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:     http://localhost:3333" -ForegroundColor White
Write-Host "  AI Service:  http://localhost:8000" -ForegroundColor White
Write-Host "  pgAdmin:     http://localhost:15050" -ForegroundColor White
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Yellow
Write-Host "  1. If WHATSAPP_DEFAULT_AGENT_ID is empty, run the seed:" -ForegroundColor Gray
Write-Host "     cd backend && npx ts-node prisma/seed-whatsapp-agent.ts" -ForegroundColor Gray
Write-Host "  2. Copy the Agent ID to backend/.env WHATSAPP_DEFAULT_AGENT_ID" -ForegroundColor Gray
Write-Host "  3. Register webhook URL in Meta Developer Portal" -ForegroundColor Gray
Write-Host "  4. Send a WhatsApp message to test!" -ForegroundColor Gray
Write-Host ""
Write-Host "  Press Ctrl+C to stop all services" -ForegroundColor DarkGray
Write-Host ""

# Keep script alive — show logs
try {
    while ($true) {
        Receive-Job -Job $backendJob -ErrorAction SilentlyContinue
        Receive-Job -Job $frontendJob -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 5
    }
} finally {
    Write-Host "`nStopping services..." -ForegroundColor Yellow
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -Force -ErrorAction SilentlyContinue
    Remove-Job $frontendJob -Force -ErrorAction SilentlyContinue
}
