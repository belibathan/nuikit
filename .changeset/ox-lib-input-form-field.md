---
"nuikit-ox-lib-ui": patch
---

ox_lib override: `lib.inputDialog` rows now use the kit's `form-field` presets (text, password, textarea, number, checkbox, select, multi-select, slider, colour and date). Each one shows its error in one sentence under the field.

Two protocol fixes:

- **Submitting no longer stalls on decimal numbers.** A number that didn't fit the field's `step` (for example 12.345 with precision 2) quietly blocked the submit. The dialog now rounds to `precision`, as ox_lib does.
- **An untouched `select` returns `null`.** Before, it returned `""`.
