# Queue resource restarts for nuikit_dev (dev servers only): .local\nk-restart.ps1 nuikit_hud ox_inventory
param([Parameter(ValueFromRemainingArguments)][string[]]$Names)
Add-Content -Encoding ascii "$PSScriptRoot\..\systems\nuikit_dev\restart.queue" ($Names -join "`n")
"queued: $($Names -join ', ') (applied within ~1s)"
