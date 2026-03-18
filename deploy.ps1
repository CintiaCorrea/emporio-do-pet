# =====================================================
# Deploy Script - Empório do Pet (Fly.io)
# =====================================================
# Usage: .\deploy.ps1 [all|backend|ai|db|redis|setup|secrets|status]
# =====================================================

param(
    [Parameter(Position=0)]
    [ValidateSet("all", "backend", "ai", "db", "redis", "setup", "secrets", "status")]
    [string]$Target = "all"
)

$ErrorActionPreference = "Stop"

# =====================================================
# App names and region
# =====================================================
$BACKEND_APP  = "emporio-pet-api"
$AI_APP       = "emporio-pet-ai"
$DB_APP       = "emporio-pet-db"
$REDIS_APP    = "emporio-pet-redis"
$REGION       = "gru"

# =====================================================
# Helper functions
# =====================================================
function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host " $Message" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[!] $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "    $Message" -ForegroundColor White
}

# =====================================================
# Pre-flight checks
# =====================================================
if (-not (Get-Command fly -ErrorAction SilentlyContinue)) {
    Write-Host "Fly CLI not found. Installing..." -ForegroundColor Yellow
    powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
    Write-Host "Restart your terminal after installation." -ForegroundColor Yellow
    exit 1
}

$authStatus = fly auth whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Not logged in to Fly.io. Opening browser..."
    fly auth login
}

Write-Host "Logged in as: $(fly auth whoami)" -ForegroundColor Gray

# =====================================================
# Targets
# =====================================================
switch ($Target) {

    # -------------------------------------------------
    # SETUP - Create all infrastructure from scratch
    # -------------------------------------------------
    "setup" {
        Write-Step "1/5 - Creating PostgreSQL database..."
        fly postgres create `
            --name $DB_APP `
            --region $REGION `
            --initial-cluster-size 1 `
            --vm-size shared-cpu-1x `
            --volume-size 1
        Write-Success "PostgreSQL created: $DB_APP"
        Write-Warning "SAVE the credentials shown above!"
        Write-Host ""

        Write-Step "2/5 - Creating Redis (Upstash)..."
        fly redis create --name $REDIS_APP --region $REGION --no-replicas
        Write-Success "Redis created: $REDIS_APP"
        Write-Warning "SAVE the Redis URL shown above!"
        Write-Host ""

        Write-Step "3/5 - Creating backend app..."
        fly apps create $BACKEND_APP --org personal
        Write-Success "Backend app created: $BACKEND_APP"

        Write-Step "4/5 - Creating AI service app..."
        fly apps create $AI_APP --org personal
        Write-Success "AI service app created: $AI_APP"

        Write-Step "5/5 - Attaching PostgreSQL to backend..."
        fly postgres attach $DB_APP --app $BACKEND_APP
        Write-Success "PostgreSQL attached to backend (DATABASE_URL auto-configured)"

        Write-Host ""
        Write-Step "Infrastructure setup complete!"
        Write-Host ""
        Write-Warning "NEXT STEPS - Configure secrets:"
        Write-Host ""
        Write-Info "1. Set DIRECT_URL on backend (same as DATABASE_URL but port 5433):"
        Write-Info "   fly secrets set DIRECT_URL='postgres://postgres:SENHA@$DB_APP.flycast:5433/postgres' --app $BACKEND_APP"
        Write-Host ""
        Write-Info "2. Set DATABASE_URL on AI service (for pgvector/RAG):"
        Write-Info "   fly secrets set DATABASE_URL='postgres://postgres:SENHA@$DB_APP.flycast:5432/postgres' --app $AI_APP"
        Write-Host ""
        Write-Info "3. Set remaining secrets:"
        Write-Info "   fly secrets set JWT_SECRET='...' REDIS_URL='...' OPENAI_API_KEY='...' --app $BACKEND_APP"
        Write-Info "   fly secrets set OPENAI_API_KEY='...' GEMINI_API_KEY='...' --app $AI_APP"
        Write-Host ""
        Write-Info "Or run: .\deploy.ps1 secrets"
    }

    # -------------------------------------------------
    # DB - Create PostgreSQL only
    # -------------------------------------------------
    "db" {
        Write-Step "Creating PostgreSQL..."
        fly postgres create `
            --name $DB_APP `
            --region $REGION `
            --initial-cluster-size 1 `
            --vm-size shared-cpu-1x `
            --volume-size 1
        Write-Success "PostgreSQL created: $DB_APP"
    }

    # -------------------------------------------------
    # REDIS - Create Redis only
    # -------------------------------------------------
    "redis" {
        Write-Step "Creating Redis (Upstash)..."
        fly redis create --name $REDIS_APP --region $REGION --no-replicas
        Write-Success "Redis created: $REDIS_APP"
    }

    # -------------------------------------------------
    # SECRETS - Interactive secrets configuration
    # -------------------------------------------------
    "secrets" {
        Write-Step "Configuring secrets..."
        Write-Host ""

        # Backend secrets
        Write-Host "--- Backend ($BACKEND_APP) ---" -ForegroundColor Yellow

        $jwtSecret = Read-Host "JWT_SECRET (min 32 chars)"
        if ($jwtSecret) {
            fly secrets set JWT_SECRET="$jwtSecret" --app $BACKEND_APP
        }

        $redisUrl = Read-Host "REDIS_URL (redis://default:PASS@host:port)"
        if ($redisUrl) {
            fly secrets set REDIS_URL="$redisUrl" --app $BACKEND_APP
        }

        $directUrl = Read-Host "DIRECT_URL (postgres://postgres:PASS@$DB_APP.flycast:5433/postgres)"
        if ($directUrl) {
            fly secrets set DIRECT_URL="$directUrl" --app $BACKEND_APP
        }

        $openaiKey = Read-Host "OPENAI_API_KEY (sk-...)"
        if ($openaiKey) {
            fly secrets set OPENAI_API_KEY="$openaiKey" --app $BACKEND_APP
            fly secrets set OPENAI_API_KEY="$openaiKey" --app $AI_APP
        }

        # AI service secrets
        Write-Host ""
        Write-Host "--- AI Service ($AI_APP) ---" -ForegroundColor Yellow

        $geminiKey = Read-Host "GEMINI_API_KEY (optional, press Enter to skip)"
        if ($geminiKey) {
            fly secrets set GEMINI_API_KEY="$geminiKey" --app $AI_APP
        }

        $deepseekKey = Read-Host "DEEPSEEK_API_KEY (optional, press Enter to skip)"
        if ($deepseekKey) {
            fly secrets set DEEPSEEK_API_KEY="$deepseekKey" --app $AI_APP
        }

        $aiDbUrl = Read-Host "DATABASE_URL for AI service (postgres://postgres:PASS@$DB_APP.flycast:5432/postgres)"
        if ($aiDbUrl) {
            fly secrets set DATABASE_URL="$aiDbUrl" --app $AI_APP
        }

        Write-Host ""
        Write-Success "Secrets configured!"
        Write-Host ""
        Write-Info "Backend secrets:"
        fly secrets list --app $BACKEND_APP
        Write-Host ""
        Write-Info "AI service secrets:"
        fly secrets list --app $AI_APP
    }

    # -------------------------------------------------
    # AI - Deploy AI service only
    # -------------------------------------------------
    "ai" {
        Write-Step "Deploying AI Service (FastAPI)..."
        Push-Location ai-service
        try {
            fly deploy --app $AI_APP
            Write-Success "AI Service deployed!"
            Write-Info "URL: https://$AI_APP.fly.dev"
            Write-Info "Health: https://$AI_APP.fly.dev/health"
        }
        finally {
            Pop-Location
        }
    }

    # -------------------------------------------------
    # BACKEND - Deploy backend only
    # -------------------------------------------------
    "backend" {
        Write-Step "Deploying Backend (NestJS)..."
        Push-Location backend
        try {
            fly deploy --app $BACKEND_APP
            Write-Success "Backend deployed!"
            Write-Info "URL: https://$BACKEND_APP.fly.dev"
            Write-Info "Health: https://$BACKEND_APP.fly.dev/api/health"
        }
        finally {
            Pop-Location
        }
    }

    # -------------------------------------------------
    # ALL - Deploy both services
    # -------------------------------------------------
    "all" {
        Write-Step "Deploying All Services..."

        # Deploy AI Service first (backend depends on it)
        Write-Host ""
        Write-Host "  [1/2] Deploying AI Service (FastAPI)..." -ForegroundColor Yellow
        Push-Location ai-service
        try {
            fly deploy --app $AI_APP
            Write-Success "AI Service deployed!"
        }
        finally {
            Pop-Location
        }

        # Deploy Backend
        Write-Host ""
        Write-Host "  [2/2] Deploying Backend (NestJS)..." -ForegroundColor Yellow
        Push-Location backend
        try {
            fly deploy --app $BACKEND_APP
            Write-Success "Backend deployed!"
        }
        finally {
            Pop-Location
        }

        Write-Step "All services deployed!"
        Write-Host ""
        Write-Info "Backend:     https://$BACKEND_APP.fly.dev"
        Write-Info "AI Service:  https://$AI_APP.fly.dev"
        Write-Info "Health (BE): https://$BACKEND_APP.fly.dev/api/health"
        Write-Info "Health (AI): https://$AI_APP.fly.dev/health"
    }

    # -------------------------------------------------
    # STATUS - Check status of all services
    # -------------------------------------------------
    "status" {
        Write-Step "Checking status of all services..."

        Write-Host ""
        Write-Host "--- PostgreSQL ($DB_APP) ---" -ForegroundColor Yellow
        fly status --app $DB_APP 2>$null
        if ($LASTEXITCODE -ne 0) { Write-Warning "PostgreSQL app not found" }

        Write-Host ""
        Write-Host "--- AI Service ($AI_APP) ---" -ForegroundColor Yellow
        fly status --app $AI_APP 2>$null
        if ($LASTEXITCODE -ne 0) { Write-Warning "AI Service app not found" }

        Write-Host ""
        Write-Host "--- Backend ($BACKEND_APP) ---" -ForegroundColor Yellow
        fly status --app $BACKEND_APP 2>$null
        if ($LASTEXITCODE -ne 0) { Write-Warning "Backend app not found" }

        Write-Host ""
        Write-Step "Health checks..."
        try {
            $aiHealth = Invoke-RestMethod -Uri "https://$AI_APP.fly.dev/health" -TimeoutSec 10
            Write-Success "AI Service: $($aiHealth.status)"
        } catch {
            Write-Warning "AI Service: unreachable"
        }
        try {
            $beHealth = Invoke-RestMethod -Uri "https://$BACKEND_APP.fly.dev/api/health" -TimeoutSec 10
            Write-Success "Backend: $($beHealth.status)"
        } catch {
            Write-Warning "Backend: unreachable"
        }
    }
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
