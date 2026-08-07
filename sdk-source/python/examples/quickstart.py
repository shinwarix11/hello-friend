"""Runnable quickstart for the Aegis Python SDK.

    AEGIS_BASE_URL=https://your-aegis-host AEGIS_APP_KEY=pk_live_... python examples/quickstart.py
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from aegis import Aegis, AegisError  # noqa: E402


def main() -> int:
    client = Aegis(
        base_url=os.environ.get("AEGIS_BASE_URL", "http://localhost:8080"),
        app_key=os.environ.get("AEGIS_APP_KEY", ""),
        version="1.0.0",
    )

    info = client.init()
    print("Initialized:", info.get("status"))

    version = info.get("version") or {}
    if version.get("update_required"):
        print("Mandatory update:", version.get("latest"), version.get("download_url"))
        return 0

    result = client.login(
        os.environ.get("AEGIS_USERNAME", "demo"),
        os.environ.get("AEGIS_PASSWORD", "demo-password"),
    )
    license_info = result.get("license") or {}
    print("Signed in as", result["user"]["username"], "license:", license_info.get("status", "none"))

    print("User variables:", client.get_variables("user").get("variables"))
    client.set_variable("last_seen", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))

    with client.start_heartbeat(interval=60, on_revoked=lambda reason: print("Session revoked:", reason)):
        time.sleep(2)

    client.logout()
    print("Signed out.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AegisError as error:
        print(f"Aegis error [{error.code}] {error.message}", file=sys.stderr)
        raise SystemExit(1)