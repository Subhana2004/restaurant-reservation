"""API behaviour tests using an isolated temporary database per test."""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
import pytest

from app.main import create_app


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(str(tmp_path / "reservations.db"))) as test_client:
        yield test_client


@pytest.fixture
def future_date():
    return (datetime.now(timezone.utc) + timedelta(days=7)).date().isoformat()


def payload(future_date, guests=2, time="19:00", restaurant_id=1):
    return {
        "restaurant_id": restaurant_id,
        "date": future_date,
        "time": time,
        "guests": guests,
    }


def test_restaurants_are_seeded(client, future_date):
    response = client.get("/restaurants")
    assert response.status_code == 200
    assert len(response.json()) == 3
    assert response.json()[0]["capacity"] == 20
    availability = client.get(
        "/restaurants", params={"date": future_date, "time": "19:00", "guests": 2}
    )
    assert availability.json()[0]["available_seats"] == 20
    assert availability.json()[0]["can_accommodate"] is True


def test_create_and_read_reservation(client, future_date):
    created = client.post("/reservations", json=payload(future_date, guests=4))
    assert created.status_code == 201
    reservation = created.json()
    assert reservation["guests"] == 4
    assert reservation["status"] == "active"
    assert client.get(f"/reservations/{reservation['id']}").json() == reservation
    remaining = client.get(
        "/restaurants", params={"date": future_date, "time": "19:00", "guests": 17}
    ).json()[0]
    assert remaining["available_seats"] == 16
    assert remaining["can_accommodate"] is False


def test_capacity_boundary_and_different_slots(client, future_date):
    assert client.post("/reservations", json=payload(future_date, 12)).status_code == 201
    assert client.post("/reservations", json=payload(future_date, 8)).status_code == 201
    assert client.post("/reservations", json=payload(future_date, 1)).status_code == 409
    assert client.post(
        "/reservations", json=payload(future_date, 20, time="20:00")
    ).status_code == 201


def test_cancel_releases_capacity_and_keeps_history(client, future_date):
    booked = client.post("/reservations", json=payload(future_date, 20)).json()
    assert client.post("/reservations", json=payload(future_date, 1)).status_code == 409
    assert client.delete(f"/reservations/{booked['id']}").status_code == 204
    assert client.get(f"/reservations/{booked['id']}").json()["status"] == "cancelled"
    assert client.post("/reservations", json=payload(future_date, 20)).status_code == 201
    assert client.delete(f"/reservations/{booked['id']}").status_code == 409


@pytest.mark.parametrize(
    "changes",
    [
        {"guests": 0},
        {"guests": -1},
        {"guests": 1001},
        {"time": "25:99"},
        {"time": "7:00"},
        {"date": "2020-01-01"},
        {"date": "not-a-date"},
        {"restaurant_id": 0},
    ],
)
def test_invalid_reservations_rejected(client, future_date, changes):
    assert client.post(
        "/reservations", json={**payload(future_date), **changes}
    ).status_code == 422


def test_not_found_and_bad_availability_queries(client, future_date):
    assert client.post("/reservations", json=payload(future_date, restaurant_id=999)).status_code == 404
    assert client.get("/reservations/999").status_code == 404
    assert client.delete("/reservations/999").status_code == 404
    assert client.get("/restaurants", params={"date": future_date}).status_code == 422
    assert client.get(
        "/restaurants", params={"date": future_date, "time": "25:99"}
    ).status_code == 422


def test_simultaneous_requests_cannot_overbook(client, future_date):
    """Two requests each want 15 of 20 seats; only one may succeed."""
    request = payload(future_date, guests=15)
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(lambda _: client.post("/reservations", json=request), range(2)))
    assert sorted(r.status_code for r in responses) == [201, 409]
    restaurant = client.get(
        "/restaurants", params={"date": future_date, "time": "19:00"}
    ).json()[0]
    assert restaurant["available_seats"] == 5
