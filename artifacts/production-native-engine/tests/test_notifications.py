# test_notifications.py
# Plumb Leveled & Square — Push Notification Endpoint Tests
#
# Run: python -m pytest tests/test_notifications.py -v
#
# All Supabase and relative-import dependencies are mocked so these tests
# run in any environment (no network, no real credentials required).

import sys
import types
import pytest
from unittest.mock import MagicMock, patch


# ---------------------------------------------------------------------------
# Stub out modules that don't exist in the test environment.
# We need to do this BEFORE importing backend.main.
# ---------------------------------------------------------------------------

def _make_stub(name: str) -> types.ModuleType:
    mod = types.ModuleType(name)
    return mod


# Stub: supabase package
supabase_stub = _make_stub("supabase")
supabase_stub.create_client = MagicMock(return_value=MagicMock())
sys.modules.setdefault("supabase", supabase_stub)

# Stubs for relative-import sibling modules
for mod_name in (
    "backend.email_fisher",
    "backend.vision_engine",
    "backend.report_generator",
    "backend.supabase_client",
):
    stub = _make_stub(mod_name)
    stub.EmailFisher = MagicMock
    stub.VisionEngine = MagicMock
    stub.ReportGenerator = MagicMock
    stub.get_supabase_client = MagicMock(return_value=MagicMock())
    sys.modules.setdefault(mod_name, stub)

# ---------------------------------------------------------------------------
# Now it's safe to import from backend
# ---------------------------------------------------------------------------
import importlib

if "backend.main" in sys.modules:
    del sys.modules["backend.main"]

backend_main = importlib.import_module("backend.main")
DeviceTokenRequest = backend_main.DeviceTokenRequest
app = backend_main.app

from fastapi.testclient import TestClient  # noqa: E402

client = TestClient(app)

# ---------------------------------------------------------------------------
# DeviceTokenRequest — Pydantic model validation tests
# ---------------------------------------------------------------------------

VALID_TOKEN = "a" * 64  # 64 lowercase hex chars


class TestDeviceTokenRequestValidation:

    def test_valid_token_accepted(self):
        m = DeviceTokenRequest(device_token=VALID_TOKEN)
        assert m.device_token == VALID_TOKEN

    def test_token_normalised_to_lowercase(self):
        upper_token = "A" * 64
        m = DeviceTokenRequest(device_token=upper_token)
        assert m.device_token == "a" * 64

    def test_token_spaces_stripped(self):
        spaced = "a" * 32 + " " + "b" * 32
        cleaned = spaced.replace(" ", "")
        assert len(cleaned) == 64
        m = DeviceTokenRequest(device_token=spaced)
        assert len(m.device_token) == 64

    def test_token_too_short_raises(self):
        with pytest.raises(Exception):
            DeviceTokenRequest(device_token="abc")

    def test_token_too_long_raises(self):
        with pytest.raises(Exception):
            DeviceTokenRequest(device_token="a" * 65)

    def test_non_hex_chars_raise(self):
        bad_token = "g" * 64
        with pytest.raises(Exception):
            DeviceTokenRequest(device_token=bad_token)

    def test_default_platform_is_ios(self):
        m = DeviceTokenRequest(device_token=VALID_TOKEN)
        assert m.platform == "ios"

    def test_default_environment_is_production(self):
        m = DeviceTokenRequest(device_token=VALID_TOKEN)
        assert m.environment == "production"

    def test_development_environment_accepted(self):
        m = DeviceTokenRequest(device_token=VALID_TOKEN, environment="development")
        assert m.environment == "development"

    def test_invalid_environment_raises(self):
        with pytest.raises(Exception):
            DeviceTokenRequest(device_token=VALID_TOKEN, environment="staging")

    def test_user_id_optional(self):
        m = DeviceTokenRequest(device_token=VALID_TOKEN)
        assert m.user_id is None
        m2 = DeviceTokenRequest(device_token=VALID_TOKEN, user_id="user-uuid-123")
        assert m2.user_id == "user-uuid-123"

    def test_invalid_bundle_id_raises(self):
        with pytest.raises(Exception):
            DeviceTokenRequest(device_token=VALID_TOKEN, bundle_id="nodots")


# ---------------------------------------------------------------------------
# /api/notifications/register — endpoint integration tests
# ---------------------------------------------------------------------------

class TestRegisterEndpoint:

    def _make_mock_supabase(self):
        mock_client = MagicMock()
        mock_client.table.return_value.upsert.return_value.execute.return_value = MagicMock(
            data=[{"id": "mock-uuid"}]
        )
        return mock_client

    def test_register_returns_200_on_success(self):
        mock_sb = self._make_mock_supabase()
        with patch.object(backend_main, "get_supabase_client", return_value=mock_sb):
            response = client.post(
                "/api/notifications/register",
                json={"device_token": VALID_TOKEN, "environment": "development"},
            )
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "registered"
        assert body["token_prefix"].startswith(VALID_TOKEN[:8])
        assert body["environment"] == "development"

    def test_register_with_user_id(self):
        mock_sb = self._make_mock_supabase()
        with patch.object(backend_main, "get_supabase_client", return_value=mock_sb):
            response = client.post(
                "/api/notifications/register",
                json={
                    "device_token": VALID_TOKEN,
                    "user_id": "user-uuid-abc",
                    "environment": "production",
                },
            )
        assert response.status_code == 200
        call_args = mock_sb.table.return_value.upsert.call_args
        record = call_args[0][0]
        assert record.get("user_id") == "user-uuid-abc"

    def test_register_returns_500_on_supabase_error(self):
        mock_sb = MagicMock()
        mock_sb.table.return_value.upsert.return_value.execute.side_effect = \
            Exception("DB connection refused")
        with patch.object(backend_main, "get_supabase_client", return_value=mock_sb):
            response = client.post(
                "/api/notifications/register",
                json={"device_token": VALID_TOKEN},
            )
        assert response.status_code == 500
        assert "Supabase vault storage failed" in response.json()["detail"]

    def test_register_rejects_invalid_token(self):
        response = client.post(
            "/api/notifications/register",
            json={"device_token": "not-hex!!"},
        )
        assert response.status_code == 422

    def test_register_without_body_returns_422(self):
        response = client.post("/api/notifications/register", json={})
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# /api/notifications/unregister — endpoint tests
# ---------------------------------------------------------------------------

class TestUnregisterEndpoint:

    def test_unregister_returns_200(self):
        mock_sb = MagicMock()
        mock_sb.table.return_value.delete.return_value.eq.return_value.execute.return_value = \
            MagicMock()
        with patch.object(backend_main, "get_supabase_client", return_value=mock_sb):
            response = client.delete(
                f"/api/notifications/unregister?device_token={VALID_TOKEN}"
            )
        assert response.status_code == 200
        assert response.json()["status"] == "unregistered"

    def test_unregister_invalid_token_returns_422(self):
        response = client.delete(
            "/api/notifications/unregister?device_token=bad"
        )
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# Existing endpoints — regression check (must still return expected shapes)
# ---------------------------------------------------------------------------

class TestExistingEndpointsRegression:

    def test_connect_email_still_works(self):
        response = client.post("/api/auth/connect-email?provider=gmail&token=tok")
        assert response.status_code == 200
        assert response.json()["status"] == "connected"

    def test_detected_bids_still_returns_list(self):
        response = client.get("/api/bids/detected")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
