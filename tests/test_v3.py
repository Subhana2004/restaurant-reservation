"""Mesa V3 is served separately and reuses the real reservation API."""
from fastapi.testclient import TestClient
from app.main import create_app


def test_v3_page_and_assets_keep_prior_versions(tmp_path):
    with TestClient(create_app(str(tmp_path / "mesa_v3.db"))) as client:
        assert client.get("/").status_code == 200
        assert client.get("/v2").status_code == 200
        page = client.get("/v3")
        assert page.status_code == 200
        assert "Good things" in page.text
        for name in ("search-form", "restaurant-grid", "booking-dialog", "reservations-dialog", "cancel-dialog", "open-reservations"):
            assert f'id="{name}"' in page.text
        assert client.get("/v3/").status_code == 200
        assert client.get("/v3-assets/app.js").status_code == 200
        assert client.get("/v3-assets/styles.css").status_code == 200
        assert client.get("/v2-assets/olive.svg").status_code == 200
        assert len(client.get("/restaurants").json()) == 3
        assert client.get("/docs").status_code == 200
