---
"qbx-scoreboard-web": patch
---

qbx_scoreboard override rebuilt on the kit's components: a `panel` with a thin `meter` of players against slots under the title, and each activity as a read-only `menu-row` with a state dot (green available, amber in progress, hollow unavailable) and the word beside it. Opens and closes with the kit's pop (exit in `--nk-time-exit`). The page still posts nothing to qbx_scoreboard (`bench/screens/qbx_scoreboard`).
