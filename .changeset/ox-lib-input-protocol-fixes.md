---
"nuikit-ox-lib-ui": patch
---

ox_lib override, input dialog:

- **Decimal numbers no longer block the dialog.** A number that didn't fit the field's step (for example 12.345 with `precision: 2`) stopped the dialog from submitting, with no message. It now submits rounded to `precision`, as ox_lib does.
- **An untouched `select` returns `null`.** It used to return `""`.
- **Dates outside a field's `min` or `max` can't be submitted.** The dialog now checks them on submit.
