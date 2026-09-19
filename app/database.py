"""Small SQLite persistence layer with transactional capacity checks."""

from contextlib import closing
from pathlib import Path
import sqlite3

SCHEMA = """
CREATE TABLE IF NOT EXISTS restaurants (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0)
);

CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    reservation_date TEXT NOT NULL,
    reservation_time TEXT NOT NULL,
    guests INTEGER NOT NULL CHECK (guests > 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_reservation_slot
ON reservations(restaurant_id, reservation_date, reservation_time, status);
"""

SAMPLE_RESTAURANTS = (
    (1, "Olive Garden Bistro", 20),
    (2, "The Spice Table", 35),
    (3, "Seaside Kitchen", 50),
)


def connect(database_path: str) -> sqlite3.Connection:
    """Create a fresh connection for one request/transaction."""
    conn = sqlite3.connect(database_path, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def initialize(database_path: str) -> None:
    """Create schema and seed example restaurants without duplicating rows."""
    if database_path != ":memory:":
        Path(database_path).expanduser().parent.mkdir(parents=True, exist_ok=True)
    with closing(connect(database_path)) as conn:
        with conn:
            conn.executescript(SCHEMA)
            conn.executemany(
                "INSERT OR IGNORE INTO restaurants(id, name, capacity) VALUES (?, ?, ?)",
                SAMPLE_RESTAURANTS,
            )


def booked_guests(
    conn: sqlite3.Connection, restaurant_id: int, date: str, time: str
) -> int:
    row = conn.execute(
        """SELECT COALESCE(SUM(guests), 0) AS occupied
           FROM reservations
           WHERE restaurant_id = ? AND reservation_date = ?
             AND reservation_time = ? AND status = 'active'""",
        (restaurant_id, date, time),
    ).fetchone()
    return int(row["occupied"])
