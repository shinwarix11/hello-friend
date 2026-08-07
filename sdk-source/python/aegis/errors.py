"""Typed errors for the Aegis SDK."""
from __future__ import annotations


class AegisError(Exception):
    """Every Aegis API failure surfaces as this exception."""

    def __init__(self, code: str, message: str, status: int = 0, cause: BaseException | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status
        self.cause = cause

    @property
    def is_network_error(self) -> bool:
        return self.status == 0

    @property
    def is_auth_error(self) -> bool:
        return self.code in {"unauthorized", "invalid_credentials"}

    @property
    def is_license_error(self) -> bool:
        return self.code.startswith("license") or self.code == "hwid_mismatch"

    def __repr__(self) -> str:  # pragma: no cover - debugging helper
        return f"AegisError(code={self.code!r}, status={self.status}, message={self.message!r})"