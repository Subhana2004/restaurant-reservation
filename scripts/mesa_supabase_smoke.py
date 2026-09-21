"""One complete *real* anonymous reservation journey against Supabase.

GitHub Actions executes this only on the Mesa V8 backend branch. It creates
one future demonstration booking and cancels it, so no seats remain occupied.
"""
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.main import create_app


def main():
    from os import environ
    environ["VERCEL"] = "1"
    environ.pop("DATABASE_URL", None)
    day = (datetime.now(timezone.utc) + timedelta(days=365)).date().isoformat()
    slot = {"restaurant_id": 1, "date": day, "time": "19:00", "guests": 2}

    with TestClient(create_app()) as client:
        health = client.get("/health")
        assert health.status_code == 200 and health.json()["storage"] == "supabase", health.text

        places = client.get("/restaurants", params={"date": day, "time": "19:00", "guests": 2})
        assert places.status_code == 200, places.text
        assert any(r["id"] == 1 and r["can_accommodate"] for r in places.json()), places.text

        created_id = None
        try:
            booked = client.post("/reservations", json=slot)
            assert booked.status_code == 201, booked.text
            created_id = booked.json()["id"]
            assert booked.json()["status"] == "active"

            lookup = client.get(f"/reservations/{created_id}")
            assert lookup.status_code == 200 and lookup.json()["status"] == "active", lookup.text
        finally:
            if created_id is not None:
                cancelled = client.delete(f"/reservations/{created_id}")
                assert cancelled.status_code == 204, cancelled.text
                lookup = client.get(f"/reservations/{created_id}")
                assert lookup.status_code == 200 and lookup.json()["status"] == "cancelled"

    print("MESA SUPABASE PASS: public listing, real booking, ID lookup and cancellation.")


if __name__ == "__main__":
    main()
