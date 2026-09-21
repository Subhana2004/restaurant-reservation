"""Supabase-backed V8 contract. All browser features stay on FastAPI routes."""
import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app import supabase_storage
from app.main import create_app


def test_supabase_rpc_publishable_key_and_canonical_payload(monkeypatch):
    captured = []

    def handler(request):
        captured.append(request)
        assert request.url.path == "/rest/v1/rpc/mesa_api_restaurants"
        assert request.headers.get("apikey", "").startswith("sb_publishable_")
        assert "authorization" not in request.headers
        assert json.loads(request.content) == {
            "p_date": "2030-04-12", "p_time": "19:00", "p_guests": 4
        }
        return httpx.Response(200, json=[{
            "id": 1, "name": "Olive Garden Bistro",
            "capacity": 20, "available_seats": 20, "can_accommodate": True
        }])

    transport = httpx.MockTransport(handler)
    real_client = httpx.Client
    monkeypatch.setattr(
        supabase_storage.httpx, "Client",
        lambda **kwargs: real_client(transport=transport, **kwargs)
    )
    from datetime import date
    assert supabase_storage.restaurants(date(2030, 4, 12), "19:00", 4)[0]["available_seats"] == 20
    assert len(captured) == 1


def test_supabase_error_is_mapped_without_leaking_database_details(monkeypatch):
    real_client = httpx.Client
    transport = httpx.MockTransport(lambda _: httpx.Response(
        409, json={"message": "not enough seats available for this date and time"}
    ))
    monkeypatch.setattr(
        supabase_storage.httpx, "Client",
        lambda **kwargs: real_client(transport=transport, **kwargs)
    )
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc:
        supabase_storage.cancel(12)
    assert exc.value.status_code == 409
    assert "not enough seats" in exc.value.detail


def test_vercel_uses_durable_supabase_routes_with_no_login(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.delenv("DATABASE_URL", raising=False)
    records = {}
    calls = []

    def fake_rpc(op, data):
        calls.append((op, data))
        if op == "restaurants":
            return [{"id": 1, "name": "Olive Garden Bistro", "capacity": 20,
                     "available_seats": 20, "can_accommodate": True}]
        if op == "create":
            r = {"id": 87, "restaurant_id": data["p_restaurant_id"],
                 "date": data["p_date"], "time": data["p_time"],
                 "guests": data["p_guests"], "status": "active"}
            records[87] = r
            return r
        if op == "get":
            return records[data["p_id"]]
        if op == "cancel":
            records[data["p_id"]]["status"] = "cancelled"
            return {"cancelled": True}
        raise AssertionError(op)

    monkeypatch.setattr(supabase_storage, "rpc", fake_rpc)
    with TestClient(create_app()) as client:
        assert client.get("/health").json() == {"status": "ok", "storage": "supabase"}
        results = client.get("/restaurants", params={
            "date": "2030-04-12", "time": "19:00", "guests": 3
        })
        assert results.status_code == 200
        assert results.json()[0]["available_seats"] == 20
        booking = client.post("/reservations", json={
            "restaurant_id": 1, "date": "2030-04-12",
            "time": "19:00", "guests": 3
        })
        assert booking.status_code == 201
        assert booking.json()["id"] == 87
        assert client.get("/reservations/87").json()["status"] == "active"
        assert client.delete("/reservations/87").status_code == 204
        assert client.get("/reservations/87").json()["status"] == "cancelled"
        assert [x[0] for x in calls] == [
            "restaurants", "create", "get", "cancel", "get"
        ]
