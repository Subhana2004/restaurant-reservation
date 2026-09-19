# Restaurant Reservation API

A small, tested restaurant reservation service built with **Python, FastAPI and SQLite**, with an integrated, responsive reservation website called **mesa.**
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

Open **http://127.0.0.1:8000/** to use the reservation website, or **http://127.0.0.1:8000/docs** for interactive Swagger UI. The website is served by FastAPI and calls the same reservation endpoints, so no separate Node server or API key is required. The database file
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

## Website

The responsive **mesa.** interface supports live restaurant availability, date/time/party selection, creating reservations, cancellation, looking up a confirmation ID, and displaying browser-saved reservations. It includes loading, empty, error and success states, keyboard-accessible dialogs and reduced-motion support. Since this API is an unauthenticated coding demo, localStorage stores **only reservation IDs**: bookings are not private, and this is not a production user account system.

Static frontend files live in `static/` and are served by the same Python application at `/`. The frontend uses exact UTC time slots to match the assignment's API semantics.

## Design skills (8 original repositories)

Eight upstream Git repositories are pinned as submodules in `.design-skills/`; see [docs/DESIGN_SKILLS.md](docs/DESIGN_SKILLS.md). In a local checkout, run `python scripts/install_design_skills.py` to fetch them and install 15 focused skill folders into `.claude/skills/` and `.agents/skills/`. An internet connection is required for the first submodule fetch; Python and Git are sufficient.

## Deploy to Vercel

**Persistent PostgreSQL is required on Vercel.** Its serverless instances cannot share a writable SQLite database. Local setup and automated tests continue to use SQLite.

1. Provision a *dedicated* PostgreSQL database (e.g. Supabase or Neon), and keep its connection URL private. SSL may be required by your provider.
2. Import the GitHub repository `Subhana2004/restaurant-reservation` in the Vercel dashboard, using the repository root as Root Directory. `index.py` is the Python/FastAPI entrypoint.
3. Before deploying, add `DATABASE_URL` as a Vercel server-side environment variable for Production (and Preview if needed). Never commit it or expose it in the browser.
4. Deploy; check `/`, `/docs` and `/health`. Health should show `"storage":"postgres"`. Confirm a reservation from one browser, refresh, then retrieve/cancel it in another browser.

The API creates a private `mesa` schema and seeds three demo restaurants during initialization. Booking locks the restaurant's PostgreSQL row before reading occupancy and inserting the reservation. The deployment intentionally refuses to start without durable storage rather than silently losing reservations.

This is an **anonymous sample assignment**. Reservation IDs are not authentication; don't use this code for real customers without authorization.
