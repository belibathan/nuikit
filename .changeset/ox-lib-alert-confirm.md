---
"nuikit-ox-lib-ui": patch
---

ox_lib override: `lib.alertDialog` now uses the kit's `confirm` component, which also renders the `confirm` intent. ox_lib's own behaviour is unchanged:

- Escape always cancels, even when there's no Cancel button.
- The first button has focus when the dialog opens, so Enter presses Cancel when it's shown and Confirm otherwise.
- Custom labels, ox_lib's five sizes, centred or near the top, and scrolling content all work as before.
