# =====================================================
# Empório do Pet - Teste de Integrações
# =====================================================
# Execute este script para testar todas as integrações
# PowerShell: .\scripts\test-integrations.ps1
# =====================================================

param(
    [string]$BackendUrl = "http://localhost:3001",
    [string]$AiServiceUrl = "http://localhost:8000",
    [string]$FrontendUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Continue"

function Write-Header($text) {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host $text -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
}

function Write-TestResult($name, $success, $message) {
    if ($success) {
        Write-Host "[PASS] $name" -ForegroundColor Green
        if ($message) {
            Write-Host "       $message" -ForegroundColor Gray
        }
    } else {
        Write-Host "[FAIL] $name" -ForegroundColor Red
        if ($message) {
            Write-Host "       $message" -ForegroundColor Yellow
        }
    }
}

function Test-Endpoint($url, $name, $timeout = 10) {
    try {
        $response = Invoke-WebRequest -Uri $url -TimeoutSec $timeout -UseBasicParsing -ErrorAction Stop
        $statusCode = $response.StatusCode
        return @{
            Success = ($statusCode -ge 200 -and $statusCode -lt 300)
            Message = "Status: $statusCode"
            Data = $response.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
        }
    } catch {
        return @{
            Success = $false
            Message = $_.Exception.Message
            Data = $null
        }
    }
}

Write-Header "Teste de Integrações - Empório do Pet"
Write-Host "Backend URL: $BackendUrl" -ForegroundColor Gray
Write-Host "AI Service URL: $AiServiceUrl" -ForegroundColor Gray
Write-Host "Frontend URL: $FrontendUrl" -ForegroundColor Gray

# =====================================================
# Teste 1: Backend Health
# =====================================================
Write-Header "1. Backend (NestJS)"

$result = Test-Endpoint "$BackendUrl/health" "Health Check básico"
Write-TestResult "Health Check básico" $result.Success $result.Message

$result = Test-Endpoint "$BackendUrl/health/detailed" "Health Check detalhado"
Write-TestResult "Health Check detalhado" $result.Success $result.Message
if ($result.Data -and $result.Data.checks) {
    Write-Host ""
    Write-Host "Detalhes dos serviços:" -ForegroundColor Yellow
    $result.Data.checks.PSObject.Properties | ForEach-Object {
        $svc = $_.Name
        $status = $_.Value.status
        $msg = $_.Value.message
        $latency = $_.Value.latency
        $color = if ($status -eq "ok") { "Green" } elseif ($status -eq "not_configured") { "Yellow" } else { "Red" }
        $latencyStr = if ($latency) { " (${latency}ms)" } else { "" }
        Write-Host "  - $svc: $status$latencyStr" -ForegroundColor $color
        if ($msg -and $status -ne "ok") {
            Write-Host "    $msg" -ForegroundColor Gray
        }
    }
}

$result = Test-Endpoint "$BackendUrl/health/ready" "Readiness Check"
Write-TestResult "Readiness Check" $result.Success $result.Message

# =====================================================
# Teste 2: AI Service (FastAPI)
# =====================================================
Write-Header "2. AI Service (FastAPI)"

$result = Test-Endpoint "$AiServiceUrl/health" "Health Check"
Write-TestResult "Health Check" $result.Success $result.Message

$result = Test-Endpoint "$AiServiceUrl/docs" "Swagger Docs"
Write-TestResult "Swagger Docs disponível" $result.Success $result.Message

$result = Test-Endpoint "$AiServiceUrl/v1/agents/capabilities" "Capabilities endpoint"
Write-TestResult "Capabilities endpoint" $result.Success $result.Message

# =====================================================
# Teste 3: Frontend (Next.js)
# =====================================================
Write-Header "3. Frontend (Next.js)"

$result = Test-Endpoint "$FrontendUrl" "Página inicial"
Write-TestResult "Página inicial" $result.Success $result.Message

$result = Test-Endpoint "$FrontendUrl/api/auth/session" "API Auth"
Write-TestResult "API Auth disponível" $result.Success $result.Message

# =====================================================
# Teste 4: Docker Services
# =====================================================
Write-Header "4. Docker Services"

# PostgreSQL
try {
    $pgResult = docker exec emporio-postgres-dev pg_isready -U emporio 2>&1
    $pgSuccess = $LASTEXITCODE -eq 0
    Write-TestResult "PostgreSQL" $pgSuccess $pgResult
} catch {
    Write-TestResult "PostgreSQL" $false "Container não encontrado"
}

# Redis
try {
    $redisResult = docker exec emporio-redis-dev redis-cli ping 2>&1
    $redisSuccess = $redisResult -eq "PONG"
    Write-TestResult "Redis" $redisSuccess $redisResult
} catch {
    Write-TestResult "Redis" $false "Container não encontrado"
}

# =====================================================
# Teste 5: Endpoints críticos do Backend
# =====================================================
Write-Header "5. Endpoints do Backend"

$endpoints = @(
    @{ Path = "/api/docs"; Name = "Swagger API Docs" },
    @{ Path = "/agents"; Name = "Agents (requer auth)" },
    @{ Path = "/templates"; Name = "Templates (requer auth)" },
    @{ Path = "/automations"; Name = "Automations (requer auth)" },
    @{ Path = "/whatsapp-templates"; Name = "WhatsApp Templates (requer auth)" }
)

foreach ($ep in $endpoints) {
    $result = Test-Endpoint "$BackendUrl$($ep.Path)" $ep.Name
    # 401 é esperado para endpoints que requerem auth
    $isOk = $result.Success -or ($result.Message -match "401")
    $msg = if ($result.Message -match "401") { "OK (requer autenticação)" } else { $result.Message }
    Write-TestResult $ep.Name $isOk $msg
}

# =====================================================
# Resumo
# =====================================================
Write-Header "Resumo"

Write-Host ""
Write-Host "URLs importantes:" -ForegroundColor Yellow
Write-Host "  Frontend:        $FrontendUrl" -ForegroundColor White
Write-Host "  Backend API:     $BackendUrl" -ForegroundColor White
Write-Host "  Swagger Docs:    $BackendUrl/api/docs" -ForegroundColor White
Write-Host "  AI Service:      $AiServiceUrl" -ForegroundColor White
Write-Host "  AI Service Docs: $AiServiceUrl/docs" -ForegroundColor White
Write-Host ""
Write-Host "Página de configuração de integrações:" -ForegroundColor Yellow
Write-Host "  $FrontendUrl/dashboard/ai-agents/conexoes" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para testar WhatsApp com webhook:" -ForegroundColor Yellow
Write-Host "  1. Execute: ngrok http 3001" -ForegroundColor White
Write-Host "  2. Configure o webhook no Meta Developer:" -ForegroundColor White
Write-Host "     URL: https://[seu-ngrok]/webhook/whatsapp" -ForegroundColor Cyan
Write-Host "     Verify Token: (o token configurado no .env)" -ForegroundColor Gray
Write-Host ""
