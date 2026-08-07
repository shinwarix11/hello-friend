# Changelog

## 1.0.0 — 2026-08-07

- First real release of the Aegis .NET SDK, distributed directly from the Aegis
  download centre (no package registry required).
- Full coverage of the Authentication API: init, status, register, login,
  logout, heartbeat, session check, license validate/activate, variables
  get/set, user data, app data, version check, downloads, webhook trigger.
- Typed `AegisException` with API error codes and helper predicates.
- Background heartbeat host with revocation callback.
- Stable SHA-256 hardware id provider.
- Targets `netstandard2.0` and `net8.0`.