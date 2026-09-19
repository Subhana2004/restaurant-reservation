"""Vercel and local storage mode smoke tests."""
import pytest
from fastapi.testclient import TestClient
from app.main import create_app


def test_entrypoint_exports_app():
    from index import app
    assert app.title == "Restaurant Reservation API"


def test_explicit_local_path_uses_sqlite(tmp_path):
    with TestClient(create_app(str(tmp_path / "test.db"))) as client:
        assert client.get("/health").json()["storage"] == "sqlite"


def test_serverless_refuses_ephemeral_sqlite(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.delenv("DATABASE_URL", raising=False)
    with pytest.raises(RuntimeError, match="DATABASE_URL is required"):
        create_app()
