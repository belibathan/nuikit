---
"nuikit-ox-lib-ui": patch
---

ox_lib override:

- The list menu now scrolls by whole rows, so no half row shows under the header at the end of a long list.
- Progress tracks stay visible on a highlighted row in themes where `muted` matches `accent`.
- A 0 ms progress run now completes on the normal schedule (~100 ms) instead of being held to a 50 ms minimum.
