"""HTTP endpoints for viewing restaurants and booking/cancelling tables."""

from contextlib import asynccontextmanager, closing
from datetime import date
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Response, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.database import booked_guests, connect, initialize
from app import postgres
from app.schemas import ReservationCreate, ReservationOut, RestaurantOut, parse_slot_time

STATIC_DIR = Path(__file__).resolve().parent.parent / 'static'

RESERVATION_COLUMNS = """id, restaurant_id, reservation_date AS date,
                         reservation_time AS time, guests, status"""


def create_app(database_path: str | None = None) -> FastAPI:
    # Explicit local/test database paths keep SQLite behaviour. In a serverless
    # deployment, use durable PostgreSQL so all instances share reservations.
    database_url = os.environ.get("DATABASE_URL") if database_path is None else None
    db_path = database_path or os.environ.get("DATABASE_PATH", "reservations.db")
    # Let the UI and health endpoint load even before a Vercel database is
    # configured. Never silently fall back to an ephemeral serverless SQLite DB.
    missing_database = bool(os.environ.get("VERCEL")) and not database_url and database_path is None

    def require_storage() -> None:
        if missing_database:
            raise HTTPException(
                status_code=503,
                detail="Reservations are unavailable: configure DATABASE_URL in Vercel project settings and redeploy.",
            )

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if database_url:
            postgres.initialize(database_url)
        elif not missing_database:
            initialize(db_path)
        yield

    app = FastAPI(
        title="Restaurant Reservation API",
        description="Reserve seats for a restaurant's UTC date/time slot.",
        version="1.0.0",
        lifespan=lifespan,
    )

    app.mount('/static', StaticFiles(directory=STATIC_DIR), name='static')
    app.mount('/v2-assets', StaticFiles(directory=STATIC_DIR / 'v2'), name='v2-assets')
    app.mount('/v3-assets', StaticFiles(directory=STATIC_DIR / 'v3'), name='v3-assets')

    @app.get('/v3', include_in_schema=False)
    @app.get('/v3/', include_in_schema=False)
    def website_v3() -> FileResponse:
        return FileResponse(STATIC_DIR / 'v3' / 'index.html')

    @app.get('/v2', include_in_schema=False)
    @app.get('/v2/', include_in_schema=False)
    def website_v2() -> FileResponse:
        return FileResponse(STATIC_DIR / 'v2' / 'index.html')

    @app.get('/classic', include_in_schema=False)
    @app.get('/classic/', include_in_schema=False)
    def website_classic() -> FileResponse:
        return FileResponse(STATIC_DIR / 'index.html')

    @app.get('/', include_in_schema=False)
    def website() -> FileResponse:
        return FileResponse(STATIC_DIR / 'v3' / 'index.html')

    @app.get("/health")
    def health() -> dict[str, str]:
        if missing_database:
            return {"status": "setup_required", "storage": "unconfigured"}
        return {"status": "ok", "storage": "postgres" if database_url else "sqlite"}

    @app.get("/restaurants", response_model=list[RestaurantOut])
    def list_restaurants(
        date: date | None = Query(default=None),
        time: str | None = Query(default=None),
        guests: int = Query(default=1, gt=0, le=1000),
    ) -> list[dict]:
        """Optionally include availability for one exact UTC date/time slot."""
        require_storage()
        if (date is None) != (time is None):
            raise HTTPException(
                status_code=422, detail="date and time must be provided together"
            )
        if time is not None:
            try:
                parse_slot_time(time)
            except ValueError as exc:
                raise HTTPException(status_code=422, detail=str(exc)) from exc

        if database_url:
            return postgres.restaurants(database_url, date, time, guests)

        with closing(connect(db_path)) as conn:
            restaurants = [dict(row) for row in conn.execute(
                "SELECT id, name, capacity FROM restaurants ORDER BY id"
            ).fetchall()]
            if date is not None and time is not None:
                for restaurant in restaurants:
                    remaining = restaurant["capacity"] - booked_guests(
                        conn, restaurant["id"], date.isoformat(), time
                    )
                    restaurant["available_seats"] = remaining
                    restaurant["can_accommodate"] = remaining >= guests
        return restaurants

    @app.post(
        "/reservations",
        response_model=ReservationOut,
        status_code=status.HTTP_201_CREATED,
    )
    def create_reservation(payload: ReservationCreate) -> dict:
        """Lock the writer before checking seats, preventing concurrent overbooking."""
        require_storage()
        if database_url:
            return postgres.create(database_url, payload)

        with closing(connect(db_path)) as conn:
            try:
                conn.execute("BEGIN IMMEDIATE")
                restaurant = conn.execute(
                    "SELECT capacity FROM restaurants WHERE id = ?",
                    (payload.restaurant_id,),
                ).fetchone()
                if restaurant is None:
                    raise HTTPException(status_code=404, detail="restaurant not found")

                occupied = booked_guests(
                    conn, payload.restaurant_id, payload.date.isoformat(), payload.time
                )
                if occupied + payload.guests > restaurant["capacity"]:
                    raise HTTPException(
                        status_code=409,
                        detail="not enough seats available for this date and time",
                    )

                cursor = conn.execute(
                    """INSERT INTO reservations
                       (restaurant_id, reservation_date, reservation_time, guests)
                       VALUES (?, ?, ?, ?)""",
                    (
                        payload.restaurant_id,
                        payload.date.isoformat(),
                        payload.time,
                        payload.guests,
                    ),
                )
                reservation = conn.execute(
                    f"SELECT {RESERVATION_COLUMNS} FROM reservations WHERE id = ?",
                    (cursor.lastrowid,),
                ).fetchone()
                conn.commit()
                return dict(reservation)
            except Exception:
                conn.rollback()
                raise

    @app.get("/reservations/{reservation_id}", response_model=ReservationOut)
    def get_reservation(reservation_id: int) -> dict:
        require_storage()
        if database_url:
            return postgres.get(database_url, reservation_id)
        with closing(connect(db_path)) as conn:
            reservation = conn.execute(
                f"SELECT {RESERVATION_COLUMNS} FROM reservations WHERE id = ?",
                (reservation_id,),
            ).fetchone()
        if reservation is None:
            raise HTTPException(status_code=404, detail="reservation not found")
        return dict(reservation)

    @app.delete("/reservations/{reservation_id}", status_code=status.HTTP_204_NO_CONTENT)
    def cancel_reservation(reservation_id: int) -> Response:
        require_storage()
        if database_url:
            postgres.cancel(database_url, reservation_id)
            return Response(status_code=status.HTTP_204_NO_CONTENT)
        with closing(connect(db_path)) as conn:
            try:
                conn.execute("BEGIN IMMEDIATE")
                reservation = conn.execute(
                    "SELECT status FROM reservations WHERE id = ?", (reservation_id,)
                ).fetchone()
                if reservation is None:
                    raise HTTPException(status_code=404, detail="reservation not found")
                if reservation["status"] == "cancelled":
                    raise HTTPException(status_code=409, detail="reservation already cancelled")

                conn.execute(
                    "UPDATE reservations SET status = 'cancelled' WHERE id = ?",
                    (reservation_id,),
                )
                conn.commit()
                return Response(status_code=status.HTTP_204_NO_CONTENT)
            except Exception:
                conn.rollback()
                raise

    return app


app = create_app()
