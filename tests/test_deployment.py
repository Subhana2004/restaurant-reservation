"""Smoke tests: never crash the website if production storage isn't configured."""
from fastapi.testclient import TestClient
from app.main import create_app


def test_entrypoint_exports_app():
    from index import app
    assert app.title == "Restaurant Reservation API"


def test_explicit_local_path_uses_sqlite(tmp_path):
    with TestClient(create_app(str(tmp_path / "test.db"))) as client:
        assert client.get("/health").json()["storage"] == "sqlite"


def test_serverless_missing_database_preserves_website(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.delenv("DATABASE_URL", raising=False)
    with TestClient(create_app()) as client:
        assert client.get("/").status_code == 200
        assert client.get("/static/app.js").status_code == 200
        assert client.get("/health").json() == {
            "status": "setup_required", "storage": "unconfigured"
        }
        response = client.get("/restaurants")
        assert response.status_code == 503
        assert "DATABASE_URL" in response.json()["detail"]
        assert client.post("/reservations", json={
            "restaurant_id": 1, "date": "2030-06-01", "time": "19:00", "guests": 2
        }).status_code == 503
        assert client.delete("/reservations/1").status_code == 503
