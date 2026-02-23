"""
Health Endpoint Tests
"""


def test_health_check(client):
    """Test the health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "environment" in data


def test_health_ready(client):
    """Test the readiness check endpoint."""
    response = client.get("/v1/health/ready")
    assert response.status_code == 200
    
    data = response.json()
    assert data["ready"] is True


def test_health_live(client):
    """Test the liveness check endpoint."""
    response = client.get("/v1/health/live")
    assert response.status_code == 200
    
    data = response.json()
    assert data["alive"] is True


def test_root_endpoint(client):
    """Test the root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    
    data = response.json()
    assert "service" in data
    assert "version" in data
    assert "health" in data
