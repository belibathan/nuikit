---
"nuikit-core": patch
---

Backdrop filters go through one switch, `--nk-backdrop: on | off` (default on): surfaces set `--nk-backdrop-filter` and kit.css applies it unless `off`, so a server whose clients draw backdrop filters as black boxes turns them all off with one token.
