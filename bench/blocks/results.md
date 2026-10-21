# Blocks on components v2: results (Oct 21, 2026, `feat/blocks-071`)

What [`audit.md`](audit.md) found was fixed block by block (one commit each, `git log -- registry/nuikit/blocks`).
Proof is `shots/`: every block state at 1920×1080 in Graphite, the first (canonical) state of each
block at 2560×1440 and 1280×720 too, over a game scene, on the NUI scale (`html { font-size: 1.4815vh }`),
made by `node bench/blocks/shots.mjs` through the site's `/blocks/shot` route. `shots/<block>/index.html`
is a contact sheet per block. `shots/site/` is `/blocks` and `/theme` (full page in Graphite, and the first
viewport after switching to Signal, Velvet and Vector).

## What the screenshots show

- Every money value is one `Money` / `formatMoney` (tabular, the identity's numeric font): HUD wallet,
  pause card, bank balance and transactions (gains in success), garage fees, job account, death cost.
- Every empty state is an `EmptyState` (icon, title, one sentence): settings, scoreboard (no one / no
  match), garage (no vehicles / nothing in this tab), bank (no accounts / no transactions), job menu
  (no one nearby), inventory and shop as before.
- Read-only rows are `MenuRow readOnly`: settings key hints, scoreboard activities, bank transactions.
- Display moments wear `nk-display` (the identity's display face: Inter Tight in Graphite, Barlow
  Condensed in Signal, Fraunces in Velvet, Chakra Petch in Vector): the pause title, the loading server
  name; the loading percent is `Stat size="display"`; captions (`nk-caption`) carry the identity's label case.
- The pause player card is the kit's `PlayerCard` (initials, duty dot and words, money stats).
- The death screen is text on the game (`nk-on-game`): the world colour and shadow in any theme, and the
  red vignette is steady (the last 30 s are the `Countdown`'s own warning).
- Nothing animates `width` any more (loading tips), no raw durations (the background cross-fade follows
  `--nk-motion`), the target eye changes on `--nk-time`.
- All three resolutions: everything scales with the game's height, so 2560×1440 and 1280×720 are the
  1080p layout at 1.33× and 0.67×; nothing clips or wraps differently.

## Checks

- `pnpm typecheck`, `pnpm test` (incl. the 404 Lua checks of the block templates under Lua 5.4 and the
  studio's identity round-trip tests), `pnpm build:systems`, `nuikit check … --level 3`, `pnpm sync` clean.
- No page errors or console errors in any of the 88 shots (`shots.mjs` collects them).

## Not proven here

- In game: the blocks were not run on a server in this round (the owner is away from the test server).
  The checklist is in the PR. Nothing about the Lua side changed; the templates' server rules still pass
  their specs.
- Other identities: the per-block shots are Graphite. The site shots show Signal, Velvet and Vector on
  `/blocks` and `/theme`; `node bench/blocks/shots.mjs --ids=signal,velvet,vector` makes the full set.
