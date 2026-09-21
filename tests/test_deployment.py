"""Smoke tests: serverless V8 uses Supabase; local tests keep SQLite."""
from fastapi.testclient import TestClient
from app import supabase_storage
from app.main import create_app


def test_entrypoint_exports_app():
    from index import app
    assert app.title == "Restaurant Reservation API"


def test_explicit_local_path_uses_sqlite(tmp_path):
    with TestClient(create_app(str(tmp_path / "test.db"))) as client:
        assert client.get("/health").json()["storage"] == "sqlite"


def test_serverless_supabase_preserves_website_and_reservation_api(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.delenv("DATABASE_URL", raising=False)
    called = []

    def fake_rpc(name, payload):
        called.append(name)
        if name == "restaurants":
            return [{"id": 1, "name": "Olive Garden Bistro", "capacity": 20}]
        if name == "create":
            return {"id": 7, "restaurant_id": 1, "date": payload["p_date"],
                    "time": payload["p_time"], "guests": 2, "status": "active"}
        if name == "cancel":
            return {"cancelled": True}
        return {"id": 7, "restaurant_id": 1, "date": "2030-06-01",
                "time": "19:00", "guests": 2, "status": "active"}

    monkeypatch.setattr(supabase_storage, "rpc", fake_rpc)
    with TestClient(create_app()) as client:
        assert client.get("/").status_code == 200
        assert client.get("/static/app.js").status_code == 200
        assert client.get("/health").json() == {"status": "ok", "storage": "supabase"}
        response = client.get("/restaurants")
        assert response.status_code == 200 and len(response.json()) == 1
        assert client.post("/reservations", json={
            "restaurant_id": 1, "date": "2030-06-01", "time": "19:00", "guests": 2
        }).status_code == 201
        assert client.get("/reservations/7").status_code == 200
        assert client.delete("/reservations/7").status_code == 204
        assert called == ["restaurants", "create", "get", "cancel"]
