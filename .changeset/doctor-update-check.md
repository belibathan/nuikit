---
"nuikit-core": patch
---

`nuikit doctor` checks GitHub once per start for a newer release (one console line when there is one; `nuikit_update_check 0` turns it off, `nuikit_update_delay` sets the wait). Version compare now ranks prereleases below their release. Release zips ship with `SHA256SUMS.txt`.
