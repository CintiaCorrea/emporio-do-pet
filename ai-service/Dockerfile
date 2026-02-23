# ========================================
# Build Stage
# ========================================
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --user -r requirements.txt

# ========================================
# Production Stage
# ========================================
FROM python:3.12-slim AS production

WORKDIR /app

# Create non-root user for security
RUN useradd -m -u 1001 appuser

# Copy installed dependencies from builder
COPY --from=builder /root/.local /home/appuser/.local

# Copy application code
COPY app ./app

# Set PATH for user-installed packages
ENV PATH=/home/appuser/.local/bin:$PATH

# Change to non-root user
USER appuser

# Expose port (Fly.io uses 8080)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

# Start command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
