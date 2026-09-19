"""Mesa V2 frontend integration smoke tests, preserving V1 and API routes."""
from fastapi.testclient import TestClient
from app.main import create_app


def test_v2_page_assets_and_original_page(tmp_path):
    with TestClient(create_app(str(tmp_path / "v2.db"))) as client:
        assert client.get("/").status_code == 200
        response = client.get("/v2")
        assert response.status_code == 200
        assert "A little more" in response.text
        assert 'id="restaurant-grid"' in response.text
        assert 'id="booking-dialog"' in response.text
        assert 'id="reservations-dialog"' in response.text
        assert client.get("/v2/").status_code == 200

        for path, content_type in (
            ("/v2-assets/styles.css", "text/css"),
            ("/v2-assets/app.js", "javascript"),
            ("/v2-assets/hero-table.svg", "image/svg+xml"),
            ("/v2-assets/olive.svg", "image/svg+xml"),
            ("/v2-assets/spice.svg", "image/svg+xml"),
            ("/v2-assets/seaside.svg", "image/svg+xml"),
        ):
            file = client.get(path)
            assert file.status_code == 200
            assert content_type in file.headers["content-type"]
            assert file.content


def test_v2_uses_same_reservation_api(tmp_path):
    with TestClient(create_app(str(tmp_path / "booking.db"))) as client:
        assert len(client.get("/restaurants").json()) == 3
        assert client.get("/v2").status_code == 200
        assert client.get("/docs").status_code == 200
