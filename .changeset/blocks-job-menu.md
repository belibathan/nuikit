---
"create-nuikit": minor
---

A job-menu block: `npm create nuikit@latest my-jobs -- -t job-menu` gives a duty toggle and the job's actions, and for the boss a Staff tab with the job account, promote, demote, fire (with a confirm) and hire whoever is nearby. The server checks every request against the caller's own job and grade, never what the page says; a standalone example (jobs and grades in `config.lua`, who works where per player in a JSON file) and `Config.sync` to mirror changes into Qbox, QBCore or ESX. Also in the registry (`…/r/job-menu.json`) and on `/blocks`.
