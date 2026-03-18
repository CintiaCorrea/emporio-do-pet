# Empório do Pet - AI Service

FastAPI microservice for AI-powered chat completions and agent execution. Supports multiple AI providers (OpenAI, Google Gemini, DeepSeek).

## Features

- **Multi-Provider Support**: OpenAI, Google Gemini, DeepSeek
- **Chat Completions**: Unified API for chat with any provider
- **Agent Execution**: Execute AI agents with system prompts and context
- **Context Variables**: Template substitution in prompts (e.g., `{clinic_name}`)
- **Production Ready**: Docker, Fly.io deployment, health checks

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    NestJS Backend                                │
│                  (emporio-pet-api)                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 FastAPI AI Service                               │
│                  (emporio-pet-ai)                                │
├─────────────────────────────────────────────────────────────────┤
│  POST /v1/chat/completions  - Chat with AI                      │
│  POST /v1/agents/execute    - Execute AI agent                  │
│  GET  /health               - Health check                      │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         ┌─────────┐    ┌─────────┐    ┌──────────┐
         │ OpenAI  │    │ Gemini  │    │ DeepSeek │
         └─────────┘    └─────────┘    └──────────┘
```

## Quick Start

### Prerequisites

- Python 3.12+
- pip or uv package manager

### Local Development

1. **Create virtual environment:**
   ```bash
   cd ai-service
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env if needed
   ```

4. **Run the server:**
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

5. **Access API docs:**
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

## API Endpoints

### Chat Completions

```bash
POST /v1/chat/completions
```

Send a chat completion request to any supported provider.

**Request:**
```json
{
  "provider": "openai",
  "model": "gpt-4o-mini",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "max_tokens": 4096,
  "credentials": {
    "api_key": "sk-..."
  }
}
```

**Response:**
```json
{
  "id": "chatcmpl-abc123",
  "content": "Hello! How can I help you today?",
  "model": "gpt-4o-mini",
  "provider": "openai",
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 10,
    "total_tokens": 30
  },
  "latency_ms": 1234
}
```

### Agent Execution

```bash
POST /v1/agents/execute
```

Execute an AI agent with system prompt and context.

**Request:**
```json
{
  "provider": "openai",
  "model": "gpt-4o-mini",
  "system_prompt": "You are the virtual assistant for {clinic_name}. Help {tutor_name} with their pet {pet_name}.",
  "conversation_history": [],
  "user_message": "I want to schedule an appointment",
  "context": {
    "clinic_name": "Empório do Pet",
    "tutor_name": "Maria",
    "pet_name": "Rex"
  },
  "credentials": {
    "api_key": "sk-..."
  }
}
```

**Response:**
```json
{
  "response": "Hello Maria! I'd be happy to help you schedule an appointment for Rex...",
  "usage": {
    "prompt_tokens": 50,
    "completion_tokens": 30,
    "total_tokens": 80
  },
  "latency_ms": 1500,
  "model": "gpt-4o-mini",
  "provider": "openai"
}
```

### Health Check

```bash
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "production",
  "providers": ["openai", "gemini", "deepseek"]
}
```

## Supported Providers

### OpenAI
- Models: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `gpt-4`, `gpt-3.5-turbo`
- [Documentation](https://platform.openai.com/docs)

### Google Gemini
- Models: `gemini-pro`, `gemini-1.5-pro`, `gemini-1.5-flash`
- [Documentation](https://ai.google.dev/docs)

### DeepSeek
- Models: `deepseek-chat`, `deepseek-coder`
- [Documentation](https://platform.deepseek.com/docs)
- Uses OpenAI-compatible API

## Deployment

### Fly.io

1. **Install Fly CLI:**
   ```bash
   # Windows (PowerShell)
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
   ```

2. **Login to Fly.io:**
   ```bash
   flyctl auth login
   ```

3. **Launch the app:**
   ```bash
   cd ai-service
   flyctl launch --no-deploy --name emporio-pet-ai --region gru
   ```

4. **Deploy:**
   ```bash
   flyctl deploy
   ```

5. **Configure NestJS backend:**
   ```bash
   # Add secret to NestJS app
   flyctl secrets set AI_SERVICE_URL="http://emporio-pet-ai.internal:8080" --app emporio-pet-api
   ```

### Docker

```bash
# Build
docker build -t emporio-pet-ai .

# Run
docker run -p 8080:8080 emporio-pet-ai
```

## Project Structure

```
ai-service/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration settings
│   ├── api/
│   │   ├── deps.py          # Dependencies
│   │   └── v1/
│   │       ├── router.py    # API router
│   │       ├── health.py    # Health endpoints
│   │       ├── chat.py      # Chat endpoints
│   │       └── agents.py    # Agent endpoints
│   ├── core/
│   │   └── providers/
│   │       ├── base.py      # Base provider class
│   │       ├── factory.py   # Provider factory
│   │       ├── openai_provider.py
│   │       ├── gemini_provider.py
│   │       └── deepseek_provider.py
│   ├── schemas/
│   │   ├── common.py        # Shared schemas
│   │   ├── chat.py          # Chat schemas
│   │   └── agent.py         # Agent schemas
│   └── services/
│       ├── chat_service.py
│       └── agent_service.py
├── tests/
├── requirements.txt
├── Dockerfile
├── fly.toml
└── README.md
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ENVIRONMENT` | Environment (development/production) | `development` |
| `LOG_LEVEL` | Logging level (DEBUG/INFO/WARNING/ERROR) | `INFO` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:3000` |
| `PORT` | Server port | `8080` |

## Testing

```bash
# Install dev dependencies
pip install -r requirements-dev.txt

# Run tests
pytest

# Run with coverage
pytest --cov=app
```

## Integration with NestJS

The NestJS backend calls this service through the `AIModule`:

```typescript
// In NestJS
const response = await aiService.chatCompletion(userId, {
  provider: 'openai',
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello' }],
});
```

API credentials are securely retrieved from the user's `IntegrationSettings` in the database.

## License

Private - Empório do Pet
