"""Smoke tests for the integrated browser frontend."""
from fastapi.testclient import TestClient
from app.main import create_app


def test_homepage_is_served(tmp_path):
    with TestClient(create_app(str(tmp_path / "test.db"))) as client:
        r = client.get("/")
        assert r.status_code == 200
        assert "mesa." in r.text
        assert 'id="search-form"' in r.text
        assert 'id="booking-dialog"' in r.text


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


def test_v2_page_and_custom_assets(tmp_path):
    """V2 is separate, and all referenced assets are served by FastAPI."""
    with TestClient(create_app(str(tmp_path / "v2.db"))) as client:
        first = client.get("/")
        for page in ("/v2", "/v2/"):
            response = client.get(page)
            assert response.status_code == 200
            assert "A little more" in response.text
            assert 'id="restaurant-grid"' in response.text
            assert response.text != first.text
        for path, mimetype in (
            ("/v2-assets/styles.css", "text/css"),
            ("/v2-assets/app.js", "javascript"),
            ("/v2-assets/hero-table.svg", "image/svg+xml"),
            ("/v2-assets/olive.svg", "image/svg+xml"),
            ("/v2-assets/spice.svg", "image/svg+xml"),
            ("/v2-assets/seaside.svg", "image/svg+xml"),
            ("/v2-assets/favicon.svg", "image/svg+xml"),
        ):
            response = client.get(path)
            assert response.status_code == 200, path
            assert mimetype in response.headers["content-type"], path
            assert response.content
