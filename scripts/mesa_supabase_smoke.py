"""Verify all four Mesa assignment features against the real Supabase backend.

The GitHub Actions smoke runs only on the Mesa V8 branch. Reservations created
for this test are cancelled in finally, leaving no active seats occupied.
"""
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.main import create_app


def main():
    from os import environ

    environ["VERCEL"] = "1"
    environ.pop("DATABASE_URL", None)

    # Remote future slot: minimizes conflict with visitor demo bookings.
    day = (datetime.now(timezone.utc) + timedelta(days=480)).date().isoformat()
    time = "04:37"
    slot = {"restaurant_id": 1, "date": day, "time": time}
    created_ids = []

    with TestClient(create_app()) as client:

        def availability(party=1):
            response = client.get("/restaurants", params={
                "date": day, "time": time, "guests": party
            })
            assert response.status_code == 200, response.text
            places = response.json()
            assert len(places) == 3, places
            place = next(row for row in places if row["id"] == 1)
            assert place["capacity"] == 20, place
            return place

        def booking(party):
            response = client.post("/reservations", json={
                **slot, "guests": party
            })
            assert response.status_code == 201, response.text
            record = response.json()
            assert record["status"] == "active" and record["guests"] == party
            created_ids.append(record["id"])
            return record

        def cancel(id):
            response = client.delete(f"/reservations/{id}")
            assert response.status_code == 204, response.text
            result = client.get(f"/reservations/{id}")
            assert result.status_code == 200 and result.json()["status"] == "cancelled"

        assert client.get("/health").json() == {
            "status": "ok", "storage": "supabase"
        }

        # Requirement 1: view all restaurants and their live availability.
        initial = availability(2)
        remaining = initial["available_seats"]
        assert 0 < remaining <= initial["capacity"], initial

        try:
            # Requirement 4: refuse a booking greater than remaining capacity.
            oversized = client.post("/reservations", json={
                **slot, "guests": remaining + 1
            })
            assert oversized.status_code == 409, oversized.text

            # Requirement 2: booking uses restaurant, UTC date, time and guests.
            confirmed = booking(remaining)
            lookup = client.get(f"/reservations/{confirmed['id']}")
            assert lookup.status_code == 200 and lookup.json() == confirmed

            full = availability(1)
            assert full["available_seats"] == 0
            assert full["can_accommodate"] is False

            # Requirement 4 again: a fresh request cannot overbook a full slot.
            rejected = client.post("/reservations", json={**slot, "guests": 1})
            assert rejected.status_code == 409, rejected.text

            # Requirement 3: cancellation releases capacity but keeps history.
            cancel(confirmed["id"])
            created_ids.remove(confirmed["id"])
            restored = availability(remaining)
            assert restored["available_seats"] == remaining, restored
            assert restored["can_accommodate"] is True

            # The newly freed seat is really bookable, not just visual state.
            replacement = booking(1)
            assert availability(1)["available_seats"] == remaining - 1
            cancel(replacement["id"])
            created_ids.remove(replacement["id"])
            assert availability(remaining)["available_seats"] == remaining
        finally:
            for reservation_id in created_ids:
                cancel(reservation_id)

    print("MESA FOUR REQUIREMENTS PASS: restaurant listing, create, cancel,")
    print("capacity 409, persisted lookup and released-seat rebooking.")


if __name__ == "__main__":
    main()
