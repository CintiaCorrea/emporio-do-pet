# =====================================================
# Empório do Pet - Script de Setup para Desenvolvimento
# =====================================================
# Execute este script para configurar o ambiente de DEV
# PowerShell: .\scripts\setup-dev.ps1
# =====================================================

$ErrorActionPreference = "Stop"

# Cores para output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Header($text) {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host $text -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
}

function Write-Success($text) {
    Write-Host "[OK] $text" -ForegroundColor Green
}

function Write-Warning($text) {
    Write-Host "[!] $text" -ForegroundColor Yellow
}

function Write-Error($text) {
    Write-Host "[X] $text" -ForegroundColor Red
}

function Write-Info($text) {
    Write-Host "[i] $text" -ForegroundColor Blue
}

# =====================================================
# Verificar pré-requisitos
# =====================================================
Write-Header "Verificando pré-requisitos"

# Verificar Docker
if (Get-Command docker -ErrorAction SilentlyContinue) {
    $dockerVersion = docker --version
    Write-Success "Docker instalado: $dockerVersion"
} else {
    Write-Error "Docker não encontrado. Instale o Docker Desktop."
    exit 1
}

# Verificar Node.js
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    Write-Success "Node.js instalado: $nodeVersion"
} else {
    Write-Error "Node.js não encontrado. Instale o Node.js 18+."
    exit 1
}

# Verificar pnpm
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    $pnpmVersion = pnpm --version
    Write-Success "pnpm instalado: $pnpmVersion"
} else {
    Write-Warning "pnpm não encontrado. Instalando..."
    npm install -g pnpm
}

# Verificar Python
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonVersion = python --version
    Write-Success "Python instalado: $pythonVersion"
} else {
    Write-Error "Python não encontrado. Instale o Python 3.10+."
    exit 1
}

# =====================================================
# Configurar arquivos .env
# =====================================================
Write-Header "Configurando arquivos de ambiente"

$rootDir = Split-Path -Parent $PSScriptRoot

# Backend .env
$backendEnvExample = Join-Path $rootDir "backend\env.example"
$backendEnv = Join-Path $rootDir "backend\.env"

if (!(Test-Path $backendEnv)) {
    if (Test-Path $backendEnvExample) {
        Copy-Item $backendEnvExample $backendEnv
        Write-Success "Arquivo backend/.env criado a partir do exemplo"
        Write-Warning "IMPORTANTE: Edite backend/.env com suas credenciais!"
    } else {
        Write-Error "Arquivo backend/env.example não encontrado"
    }
} else {
    Write-Info "Arquivo backend/.env já existe"
}

# Frontend .env
$frontendEnvExample = Join-Path $rootDir "vet-crm\.env.example"
$frontendEnv = Join-Path $rootDir "vet-crm\.env.local"

if (!(Test-Path $frontendEnv)) {
    if (Test-Path $frontendEnvExample) {
        Copy-Item $frontendEnvExample $frontendEnv
        Write-Success "Arquivo vet-crm/.env.local criado a partir do exemplo"
    } else {
        # Criar .env.local básico
        @"
# Frontend Environment
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=development-secret-change-in-production

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3001
"@ | Out-File -FilePath $frontendEnv -Encoding UTF8
        Write-Success "Arquivo vet-crm/.env.local criado com valores padrão"
    }
} else {
    Write-Info "Arquivo vet-crm/.env.local já existe"
}

# AI Service .env
$aiServiceEnvExample = Join-Path $rootDir "ai-service\.env.example"
$aiServiceEnv = Join-Path $rootDir "ai-service\.env"

if (!(Test-Path $aiServiceEnv)) {
    if (Test-Path $aiServiceEnvExample) {
        Copy-Item $aiServiceEnvExample $aiServiceEnv
        Write-Success "Arquivo ai-service/.env criado a partir do exemplo"
    }
} else {
    Write-Info "Arquivo ai-service/.env já existe"
}

# =====================================================
# Iniciar Docker (PostgreSQL + Redis)
# =====================================================
Write-Header "Iniciando serviços Docker"

Set-Location $rootDir

# Verificar se Docker está rodando
$dockerStatus = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker não está rodando. Inicie o Docker Desktop."
    exit 1
}

# Iniciar containers
Write-Info "Iniciando PostgreSQL, Redis e ferramentas..."
docker-compose -f docker-compose.dev.yml up -d postgres redis adminer redis-commander

if ($LASTEXITCODE -eq 0) {
    Write-Success "Containers iniciados com sucesso!"
    Write-Info "PostgreSQL: localhost:5433"
    Write-Info "Redis: localhost:6380"
    Write-Info "Adminer (DB GUI): http://localhost:8080"
    Write-Info "Redis Commander: http://localhost:8081"
} else {
    Write-Error "Erro ao iniciar containers"
    exit 1
}

# Aguardar PostgreSQL estar pronto
Write-Info "Aguardando PostgreSQL estar pronto..."
$maxAttempts = 30
$attempt = 0
do {
    Start-Sleep -Seconds 1
    $attempt++
    $pgReady = docker exec emporio-postgres-dev pg_isready -U emporio 2>&1
} while ($LASTEXITCODE -ne 0 -and $attempt -lt $maxAttempts)

if ($attempt -ge $maxAttempts) {
    Write-Error "PostgreSQL não iniciou a tempo"
    exit 1
}
Write-Success "PostgreSQL está pronto!"

# =====================================================
# Instalar dependências
# =====================================================
Write-Header "Instalando dependências"

# Backend
Write-Info "Instalando dependências do backend..."
Set-Location (Join-Path $rootDir "backend")
pnpm install
if ($LASTEXITCODE -eq 0) {
    Write-Success "Dependências do backend instaladas"
} else {
    Write-Error "Erro ao instalar dependências do backend"
}

# Frontend
Write-Info "Instalando dependências do frontend..."
Set-Location (Join-Path $rootDir "vet-crm")
pnpm install
if ($LASTEXITCODE -eq 0) {
    Write-Success "Dependências do frontend instaladas"
} else {
    Write-Error "Erro ao instalar dependências do frontend"
}

# AI Service
Write-Info "Instalando dependências do AI Service..."
Set-Location (Join-Path $rootDir "ai-service")
if (Test-Path "venv") {
    Write-Info "Virtual environment já existe"
} else {
    python -m venv venv
    Write-Success "Virtual environment criado"
}
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
if ($LASTEXITCODE -eq 0) {
    Write-Success "Dependências do AI Service instaladas"
} else {
    Write-Error "Erro ao instalar dependências do AI Service"
}
deactivate

# =====================================================
# Executar migrations do Prisma
# =====================================================
Write-Header "Executando migrations do banco de dados"

Set-Location (Join-Path $rootDir "backend")
Write-Info "Gerando client Prisma..."
pnpm prisma generate
Write-Info "Executando migrations..."
pnpm prisma db push
if ($LASTEXITCODE -eq 0) {
    Write-Success "Banco de dados configurado!"
} else {
    Write-Warning "Erro nas migrations. Verifique a conexão com o banco."
}

# =====================================================
# Resumo final
# =====================================================
Write-Header "Setup concluído!"

Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Configure suas credenciais do WhatsApp no arquivo:" -ForegroundColor White
Write-Host "   backend/.env" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Inicie os serviços em terminais separados:" -ForegroundColor White
Write-Host ""
Write-Host "   Terminal 1 (Backend):" -ForegroundColor Gray
Write-Host "   cd backend && pnpm run start:dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Terminal 2 (AI Service):" -ForegroundColor Gray
Write-Host "   cd ai-service && .\venv\Scripts\Activate.ps1 && uvicorn app.main:app --reload --port 8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Terminal 3 (Frontend):" -ForegroundColor Gray
Write-Host "   cd vet-crm && pnpm dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Para expor o webhook (necessário para receber mensagens):" -ForegroundColor White
Write-Host "   ngrok http 3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Acesse o sistema:" -ForegroundColor White
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Gray
Write-Host "   Backend API: http://localhost:3001" -ForegroundColor Gray
Write-Host "   AI Service: http://localhost:8000" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Configure as integrações em:" -ForegroundColor White
Write-Host "   http://localhost:3000/dashboard/ai-agents/conexoes" -ForegroundColor Cyan
Write-Host ""

Set-Location $rootDir
