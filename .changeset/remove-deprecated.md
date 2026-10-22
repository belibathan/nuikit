---
"create-nuikit": minor
---

New projects show `NUI.notify()` with `<NuiNotices />` from `notice` (the kit's notice stack) instead of the Sonner `NuiToaster`; `sonner` and `next-themes` are no longer template dependencies. The registry drops `key-hint`, `task-progress` and `nui-toaster` (deprecated since 0.6.0): use `key-prompt`, `meter` (`variant="slab"`) or `progress-ring`, and `notice`.
