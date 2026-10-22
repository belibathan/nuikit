---
"create-nuikit": minor
---

The collapse engine: `useCollapse` (hook) and `collapse-stack` (component) for clustered indicators. At rest only icons; a change opens a chip for `--nk-rest-delay`; changes within 400 ms batch together and close together; critical first, then the biggest change; at most `max`, then "+N"; per-key opt-outs. `vital-chip`'s `expand` chips in a `VitalChip.Row` run on it.
