"""Aegis Authentication API client (standard library only)."""
from __future__ import annotations

import json
import threading
import time
import urllib.error
import urllib.request
from typing import Any, Callable, Dict, Optional

from .errors import AegisError
from .hwid import hardware_id

__all__ = ["Aegis", "HeartbeatHandle"]


class HeartbeatHandle:
    """Stops a background heartbeat loop."""

    def __init__(self, stop_event: threading.Event, thread: threading.Thread) -> None:
        self._stop_event = stop_event
        self._thread = thread

    def stop(self) -> None:
        self._stop_event.set()

    def __enter__(self) -> "HeartbeatHandle":
        return self

    def __exit__(self, *_exc: object) -> None:
        self.stop()


class Aegis:
    """Client for the Aegis Authentication API."""

    def __init__(
        self,
        base_url: str,
        app_key: str,
        *,
        api_key: Optional[str] = None,
        version: str = "1.0.0",
        channel: str = "stable",
        hwid: Optional[str] = None,
        timeout: float = 20.0,
        max_retries: int = 2,
    ) -> None:
        if not base_url:
            raise AegisError("invalid_options", "base_url is required.")
        if not app_key:
            raise AegisError("invalid_options", "app_key is required.")

        self.base_url = base_url.rstrip("/")
        self.app_key = app_key
        self.api_key = api_key
        self.version = version
        self.channel = channel
        self.hwid = hwid or hardware_id()
        self.timeout = timeout
        self.max_retries = max_retries
        self.session_token: Optional[str] = None
        self._heartbeat: Optional[HeartbeatHandle] = None

    # ---------------- transport ----------------

    def request(self, endpoint: str, body: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Call any endpoint and return its ``data`` payload."""
        url = f"{self.base_url}/api/public/v1/{endpoint.strip('/')}"
        payload = json.dumps({k: v for k, v in (body or {}).items() if v is not None}).encode("utf-8")
        headers = {
            "content-type": "application/json",
            "x-app-key": self.app_key,
            "x-timestamp": str(int(time.time())),
            "user-agent": "aegis-python-sdk/1.0.0",
        }
        if self.api_key:
            headers["x-api-key"] = self.api_key
        if self.session_token:
            headers["x-session-token"] = self.session_token

        last_error: Optional[BaseException] = None

        for attempt in range(self.max_retries + 1):
            request = urllib.request.Request(url, data=payload, headers=headers, method="POST")
            try:
                with urllib.request.urlopen(request, timeout=self.timeout) as response:
                    text = response.read().decode("utf-8")
                    status = response.status
            except urllib.error.HTTPError as exc:
                text = exc.read().decode("utf-8", errors="replace")
                status = exc.code
                if status >= 500 and attempt < self.max_retries:
                    time.sleep(0.25 * (attempt + 1))
                    continue
            except Exception as exc:  # network / DNS / timeout
                last_error = exc
                if attempt < self.max_retries:
                    time.sleep(0.25 * (attempt + 1))
                    continue
                break

            try:
                envelope = json.loads(text or "{}")
            except ValueError as exc:
                raise AegisError("invalid_response", "Malformed API response.", status, exc) from exc

            if not envelope.get("success"):
                error = envelope.get("error") or {}
                raise AegisError(
                    error.get("code", "server_error"),
                    error.get("message", "Request failed."),
                    status,
                )

            return envelope.get("data") or {}

        raise AegisError("network_error", str(last_error) if last_error else "Network request failed.", 0, last_error)

    # ---------------- application ----------------

    def init(self) -> Dict[str, Any]:
        """Handshake. Call once before any other operation."""
        return self.request("init", {"version": self.version})

    def status(self) -> Dict[str, Any]:
        return self.request("status")

    def app_data(self) -> Dict[str, Any]:
        return self.request("app/data")

    def check_version(self, version: Optional[str] = None) -> Dict[str, Any]:
        return self.request("version/check", {"version": version or self.version, "channel": self.channel})

    def downloads(self, version: Optional[str] = None) -> Dict[str, Any]:
        return self.request("downloads", {"version": version or self.version})

    # ---------------- authentication ----------------

    def register(
        self,
        username: str,
        password: str,
        *,
        email: Optional[str] = None,
        license_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        result = self.request(
            "register",
            {
                "username": username,
                "password": password,
                "email": email,
                "license_key": license_key,
                "hwid": self.hwid,
            },
        )
        self._store_session(result)
        return result

    def login(self, username: str, password: str) -> Dict[str, Any]:
        result = self.request("login", {"username": username, "password": password, "hwid": self.hwid})
        self._store_session(result)
        return result

    def logout(self) -> None:
        self.stop_heartbeat()
        try:
            self.request("logout")
        finally:
            self.session_token = None

    def heartbeat(self) -> Dict[str, Any]:
        return self.request("heartbeat")

    def check_session(self) -> Dict[str, Any]:
        return self.request("session/check")

    def is_authenticated(self) -> bool:
        if not self.session_token:
            return False
        try:
            return bool(self.check_session().get("valid"))
        except AegisError:
            return False

    def use_session(self, token: Optional[str]) -> None:
        """Restore a session token persisted by the host application."""
        self.session_token = token

    def user_data(self) -> Dict[str, Any]:
        return self.request("user/data")

    # ---------------- licensing ----------------

    def validate_license(self, license_key: str) -> Dict[str, Any]:
        return self.request("license/validate", {"license_key": license_key, "hwid": self.hwid})

    def activate_license(self, license_key: str, username: Optional[str] = None) -> Dict[str, Any]:
        return self.request(
            "license/activate",
            {"license_key": license_key, "hwid": self.hwid, "username": username},
        )

    # ---------------- variables ----------------

    def get_variables(self, scope: str = "application", license_key: Optional[str] = None) -> Dict[str, Any]:
        return self.request("variables/get", {"scope": scope, "license_key": license_key})

    def set_variable(
        self,
        key: str,
        value: str,
        scope: str = "user",
        license_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self.request(
            "variables/set",
            {"scope": scope, "key": key, "value": value, "license_key": license_key},
        )

    # ---------------- webhooks ----------------

    def trigger_webhook(self, event: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return self.request("webhook/trigger", {"event": event, "payload": payload or {}})

    # ---------------- heartbeat loop ----------------

    def start_heartbeat(
        self,
        interval: float = 60.0,
        on_revoked: Optional[Callable[[str], None]] = None,
        on_beat: Optional[Callable[[Dict[str, Any]], None]] = None,
    ) -> HeartbeatHandle:
        """Run a background heartbeat until the session is revoked or stopped."""
        self.stop_heartbeat()
        stop_event = threading.Event()

        def loop() -> None:
            while not stop_event.wait(interval):
                try:
                    beat = self.heartbeat()
                    if on_beat:
                        on_beat(beat)
                except AegisError as error:
                    if error.is_network_error:
                        continue
                    self.session_token = None
                    if on_revoked:
                        on_revoked(error.message)
                    return

        thread = threading.Thread(target=loop, name="aegis-heartbeat", daemon=True)
        thread.start()
        self._heartbeat = HeartbeatHandle(stop_event, thread)
        return self._heartbeat

    def stop_heartbeat(self) -> None:
        if self._heartbeat:
            self._heartbeat.stop()
            self._heartbeat = None

    # ---------------- internals ----------------

    def _store_session(self, result: Dict[str, Any]) -> None:
        session = result.get("session") or {}
        token = session.get("token")
        if token:
            self.session_token = token