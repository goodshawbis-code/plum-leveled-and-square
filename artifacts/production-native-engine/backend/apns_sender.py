# apns_sender.py
# Plumb Leveled & Square — APNs HTTP/2 Push Dispatcher
#
# Authentication: JWT (token-based) using the .p8 auth key.
# This is preferred over certificate-based auth — one key covers all environments.
#
# Required environment variables:
#   APNS_KEY_ID      = 524Q2C795M
#   APNS_TEAM_ID     = J63873JACF
#   APNS_BUNDLE_ID   = com.brickoutdoorliving.plumbleveledandsquare
#   APNS_PRIVATE_KEY = full PEM contents of AuthKey_524Q2C795M.p8
#                      (include the -----BEGIN/END PRIVATE KEY----- lines)
#
# Usage example:
#   sender = APNsSender()
#   result = await sender.send(
#       device_token="a1b2c3...",   # 64-char hex from device_tokens table
#       title="New Bid Detected",
#       body="Commercial RFP — Union Ridge Retail",
#       extra={"bid_id": "uuid-here"}
#   )

import os
import time
import json
import httpx

try:
    import jwt  # PyJWT >= 2.8.0
except ImportError as exc:  # pragma: no cover
    raise ImportError("PyJWT is required: pip install PyJWT cryptography") from exc

APNS_SANDBOX_HOST    = "https://api.sandbox.push.apple.com"
APNS_PRODUCTION_HOST = "https://api.push.apple.com"

# APNs rejects JWT tokens older than 60 minutes; refresh at 55 to be safe.
_JWT_TTL_SECONDS = 3300


class APNsSender:
    """
    JWT-authenticated APNs HTTP/2 push sender.

    One instance per process is sufficient — the JWT is cached and
    regenerated automatically when it approaches its 60-minute expiry.
    """

    def __init__(self) -> None:
        self.key_id      = os.environ["APNS_KEY_ID"]       # 524Q2C795M
        self.team_id     = os.environ["APNS_TEAM_ID"]      # J63873JACF
        self.bundle_id   = os.environ["APNS_BUNDLE_ID"]    # com.brickoutdoorliving.plumbleveledandsquare
        self.private_key = os.environ["APNS_PRIVATE_KEY"]  # PEM content of .p8

        self._token_issued_at: float = 0.0
        self._cached_jwt: str = ""

    def _get_jwt(self) -> str:
        """Return a valid JWT, regenerating if older than _JWT_TTL_SECONDS."""
        now = time.time()
        if now - self._token_issued_at < _JWT_TTL_SECONDS:
            return self._cached_jwt

        self._token_issued_at = now
        self._cached_jwt = jwt.encode(
            payload={"iss": self.team_id, "iat": int(now)},
            key=self.private_key,
            algorithm="ES256",
            headers={"alg": "ES256", "kid": self.key_id},
        )
        return self._cached_jwt

    async def send(
        self,
        device_token: str,
        title: str,
        body: str,
        badge: int = 1,
        sound: str = "default",
        category: str = "",
        extra: "dict | None" = None,
        environment: str = "production",
    ) -> dict:
        """
        Send a push notification to one device.

        Parameters
        ----------
        device_token : 64-char hex APNs device token
        title        : notification title (shown in bold)
        body         : notification body text
        badge        : app icon badge count (0 = clear)
        sound        : 'default' or a custom sound filename
        category     : UNNotificationCategory identifier (for action buttons)
        extra        : additional JSON keys merged into the APNs payload root
        environment  : 'production' or 'development' (routes to correct APNs host)

        Returns
        -------
        dict with 'status' key: 'sent' or 'failed' with reason details.
        """
        host = (
            APNS_PRODUCTION_HOST
            if environment == "production"
            else APNS_SANDBOX_HOST
        )
        url = f"{host}/3/device/{device_token}"

        payload: dict = {
            "aps": {
                "alert": {"title": title, "body": body},
                "sound": sound,
                "badge": badge,
            }
        }
        if category:
            payload["aps"]["category"] = category
        if extra:
            payload.update(extra)

        headers = {
            "authorization":  f"bearer {self._get_jwt()}",
            "apns-topic":     self.bundle_id,
            "apns-push-type": "alert",
            "apns-priority":  "10",
        }

        async with httpx.AsyncClient(http2=True) as client:
            response = await client.post(
                url,
                content=json.dumps(payload).encode("utf-8"),
                headers=headers,
                timeout=10.0,
            )

        if response.status_code == 200:
            return {"status": "sent", "token_prefix": device_token[:8] + "\u2026"}

        error_body: dict = {}
        if response.content:
            try:
                error_body = response.json()
            except Exception:
                pass

        return {
            "status":      "failed",
            "apns_status": response.status_code,
            "reason":      error_body.get("reason", "unknown"),
            "token_prefix": device_token[:8] + "\u2026",
        }

    async def broadcast(
        self,
        tokens: list[str],
        title: str,
        body: str,
        environment: str = "production",
        extra: "dict | None" = None,
    ) -> list[dict]:
        """
        Send the same push to multiple device tokens.
        Returns a list of per-device result dicts.
        Failures do not abort remaining sends.
        """
        results = []
        for token in tokens:
            result = await self.send(
                device_token=token,
                title=title,
                body=body,
                environment=environment,
                extra=extra,
            )
            results.append(result)
        return results
