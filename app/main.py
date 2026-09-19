"""HTTP endpoints for viewing restaurants and booking/cancelling tables."""

from contextlib import asynccontextmanager, closing
from datetime import date
import os

from fastapi import FastAPI, HTTPException, Query, Response, status

from app.database import booked_guests, connect, initialize
from app.schemas import ReservationCreate, ReservationOut, RestaurantOut, parse_slot_time

RESERVATION_COLUMNS = """id, restaurant_id, reservation_date AS date,
                         reservation_time AS time, guests, status"""


def create_app(database_path: str | None = None) -> FastAPI:
    db_path = database_path or os.environ.get("DATABASE_PATH", "reservations.db")

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        initialize(db_path)
        yield

    app = FastAPI(
        title="Restaurant Reservation API",
        description="Reserve seats for a restaurant's UTC date/time slot.",
        version="1.0.0",
        lifespan=lifespan,
    )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/restaurants", response_model=list[RestaurantOut])
    def list_restaurants(
        date: date | None = Query(default=None),
        time: str | None = Query(default=None),
        guests: int = Query(default=1, gt=0, le=1000),
    ) -> list[dict]:
        """Optionally include availability for one exact UTC date/time slot."""
        if (date is None) != (time is None):
            raise HTTPException(
                status_code=422, detail="date and time must be provided together"
            )
        if time is not None:
            try:
                parse_slot_time(time)
            except ValueError as exc:
                raise HTTPException(status_code=422, detail=str(exc)) from exc

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
