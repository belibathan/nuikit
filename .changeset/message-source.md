---
"nuikit-core": patch
---

A page accepts `message` events only from FiveM's root page (`window.parent`), its own window or a null source: every NUI frame on a client can post into every other (FiveM runs CEF with web security off), so another resource's frame can no longer inject `nuikit:*` or application messages. Protocol §5.1 now says so.
