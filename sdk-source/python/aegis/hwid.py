"""Stable, non-reversible machine identifier."""
from __future__ import annotations

import getpass
import hashlib
import platform
import uuid

_cached: str | None = None


def hardware_id() -> str:
    """SHA-256 of stable machine facts (node, MAC, platform, user)."""
    global _cached
    if _cached:
        return _cached
    try:
        user = getpass.getuser()
    except Exception:  # pragma: no cover - locked down environments
        user = ""
    seed = "|".join(
        [
            platform.node(),
            platform.system(),
            platform.machine(),
            str(uuid.getnode()),
            user,
        ]
    )
    _cached = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    return _cached