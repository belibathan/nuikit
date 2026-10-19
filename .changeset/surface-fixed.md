---
"nuikit-core": patch
---

Surfaces are `position: fixed`, so a Radix dialog opened inside one (which locks scroll by making `<body>` relative) no longer collapses the surface.
