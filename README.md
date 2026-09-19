# Restaurant Reservation API

A small, tested restaurant reservation service built with **Python, FastAPI and SQLite**.
It supports listing restaurants, booking a date/time slot, checking remaining seats,
and cancelling a reservation without deleting its history.

## Requirements

Python **3.10+**.

## Setup and run

```bash
python -m venv .venv
# Windows (PowerShell): .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open **http://127.0.0.1:8000/docs** for interactive Swagger UI. The database file
`reservations.db` is created automatically, with three sample restaurants. Override
its location with the `DATABASE_PATH` environment variable if needed.

## API endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/restaurants` | List sample restaurants and their capacities. |
| `GET` | `/restaurants?date=2030-06-01&time=19:00&guests=4` | Include remaining seats and whether the requested party fits. |
| `POST` | `/reservations` | Create a reservation (`201`), fail if full (`409`). |
| `GET` | `/reservations/{id}` | View a reservation including its status. |
| `DELETE` | `/reservations/{id}` | Cancel an active reservation (`204`), releasing its seats. |
| `GET` | `/health` | Basic health check. |

Example (choose a **future UTC date**):

```bash
curl -X POST http://127.0.0.1:8000/reservations \
  -H 'Content-Type: application/json' \
  -d '{"restaurant_id":1,"date":"2030-06-01","time":"19:00","guests":4}'
```

Response (`201 Created`):

```json
{
  "id": 1,
  "restaurant_id": 1,
  "date": "2030-06-01",
  "time": "19:00",
  "guests": 4,
  "status": "active"
}
```

Cancel with `DELETE /reservations/1` (a repeated cancellation returns `409`).
Unknown restaurants/reservations return `404`; invalid inputs return `422`.

## Capacity rule

Each reservation books seats for **one exact restaurant + date + time slot**.
For example, reservations for 19:00 and 20:00 are different slots; this small
assignment does not model seating duration or overlapping meal periods.
The sum of guests on **active** reservations must never exceed that restaurant's
capacity for the same slot. Cancelled reservations no longer count.

The booking operation uses SQLite `BEGIN IMMEDIATE` to acquire the write lock
**before** reading current occupancy. This makes the capacity check and insertion
one atomic transaction, so two simultaneous requests cannot both grab the last
available seats. Availability on `GET /restaurants` is informational; the
transactional POST check is authoritative.

All request dates/times are interpreted as **UTC** in 24-hour `HH:MM` format.
Bookings must be in the future; guest count must be positive (up to 1000).
This is a sample API with no authentication, suitable for the coding exercise,
not a production multi-tenant reservation service.

## Tests

```bash
python -m pytest -q
```

Tests cover seeded restaurants, creating and reading bookings, full and partial
capacity, separate time slots, cancellation and seat release, invalid input,
missing resources, and concurrent overbooking. GitHub Actions runs the same
suite on pushes and pull requests.
