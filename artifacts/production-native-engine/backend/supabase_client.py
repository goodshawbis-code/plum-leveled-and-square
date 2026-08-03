# supabase_client.py
# Plumb Leveled & Square — Supabase singleton client
#
# Uses the SERVICE ROLE key so the backend can write device_tokens
# without being blocked by Row Level Security policies.
# Never expose this key client-side.

import os
from supabase import create_client, Client

_client: "Client | None" = None


def get_supabase_client() -> "Client":
    """
    Return a lazily-initialised Supabase client singleton.

    Reads credentials from environment variables:
      SUPABASE_URL              — https://<project-ref>.supabase.co
      SUPABASE_SERVICE_ROLE_KEY — service_role JWT (not the anon key)

    Raises RuntimeError if either variable is missing (fast-fail at startup).
    """
    global _client
    if _client is None:
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. "
                "Add them to your .env file or Render environment variables."
            )

        _client = create_client(url, key)
    return _client
