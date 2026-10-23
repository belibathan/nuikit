---
"nuikit-core": minor
---

`nuikit install` / `nuikit upgrade` / `nuikit uninstall`: a server console command in the `nuikit` resource that merges the shipped overrides into the resources you run, backs up the stock files to `<resource>/.nuikit-backup/<version>/`, writes a manifest, keeps files you edited (`--force` to overwrite), and restores from the backup. `--dry-run` lists without writing. The zip now ships overrides under `[nuikit]/nuikit/overrides/` and `overrides.json` carries a byte hash per file. `nuikit doctor` reports an override that is outdated or edited and names the command. New in nuikit-core: `planInstall`, `planUninstall`, `formatInstall`, `bytesHash`, `overrideOutdated`. Guide: `docs/install.md`.
