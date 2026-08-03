# main.py
# Plumb Leveled & Square — Production Engine API
#
# Run locally:
#   uvicorn backend.main:app --reload
# Environment variables required:
#   SUPABASE_URL               — project URL (e.g. https://xyz.supabase.co)
#   SUPABASE_SERVICE_ROLE_KEY  — service-role key (never the anon key)
#   APNS_PRIVATE_KEY           — full PEM contents of AuthKey_524Q2C795M.p8

from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel, field_validator
from typing import Optional

from .email_fisher import EmailFisher
from .vision_engine import VisionEngine
from .report_generator import ReportGenerator
from .supabase_client import get_supabase_client

app = FastAPI(
    title="PLS Production Engine",
    description="Plumb Leveled & Square — Smart Inbox, Vision Engine & Push Notifications",
    version="2.0.0",
)

# ---------------------------------------------------------------------------
# Engine singletons
# ---------------------------------------------------------------------------
fisher   = EmailFisher()
vision   = VisionEngine()
reporter = ReportGenerator()

# ===========================================================================
# EXISTING ENDPOINTS — DO NOT MODIFY (preserved verbatim from original)
# ===========================================================================

@app.post("/api/auth/connect-email")
async def connect_email(provider: str, token: str):
    """Secure Handshake: Saves the user's OAuth token to the vault."""
    return {"status": "connected", "provider": provider}


@app.post("/api/webhook/mail-received")
async def handle_new_mail(background_tasks: BackgroundTasks):
    """Smart Link: Triggered when a new email hits the connected inbox."""
    background_tasks.add_task(fisher.scan_and_process)
    return {"message": "Scan initialized"}


@app.get("/api/bids/detected")
async def get_detected_bids():
    """Smart Inbox: Returns the list of takeoff reports generated from email."""
    return []

# ===========================================================================
# PUSH NOTIFICATION ENDPOINTS  (new — added 2026-08-02)
# ===========================================================================

class DeviceTokenRequest(BaseModel):
    """
    Payload sent by the iOS app immediately after APNs issues a device token.

    Fields
    ------
    device_token : lowercase hex string, 64 chars (32-byte APNs token)
    platform     : always "ios" for this app; "macos" reserved for future
    bundle_id    : must match the signed binary's bundle ID
    environment  : "development" (sandbox/TestFlight ad-hoc) or "production"
    user_id      : optional — ties the token to an authenticated user row
    """

    device_token: str
    platform:     str = "ios"
    bundle_id:    str = "com.brickoutdoorliving.plumbleveledandsquare"
    environment:  str = "production"
    user_id:      Optional[str] = None

    @field_validator("device_token")
    @classmethod
    def validate_token_hex(cls, v: str) -> str:
        """APNs tokens are lowercase hex, exactly 64 characters (32 bytes)."""
        cleaned = v.strip().replace(" ", "").lower()
        if not all(c in "0123456789abcdef" for c in cleaned):
            raise ValueError("device_token must contain only hex characters (0-9, a-f)")
        if len(cleaned) != 64:
            raise ValueError(
                f"device_token must be 64 hex characters (32 bytes); got {len(cleaned)}"
            )
        return cleaned

    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        allowed = {"development", "production"}
        if v not in allowed:
            raise ValueError(f"environment must be one of {allowed}")
        return v

    @field_validator("bundle_id")
    @classmethod
    def validate_bundle_id(cls, v: str) -> str:
        if not v or "." not in v:
            raise ValueError("bundle_id must be a valid reverse-DNS identifier")
        return v.lower()


@app.post(
    "/api/notifications/register",
    summary="Push Handshake — register iOS device token",
    response_description="Confirmation that the token was stored in the vault",
)
async def register_device_token(payload: DeviceTokenRequest):
    """
    Register an iOS device token in the Supabase ``device_tokens`` table.

    Called automatically by the app on every launch (after APNs assigns a token).
    Uses an UPSERT on ``device_token`` so re-registrations silently update the
    existing row instead of creating duplicates.

    See: ``backend/migrations/001_device_tokens.sql`` for the table schema.
    """
    supabase = get_supabase_client()

    record: dict = {
        "device_token": payload.device_token,
        "platform":     payload.platform,
        "bundle_id":    payload.bundle_id,
        "environment":  payload.environment,
    }
    if payload.user_id:
        record["user_id"] = payload.user_id

    try:
        supabase.table("device_tokens") \
            .upsert(record, on_conflict="device_token") \
            .execute()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Supabase vault storage failed: {exc}",
        ) from exc

    return {
        "status":       "registered",
        "token_prefix": payload.device_token[:8] + "\u2026",
        "environment":  payload.environment,
    }


@app.delete(
    "/api/notifications/unregister",
    summary="Push Handshake — remove device token on logout",
)
async def unregister_device_token(device_token: str):
    """
    Remove a device token from the vault.

    Call this when the user logs out or explicitly opts out of push notifications
    so the backend stops routing messages to a stale or deauthorised device.
    """
    cleaned = device_token.strip().replace(" ", "").lower()
    if len(cleaned) != 64 or not all(c in "0123456789abcdef" for c in cleaned):
        raise HTTPException(status_code=422, detail="Invalid device_token format")

    supabase = get_supabase_client()

    try:
        supabase.table("device_tokens") \
            .delete() \
            .eq("device_token", cleaned) \
            .execute()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Supabase vault removal failed: {exc}",
        ) from exc

    return {"status": "unregistered", "token_prefix": cleaned[:8] + "\u2026"}
