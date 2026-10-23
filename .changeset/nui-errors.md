---
"nuikit-core": minor
---

`fetchNui` rejects with a typed `NuiError` (`code`: `TIMEOUT | TRANSPORT | UNKNOWN_CALLBACK | INVALID | CANCELLED`), takes `{ timeoutMs, signal }`, and the page keeps per-resource call diagnostics (`getNuiDiagnostics`, `configureNui`). Devtools show code and timing per call. The host answers an unregistered forwarded callback with `UNKNOWN_CALLBACK`.
