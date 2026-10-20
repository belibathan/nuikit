---
"create-nuikit": patch
---

Bank's money dialog is the kit's Confirm with form-field rows (TextField for amount, recipient and note; Enter in a field still sends), and job-menu's fire confirm is the kit's Confirm (focus on "Keep them"). Both surfaces are now `escape = 'back'`: Escape closes the dialog first, then the menu, through nuikit. Escape typed in a bank field first moves to Cancel, since nuikit leaves Escape in a field to the field. What each sends to Lua is unchanged.
