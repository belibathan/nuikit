# nuikit-ox-lib-ui

## 0.2.1

### Patch Changes

- Updated dependencies
- Updated dependencies [94ce073]
- Updated dependencies [6ea19bb]
- Updated dependencies [5f4b6dd]
- Updated dependencies [1a68fb0]
- Updated dependencies [1a68fb0]
- Updated dependencies [ed88d66]
- Updated dependencies [401badf]
- Updated dependencies [f1fc0b3]
- Updated dependencies [e7c2aea]
- Updated dependencies [92684fc]
- Updated dependencies [bee6e1a]
- Updated dependencies [b759139]
- Updated dependencies [d67f306]
- Updated dependencies [d6eec14]
- Updated dependencies [031bf9f]
- Updated dependencies [7a04527]
- Updated dependencies [2ea77e5]
- Updated dependencies [7e782f3]
- Updated dependencies [eb68708]
- Updated dependencies [4f35582]
- Updated dependencies [378c07d]
- Updated dependencies [014dc32]
- Updated dependencies [eece522]
  - nuikit-core@0.9.0

## 0.2.0

### Minor Changes

- e9a665f: ox_lib override: notify, context and list menus, the input dialog, the alert, progress bar and circle, text UI and the skill check are routed to the `nuikit` resource's frame (`https://nuikit/intent`) and drawn by the shared, themed renderers in one stack with one focus owner, so a server's renderer pack restyles ox_lib too. Convar `nuikit_ox_route` (default on); without nuikit, or when the door refuses, the page draws locally as before. Every POST back to ox_lib is unchanged (`bench/screens/ox_lib`). Mapping and what's unproven in game: `docs/adapters/ox-lib.md`.

### Patch Changes

- Updated dependencies [30d20ea]
- Updated dependencies [71e9442]
- Updated dependencies [bc127c3]
- Updated dependencies [20f7092]
- Updated dependencies [22148ce]
- Updated dependencies [f510c7d]
  - nuikit-core@0.8.0

## 0.1.5

### Patch Changes

- db66763: Registry components read the design v2 component tokens (`--nk-panel-*`, `-row-*`, `-key-*`, `-chip-*`, `-meter-*`, `-gauge-*`, `-heading-*`, `-slab-*`) instead of fixed looks, so every identity restyles them without code changes.

  - **Slabs:** `notice` has an item add/remove slab (icon tile, name, delta) whose changes to the same item merge within 1.5 s; `key-prompt` is the prompt slab (key chip + verb) by default, takes no keys and wraps with `wrap`; `meter` has `variant="slab"`, the timed-progress slab (label, thin line, cancel key) that succeeds `task-progress`; new `band` for full-width states (incapacitated).
  - **Type:** countdown, money and stat heroes use `nk-display` in the numeric face; stat and meter labels use `nk-caption`.
  - **countdown** drains its line on its own between updates. **speedometer** draws gauge tokens (fill, redline, ticks, track width, numerals).
  - **form-field:** `DateField` has a picker that steps up to years and decades (as ox_lib's date row); date, range and time boxes size to their placeholder and digits; `TimeField` takes `icon` and `clearable`.
  - **menu-row:** `muted` (and ox's greys, `dark.3`) colours an uncoloured bar quietly.

  ox_lib's text UI uses key-prompt's no-keys and wrap. What scripts send and receive is unchanged.

- 0866f77: ox_lib and ox_target overrides now use more of the kit's `menu-row`, with fewer local workarounds:

  - ox_lib context menu: an option's `progress` bar, its read-only state and the hover card with `image` and `metadata` now come from `menu-row` (`progress`, `progressColor`, `readOnly`, `MenuRowDetails`). ox's `colorScheme` colours the bars through the theme (`green` is the theme's success, `red.6` its destructive), and each metadata bar keeps its own `colorScheme`. The image in the hover card fills its width.
  - ox_target: the four CSS rules that hid a stuck hover after a click are gone; the rows use `menu-row`'s `inert` instead.

  What scripts send and receive is unchanged.

- 677ab7e: Motion system (design v2 §5A, tokens 1.2). `compileTheme` derives a motion ladder from `--nk-motion-duration` (`--nk-time-snap` / `-hover` / `-base` / `-exit` / `-move` / `-modal` / `-screen` / `-ambient`, `--nk-stagger` and its cap), five easings and four springs (`--nk-spring-snap` / `-move` / `-soft` / `-pop`), from two new identity inputs, `--nk-motion-feel` (crisp, snap, smooth, stepped) and `--nk-motion-bounce`. Graphite is crisp, Signal snaps, Velvet glides with a slight bounce, Vector steps. Additive.

  Reduced motion now has two levels: a theme's `--nk-motion: 0` is off (as before), and the player's `reducedMotion` pref is "reduced" (`data-nk-motion="reduced"`): no movement, fades kept at most 100 ms. New `--nk-motion-move`. The prefs message is unchanged.

  New `nuikit-core/motion` entry (no dependencies, about 2 kB): springs sampled into Web Animations keyframes, retargeting with velocity, FLIP, timed runs, the selection indicator's key-repeat rule; `useSpring`, `useFlip` and `useIndicator` in `nuikit-core/react`.

  Kit: no text selection or image drag outside fields, themed scrollbars, selection, caret and placeholder; `nk-pop`, `nk-rise`, `nk-press`, `nk-stagger`, `nk-skeleton`, `nk-blink` and `nk-indicator`; keyboard and controller state (rows, tabs, toggles, focus) changes instantly. Components: `meter` and `progress-ring` timed runs and the `skill-check` needle are each one compositor animation (no per-frame JS or React renders); meter segments scale instead of resizing, and a critical meter blinks twice instead of pulsing forever. ox_lib's progress and skill check keep every request and timing.

- 897eb59: ox_lib override: `lib.alertDialog` now uses the kit's `confirm` component, which also renders the `confirm` intent. ox_lib's own behaviour is unchanged:

  - Escape always cancels, even when there's no Cancel button.
  - The first button has focus when the dialog opens, so Enter presses Cancel when it's shown and Confirm otherwise.
  - Custom labels, ox_lib's five sizes, centred or near the top, and scrolling content all work as before.

- 4d25c73: ox_lib override, progress circle (`lib.progressCircle`): now drawn with the kit's `progress-ring` on the game world, so it matches the kit and follows the theme. The run's timing is unchanged. `progressComplete` is posted at the same moments as before, after every hide, cancels included, and with reduced motion. The counter rises by 1 every `duration / 100` ms and reads 99 on a cancel, as in ox_lib.
- 6fb396b: ox_lib override: the input dialog's `date-range` and `time` rows use the kit's `form-field` presets (`DateRangeField`, `TimeField`): typed day/month/year and hour/minute boxes with arrow-key steps, in the order of the row's `format`. `time` shows 12-hour with AM/PM unless the row says `format = '24'`, as in ox_lib. A typed range outside `min`/`max`, or ending before it starts, gets a one-sentence error. The `date` row keeps its year picker. What Lua receives is unchanged.
- 010ec43: ox_lib override: `lib.inputDialog` rows now use the kit's `form-field` presets (text, password, textarea, number, checkbox, select, multi-select, slider and colour). The date row keeps the year picker from the input fixes, inside a form-field row. An invalid field now shows a one-sentence error under it.
- 31dcb59: ox_lib override, input dialog:

  - **Decimal numbers no longer block the dialog.** A number that didn't fit the field's step (for example 12.345 with `precision: 2`) stopped the dialog from submitting, with no message. It now submits rounded to `precision`, as ox_lib does.
  - **An untouched `select` returns `null`.** It used to return `""`.
  - **Dates outside a field's `min` or `max` can't be submitted.** The dialog now checks them on submit.
  - **The date field reaches any year quickly.** Click the calendar header to jump from the month to a page of years, and again to decades. You can also type the date as `YYYY-MM-DD`. Years and dates outside `min`/`max` are disabled, and with no default it opens on `max` when that is in the past (Qbox birth dates).

- bd9fca4: ox_lib override: the progress bar (`lib.progressBar`) fills with the kit `meter`'s own timed mode instead of a local CSS animation. The list menu's progress rows are a `meter` coloured with `meterColor()`, so ox colour names (`green`, `red.6`, `yellow`) follow the theme's status colours. The progress bar's timing is unchanged: `progressComplete` is posted at the same moments, cancels and reduced motion included.
- 0bf2b31: ox_lib override: `lib.notify` now uses the kit's `notice` and its stack, which render the `notify` intent. ox_lib's own notification rules still apply:

  - the default duration is 3 seconds;
  - a notification with an existing `id` updates in place;
  - at most 20 are on screen;
  - an `iconColor` or Font Awesome icon from the calling script is used as given;
  - nothing is posted back to Lua.

- c057fc4: ox_lib override, skill check (`lib.skillCheck`): now drawn with the kit's `skill-check`. The rules are ox_lib's, unchanged: the sweep, the zones, the keys, `inputs`, non-Latin layouts, sequences, cancel, and the `skillCheckOver` result. The zone briefly shows the result (success or destructive) as the check fades out.
- 8949dae: ox_lib override, text UI (`lib.showTextUI`): now drawn with the kit's `key-prompt`, so it matches every other key prompt and follows the theme. Key combinations written as `[Shift] + [E] Lock vehicle` now show both keys. Before, the second key ended up as a stray bullet with `[E]` left in the text. Text without a leading key, Markdown, icons, `iconColor`, `alignIcon`, `style` and the four positions work as before.
- Updated dependencies [a73299a]
- Updated dependencies [90c84b7]
- Updated dependencies [682de8e]
- Updated dependencies [677ab7e]
- Updated dependencies [fcaec05]
  - nuikit-core@0.7.0

## 0.1.4

### Patch Changes

- c81a98a: ox_lib override:

  - The list menu now scrolls by whole rows, so no half row shows under the header at the end of a long list.
  - Progress tracks stay visible on a highlighted row in themes where `muted` matches `accent`.
  - A 0 ms progress run now completes on the normal schedule (~100 ms) instead of being held to a 50 ms minimum.

- 6601116: ox_lib override: the context menu and list menu now use the kit's `panel` and `menu-row`, and the progress bar uses `meter`. These are the components behind the `menu` and `progress` intents. All messages and POSTs are unchanged: payloads, order and timing were checked before and after. Two fixes to progress completion, for both the bar and the circle:

  - With the player's reduce-motion preference on, `progressComplete` now posts after the run's `duration`. Before, it posted at once and the action failed.
  - A 0 ms progress now completes. Before, it never posted, so the run only ended on a cancel.
  - nuikit-core@0.6.0

## 0.1.3

### Patch Changes

- Updated dependencies [5d9eb9d]
- Updated dependencies [afa2e0a]
- Updated dependencies [f7b4d63]
  - nuikit-core@0.5.0

## 0.1.2

### Patch Changes

- Updated dependencies [8ff1605]
- Updated dependencies [677860a]
  - nuikit-core@0.4.0

## 0.1.1

### Patch Changes

- Updated dependencies [2ddceb9]
- Updated dependencies [79748d6]
- Updated dependencies [f8a3fe1]
  - nuikit-core@0.3.0
