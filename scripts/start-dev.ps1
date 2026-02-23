# =====================================================
# Empório do Pet - Iniciar todos os serviços DEV
# =====================================================
# Execute este script para iniciar todos os serviços
# PowerShell: .\scripts\start-dev.ps1
# =====================================================

$ErrorActionPreference = "Continue"
$rootDir = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Iniciando Emporio do Pet - DEV" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Docker está rodando
$dockerStatus = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[X] Docker não está rodando. Inicie o Docker Desktop." -ForegroundColor Red
    exit 1
}

# Iniciar containers Docker
Write-Host "[i] Iniciando containers Docker..." -ForegroundColor Blue
Set-Location $rootDir
docker-compose -f docker-compose.dev.yml up -d postgres redis
Start-Sleep -Seconds 3

# Aguardar PostgreSQL
Write-Host "[i] Aguardando PostgreSQL..." -ForegroundColor Blue
$attempt = 0
do {
    Start-Sleep -Seconds 1
    $attempt++
    docker exec emporio-postgres-dev pg_isready -U emporio 2>&1 | Out-Null
} while ($LASTEXITCODE -ne 0 -and $attempt -lt 30)

if ($attempt -ge 30) {
    Write-Host "[X] PostgreSQL não iniciou" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] PostgreSQL pronto!" -ForegroundColor Green

# Função para iniciar serviço em nova janela
function Start-ServiceWindow($name, $workDir, $command) {
    $title = "Emporio - $name"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$workDir'; `$host.UI.RawUI.WindowTitle = '$title'; $command"
    Write-Host "[OK] $name iniciado em nova janela" -ForegroundColor Green
}

# Iniciar Backend
Write-Host ""
Write-Host "[i] Iniciando Backend (NestJS)..." -ForegroundColor Blue
Start-ServiceWindow "Backend" (Join-Path $rootDir "backend") "pnpm run start:dev"

# Aguardar um pouco
Start-Sleep -Seconds 2

# Iniciar AI Service
Write-Host "[i] Iniciando AI Service (FastAPI)..." -ForegroundColor Blue
$aiServiceDir = Join-Path $rootDir "ai-service"
$venvActivate = Join-Path $aiServiceDir "venv\Scripts\Activate.ps1"
if (Test-Path $venvActivate) {
    Start-ServiceWindow "AI Service" $aiServiceDir "& '$venvActivate'; uvicorn app.main:app --reload --port 8000"
} else {
    Start-ServiceWindow "AI Service" $aiServiceDir "python -m uvicorn app.main:app --reload --port 8000"
}

# Aguardar um pouco
Start-Sleep -Seconds 2

# Iniciar Frontend
Write-Host "[i] Iniciando Frontend (Next.js)..." -ForegroundColor Blue
Start-ServiceWindow "Frontend" (Join-Path $rootDir "vet-crm") "pnpm dev"

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "Todos os serviços foram iniciados!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Serviços:" -ForegroundColor Yellow
Write-Host "  Frontend:    http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:     http://localhost:3001" -ForegroundColor White
Write-Host "  AI Service:  http://localhost:8000" -ForegroundColor White
Write-Host "  Adminer:     http://localhost:8080" -ForegroundColor White
Write-Host ""
Write-Host "Para testar WhatsApp, execute:" -ForegroundColor Yellow
Write-Host "  ngrok http 3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "E configure o webhook no Meta:" -ForegroundColor Yellow
Write-Host "  URL: https://SEU-NGROK-URL/webhook/whatsapp" -ForegroundColor Cyan
Write-Host ""
