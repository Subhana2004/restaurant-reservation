"""Request and response schemas."""

from datetime import date, datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


def parse_slot_time(value: str) -> str:
    """Require exactly HH:MM in 24-hour time, not a silently rounded time."""
    if len(value) != 5 or value[2] != ":" or not (value[:2] + value[3:]).isdigit():
        raise ValueError("time must use 24-hour HH:MM format (UTC)")
    try:
        datetime.strptime(value, "%H:%M")
    except ValueError as exc:
        raise ValueError("time must be a valid 24-hour HH:MM value (UTC)") from exc
    return value


class ReservationCreate(BaseModel):
    restaurant_id: int = Field(gt=0)
    date: date
    time: str
    guests: int = Field(gt=0, le=1000)

    @field_validator("time")
    @classmethod
    def validate_time(cls, value: str) -> str:
        return parse_slot_time(value)

    @model_validator(mode="after")
    def validate_future_slot(self) -> "ReservationCreate":
        slot = datetime.combine(self.date, datetime.strptime(self.time, "%H:%M").time())
        if slot <= datetime.now(timezone.utc).replace(tzinfo=None):
            raise ValueError("reservation date and time must be in the future (UTC)")
        return self


class ReservationOut(BaseModel):
    id: int
    restaurant_id: int
    date: date
    time: str
    guests: int
    status: Literal["active", "cancelled"]


class RestaurantOut(BaseModel):
    id: int
    name: str
    capacity: int
    available_seats: int | None = None
    can_accommodate: bool | None = None
