"""End-to-end acceptance test against Mesa's live anonymous Supabase backend.

Exercises every line of the assignment: listing, booking for exact UTC slot,
cancellation/released seats, full capacity (409), and simultaneous attempts
to overbook. All created bookings are cancelled, including on failed tests.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import secrets

from fastapi.testclient import TestClient
from app.main import create_app


def must(response, expected, context):
    assert response.status_code == expected, (
        f"{context}: expected HTTP {expected}, got {response.status_code}: "
        f"{response.text[:300]}"
    )
    return response.json() if expected != 204 else None


def main():
    from os import environ
    environ["VERCEL"] = "1"
    environ.pop("DATABASE_URL", None)
    normal_day = (datetime.now(timezone.utc) + timedelta(days=365)).date().isoformat()
    # Separate from ordinary user dates and other CI executions.
    capacity_day = (
        datetime.now(timezone.utc)
        + timedelta(days=365 * 5 + secrets.randbelow(365 * 50))
    ).date().isoformat()

    with TestClient(create_app()) as client:
        health = must(client.get("/health"), 200, "health")
        assert health["storage"] == "supabase"

        normal = {"restaurant_id": 1, "date": normal_day,
                  "time": "19:00", "guests": 2}
        places = must(client.get("/restaurants", params={
            "date": normal_day, "time": "19:00", "guests": 2
        }), 200, "restaurant listing")
        assert len(places) == 3
        assert any(r["id"] == 1 and r["can_accommodate"] for r in places)

        created = []
        def reserve(day, time, guests):
            response = client.post("/reservations", json={
                "restaurant_id": 1, "date": day, "time": time, "guests": guests
            })
            if response.status_code == 201:
                created.append(response.json()["id"])
            return response

        try:
            booked = must(reserve(normal_day, "19:00", 2), 201, "regular booking")
            assert booked["status"] == "active"
            assert booked["date"] == normal_day
            assert booked["time"] == "19:00" and booked["guests"] == 2
            record = must(client.get(f"/reservations/{booked['id']}"),
                          200, "reservation lookup")
            assert record["status"] == "active" and record["id"] == booked["id"]

            must(client.delete(f"/reservations/{booked['id']}"), 204,
                 "regular cancellation")
            created.remove(booked["id"])
            cancelled = must(client.get(f"/reservations/{booked['id']}"),
                             200, "cancelled reservation lookup")
            assert cancelled["status"] == "cancelled"

            # Restaurant 1's seeded capacity is 20. Fill the exact slot.
            full = must(reserve(capacity_day, "19:00", 20), 201, "capacity booking")
            remaining = must(client.get("/restaurants", params={
                "date": capacity_day, "time": "19:00", "guests": 1
            }), 200, "full slot lookup")
            first = next(r for r in remaining if r["id"] == 1)
            assert first["capacity"] == 20
            assert first["available_seats"] == 0
            assert first["can_accommodate"] is False

            overbook = client.post("/reservations", json={
                "restaurant_id": 1, "date": capacity_day,
                "time": "19:00", "guests": 1
            })
            must(overbook, 409, "over-capacity booking must be rejected")
            assert "seats" in overbook.json()["detail"].lower()

            # A different time is independent, even on the same day.
            other_time = must(reserve(capacity_day, "20:00", 2), 201,
                              "different time slot")
            assert other_time["time"] == "20:00"

            # Cancelling the full-slot booking releases all 20 seats.
            must(client.delete(f"/reservations/{full['id']}"), 204,
                 "release 20 seats")
            created.remove(full["id"])
            reopened = must(client.get("/restaurants", params={
                "date": capacity_day, "time": "19:00", "guests": 20
            }), 200, "reopened capacity")
            first = next(r for r in reopened if r["id"] == 1)
            assert first["available_seats"] == 20
            assert first["can_accommodate"] is True
            must(reserve(capacity_day, "19:00", 20), 201,
                 "rebook released seats")

            # Two simultaneous 15-person reservations cannot both fit
            # in the independent 21:00 slot (20 total capacity).
            with ThreadPoolExecutor(max_workers=2) as pool:
                results = list(pool.map(
                    lambda _: reserve(capacity_day, "21:00", 15),
                    range(2),
                ))
            assert sorted(response.status_code for response in results) == [
                201, 409
            ], [(r.status_code, r.text[:150]) for r in results]
            concurrent = must(client.get("/restaurants", params={
                "date": capacity_day, "time": "21:00", "guests": 6
            }), 200, "concurrent seat accounting")
            first = next(r for r in concurrent if r["id"] == 1)
            assert first["available_seats"] == 5
            assert first["can_accommodate"] is False
        finally:
            for reservation_id in list(created):
                response = client.delete(f"/reservations/{reservation_id}")
                assert response.status_code == 204, (
                    f"cleanup failed for {reservation_id}: {response.text}"
                )

    print(
        "MESA V8 ASSIGNMENT PASS: restaurants, exact date/time/guests booking, "
        "lookup, cancellation, full capacity 409, released seats, "
        "independent slots and concurrent-overbooking protection."
    )


if __name__ == "__main__":
    main()
