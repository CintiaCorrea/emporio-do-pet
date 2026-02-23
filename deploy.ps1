# =====================================================
# Deploy Script - Empório do Pet
# =====================================================
# Usage: .\deploy.ps1 [all|backend|ai|db]
# =====================================================

param(
    [Parameter(Position=0)]
    [ValidateSet("all", "backend", "ai", "db", "redis", "setup")]
    [string]$Target = "all"
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Yellow
}

# Check if fly is installed
if (-not (Get-Command fly -ErrorAction SilentlyContinue)) {
    Write-Host "Fly CLI not found. Installing..." -ForegroundColor Yellow
    powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
}

# Check if logged in
$authStatus = fly auth whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Please login to Fly.io first:" -ForegroundColor Yellow
    fly auth login
}

switch ($Target) {
    "setup" {
        Write-Step "Setting up Fly.io infrastructure..."
        
        # Create Postgres
        Write-Host "Creating PostgreSQL database..." -ForegroundColor Yellow
        fly postgres create --name emporio-pet-db --region gru --initial-cluster-size 1 --vm-size shared-cpu-1x --volume-size 1
        
        # Create Redis
        Write-Host "Creating Redis (via Upstash)..." -ForegroundColor Yellow
        fly redis create --name emporio-pet-redis --region gru
        
        # Create apps
        Write-Host "Creating backend app..." -ForegroundColor Yellow
        fly apps create emporio-pet-api --org personal
        
        Write-Host "Creating AI service app..." -ForegroundColor Yellow
        fly apps create emporio-pet-ai --org personal
        
        # Attach Postgres to backend
        Write-Host "Attaching Postgres to backend..." -ForegroundColor Yellow
        fly postgres attach emporio-pet-db --app emporio-pet-api
        
        Write-Success "Infrastructure setup complete!"
        Write-Warning "IMPORTANT: Configure secrets before deploying:"
        Write-Host "  fly secrets set JWT_SECRET='...' --app emporio-pet-api"
        Write-Host "  fly secrets set OPENAI_API_KEY='...' --app emporio-pet-api"
        Write-Host "  fly secrets set OPENAI_API_KEY='...' --app emporio-pet-ai"
        Write-Host "  fly secrets set AI_SERVICE_URL='https://emporio-pet-ai.fly.dev' --app emporio-pet-api"
        Write-Host "  fly secrets set REDIS_URL='...' --app emporio-pet-api"
    }
    
    "db" {
        Write-Step "Creating/Managing PostgreSQL..."
        fly postgres create --name emporio-pet-db --region gru --initial-cluster-size 1 --vm-size shared-cpu-1x --volume-size 1
    }
    
    "redis" {
        Write-Step "Creating Redis..."
        fly redis create --name emporio-pet-redis --region gru
    }
    
    "ai" {
        Write-Step "Deploying AI Service (FastAPI)..."
        Push-Location ai-service
        try {
            fly deploy --app emporio-pet-ai
            Write-Success "AI Service deployed successfully!"
            Write-Host "URL: https://emporio-pet-ai.fly.dev" -ForegroundColor Cyan
        }
        finally {
            Pop-Location
        }
    }
    
    "backend" {
        Write-Step "Deploying Backend (NestJS)..."
        Push-Location backend
        try {
            fly deploy --app emporio-pet-api
            Write-Success "Backend deployed successfully!"
            Write-Host "URL: https://emporio-pet-api.fly.dev" -ForegroundColor Cyan
        }
        finally {
            Pop-Location
        }
    }
    
    "all" {
        Write-Step "Deploying All Services..."
        
        # Deploy AI Service first (backend depends on it)
        Write-Host ""
        Write-Host "1/2 - Deploying AI Service..." -ForegroundColor Yellow
        Push-Location ai-service
        try {
            fly deploy --app emporio-pet-ai
            Write-Success "AI Service deployed!"
        }
        finally {
            Pop-Location
        }
        
        # Deploy Backend
        Write-Host ""
        Write-Host "2/2 - Deploying Backend..." -ForegroundColor Yellow
        Push-Location backend
        try {
            fly deploy --app emporio-pet-api
            Write-Success "Backend deployed!"
        }
        finally {
            Pop-Location
        }
        
        Write-Step "All services deployed successfully!"
        Write-Host ""
        Write-Host "URLs:" -ForegroundColor Cyan
        Write-Host "  Backend:    https://emporio-pet-api.fly.dev" -ForegroundColor White
        Write-Host "  AI Service: https://emporio-pet-ai.fly.dev" -ForegroundColor White
        Write-Host "  API Docs:   https://emporio-pet-api.fly.dev/api/docs" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
