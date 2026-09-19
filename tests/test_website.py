"""Smoke tests for the integrated browser frontend."""
from fastapi.testclient import TestClient
from app.main import create_app


def test_homepage_is_served(tmp_path):
    with TestClient(create_app(str(tmp_path / "test.db"))) as client:
        r = client.get("/")
        assert r.status_code == 200
        assert "mesa." in r.text
        assert 'id="search-form"' in r.text
        assert 'id="saved-dialog"' in r.text


def test_frontend_assets_available(tmp_path):
    with TestClient(create_app(str(tmp_path / "test.db"))) as client:
        for path, content_type in [
            ("/static/styles.css", "text/css"),
            ("/static/app.js", "javascript"),
        ]:
            result = client.get(path)
            assert result.status_code == 200
            assert content_type in result.headers["content-type"]
            assert len(result.content) > 1000
