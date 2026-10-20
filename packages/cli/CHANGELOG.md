# nuikit

## 0.5.0

### Minor Changes

- 1c95253: New package `nuikit`, the command line for the nuikit protocol (`docs/protocol.md`). `nuikit check [path]`
  grades a FiveM resource (or every resource under a folder) against the protocol's conformance levels (1 themed,
  2 well-behaved, 3 native) with file:line findings: hard-coded colours and Tailwind palette classes, direct
  `SetNuiFocus` calls, focus not released on stop, ad-hoc Escape, missing surfaces or `nuikit_protocol`, remote
  fonts and per-frame NUI messages. `--json` for tooling, `--level` to fail CI below a level. `nuikit tokens`
  lists the theme tokens (tokens v1).
