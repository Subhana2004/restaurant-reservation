"""Mesa's anonymous demo reservations via Supabase PostgREST.

No Google login, no service-role key in the browser or repository. Only a
publishable (anon) API key is used, and database privileges are restricted to
four curated RPCs. The underlying mesa schema is private and RLS-enabled.
"""
import os

import httpx
from fastapi import HTTPException

# A publishable key is intentionally public; it does not grant privileged
# database access. Override it through server-side env for independent rotation.
DEFAULT_URL = "https://liyhjtyadbeozwjtrqqr.supabase.co"
DEFAULT_PUBLISHABLE_KEY = "sb_publishable_ZFK_hBjdVwvCAbupYSZGog_oH0TEAfe"


def rpc(function: str, payload: dict) -> object:
    """Call one fixed-function public RPC from the FastAPI server."""
    if function not in {"restaurants", "create", "get", "cancel"}:
        raise ValueError("unsupported Mesa RPC")

    url = os.environ.get("MESA_SUPABASE_URL", DEFAULT_URL).rstrip("/")
    key = os.environ.get("MESA_SUPABASE_PUBLISHABLE_KEY", DEFAULT_PUBLISHABLE_KEY)
    try:
        with httpx.Client(timeout=12.0) as client:
            response = client.post(
                f"{url}/rest/v1/rpc/mesa_api_{function}",
                headers={"apikey": key, "Content-Type": "application/json"},
                json=payload,
            )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=503,
            detail="The reservation database is temporarily unreachable. Try again.",
        ) from exc

    if response.is_error:
        # PostgREST maps our deliberately raised PT404/409/422 SQLSTATEs
        # to the matching HTTP status; never disclose infrastructure details.
        if response.status_code in {404, 409, 422}:
            try:
                message = response.json().get("message") or "Reservation request rejected"
            except ValueError:
                message = "Reservation request rejected"
            raise HTTPException(status_code=response.status_code, detail=message)
        raise HTTPException(
            status_code=503,
            detail="The reservation database could not complete the request. Try again.",
        )
    try:
        return response.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=503, detail="The reservation database returned an invalid response."
        ) from exc


def restaurants(day, time, guests) -> list[dict]:
    result = rpc(
        "restaurants",
        {"p_date": day.isoformat() if day is not None else None,
         "p_time": time, "p_guests": guests},
    )
    if not isinstance(result, list):
        raise HTTPException(503, "Invalid restaurant listing from the database.")
    return result


def create(payload) -> dict:
    result = rpc(
        "create",
        {"p_restaurant_id": payload.restaurant_id,
         "p_date": payload.date.isoformat(),
         "p_time": payload.time, "p_guests": payload.guests},
    )
    if not isinstance(result, dict) or "id" not in result:
        raise HTTPException(503, "Invalid booking confirmation from the database.")
    return result


def get(reservation_id: int) -> dict:
    result = rpc("get", {"p_id": reservation_id})
    if not isinstance(result, dict) or "id" not in result:
        raise HTTPException(503, "Invalid reservation record from the database.")
    return result


def cancel(reservation_id: int) -> None:
    result = rpc("cancel", {"p_id": reservation_id})
    if not isinstance(result, dict) or result.get("cancelled") is not True:
        raise HTTPException(503, "The reservation could not be cancelled.")
