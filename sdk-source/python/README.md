# Aegis SDK for Python

Official client for the Aegis Authentication API. Pure standard library —
no third-party dependencies. Python 3.9+.

## Contents

```
aegis/client.py   Aegis client with every API operation
aegis/errors.py   AegisError with typed error codes
aegis/hwid.py     Stable hardware id
examples/         Runnable quickstart
```

## Install

No registry needed — unzip and install the folder directly:

```bash
pip install ./aegis-sdk-python
```

Or drop the `aegis/` package next to your application code.

## Quickstart

```python
from aegis import Aegis, AegisError

client = Aegis(base_url="https://your-aegis-host", app_key=APP_KEY, version="1.0.0")

info = client.init()
if (info.get("version") or {}).get("update_required"):
    raise SystemExit("Update required")

result = client.login("ada", password)
print("Signed in as", result["user"]["username"])

check = client.validate_license("AEGS-4K7P-2M9X-QT31")
print(check.get("valid"), check.get("status"))

client.set_variable("last_level", "12")
print(client.get_variables("user")["variables"])

with client.start_heartbeat(interval=60, on_revoked=lambda reason: app.lock(reason)):
    app.run()

client.logout()
```

## Supported operations

`init`, `status`, `app_data`, `register`, `login`, `logout`, `heartbeat`,
`check_session`, `is_authenticated`, `use_session`, `user_data`,
`validate_license`, `activate_license`, `get_variables`, `set_variable`,
`check_version`, `downloads`, `trigger_webhook`, plus `request()` for any
endpoint added later.

## Error handling

```python
try:
    client.login(username, password)
except AegisError as error:
    if error.code == "hwid_mismatch":
        ui.show("This license is locked to another machine.")
    elif error.is_network_error:
        ui.show("Aegis is unreachable — retrying.")
    else:
        raise
```

## License

MIT — see `LICENSE`.