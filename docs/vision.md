# What nuikit is for

*Written Oct 18, 2026, after 0.4.0; identity settled Oct 19. Read this before planning anything big.*

> **nuikit is the shared layer between scripts and screens on any FiveM server.** One runtime coordinates
> what every UI shares; scripts ask for intents, swappable themed renderers draw them, adapters bring existing
> scripts in, and bespoke screens join through the protocol (`docs/architecture.md`).
>
> We build it so **every step ships something useful on its own**, and **every mechanism is tested before we
> commit to it**.

## What the research says

1. **The original pitch is about to expire.** FiveM's NUI has run Chromium 103 for years, which is why
   nuikit started as a compiler that makes Tailwind v4 / shadcn render. Cfx has been testing Chromium 144
   since April 2026 and shipped it to the canary channel on Oct 14, 2026, with all channels expected to follow
   shortly. Once it lands, stock shadcn renders without help. The compiler becomes a compatibility shim for the
   rollout window, not a reason to exist. (Sources: citizenfx/fivem#4266, the Cfx forum CEF thread, a public
   project tracking the 103 → 144 migration.)
2. **There is no UI platform in FiveM.** Every resource ships its own page in its own iframe, with its own copy of
   React/Vue and Mantine, its own fonts, its own focus calls. Stacking is by load order, `SetNuiFocus` pushes the
   caller to the top, nothing coordinates Escape, and nothing shares a theme. Players run 10–30 UI resources at
   once: they fight over focus, double up (two notification systems), and cost real frames: several always-on
   UIs can drop a mid-range PC to 15–20 FPS.
3. **The ecosystem builds the same thing over and over.** Developers start from one of dozens of React + Mantine
   boilerplates, and ox_lib is the only shared UI most servers have: a fixed set of widgets driven from Lua.
   Sellers ship a full app per script, so every script on a server looks different.
4. **A shared host already works.** npwd (the open-source phone) loads other resources' apps into its own page as
   federated modules, so one resource rendering UI that another resource ships is proven.
5. **There is now a real standard for tokens.** The W3C Design Tokens Community Group published its first stable
   format (2025.10), so a theme can be a portable file, not "whatever CSS variables we happen to read".

## So what should nuikit be?

**The UI platform layer for FiveM:** the shared contract and runtime that every resource's interface plugs
into, so a server's UIs behave like one product, the way apps on an operating system share a window manager,
input and appearance. The kit we shipped is the first proof of it, not the product.

Three layers. Each stands alone; together they're the platform.

### 1. The protocol (the actual standard)

A versioned, framework-agnostic spec with a small Lua library any resource can depend on (like ox_lib is today),
and bindings for React first, then Vue, Svelte and plain JS:

- **Surfaces:** who owns focus, cursor and keyboard; layers (hud, world, panel, modal, system); Escape order;
  exclusivity; hide/block rules; states like `dead`. Already built (`NUI.surface`), today coordinated peer to peer.
- **Theme tokens:** the token contract (`docs/design.md`) published as a DTCG file plus CSS variables, with the
  compiler/validator from `docs/next/blocks.md` Part 0. Any resource that reads the tokens matches the server.
- **Context:** the player (bridge over Qbox, QBCore, ESX, ox_core, standalone), locale, UI scale, reduced motion.
- **Messaging:** typed events and callbacks from one schema, generating TypeScript types, Lua annotations and
  browser mocks.
- **Conformance:** `nuikit check` audits a resource (reads tokens, no hard-coded colours, registers surfaces,
  releases focus) and prints a pass. This is what "built on nuikit" means for sellers.

### 2. The host (the technology nobody has)

An optional `nuikit` resource that renders opted-in UIs in **one** frame instead of one iframe each:

- Resources ship a UI module (an ES module served from their own files) instead of a `ui_page`. The host loads it,
  mounts it in a surface, and routes its callbacks back to the owning resource's Lua.
- One framework runtime, one font load, one theme, one focus owner, real z-order, and a performance budget:
  hidden surfaces stop rendering, high-frequency messages are batched, and a dev overlay shows each UI's cost.
- Isolation where it matters: an error boundary per module (one broken UI can't blank the others), scoped styles,
  and a fallback to plain iframes for resources that don't opt in.
- The same surfaces can render **in the world** through DUI (phones, laptops, in-world screens) with the same
  components and theme.

This has to be proven with numbers before it's promised: build a prototype, then benchmark 10 UIs as iframes
vs the host (RAM, FPS, open latency) on a real server. If the gain is small, the host stays a convenience and the
protocol carries the platform.

### 3. The ecosystem (what makes people show up)

- **Kit:** finished systems and overrides for Qbox/ox_lib servers (0.4.0). The way server owners meet nuikit.
- **Components and blocks:** shadcn-native, built on the protocol (`docs/next/blocks.md`).
- **Tooling:** `create-nuikit`, browser devtools that fake the game, Lua tested under real Lua 5.4, the theme
  studio, and the Chromium 103 compiler kept only as a shim until 144 is everywhere.

## What changes now

1. **Messaging.** Stop leading with "renders right on Chromium 103". Servers: "one design system for your whole
   server" (done). Developers: "the UI platform for FiveM: build on it and your UI fits every server".
2. **Plan around Chromium 144.** Verify the kit on 144 (canary) now; keep 103 support until release-channel
   rollout is confirmed, then relax the 103-only rules in `CLAUDE.md` and turn the compiler into opt-in compat.
3. **0.5 order:** the theme engine (tokens as a standard) first, then components and blocks, as planned.
4. **Done early (on `feat/platform`):** protocol spec v1, `nuikit check`, the host prototype and benchmark.
5. **0.6: universal.** One runtime per server with an importable Lua API (`@nuikit/init.lua`), intents
   (what scripts ask for) separated from swappable renderers (how it looks), adapter packs so ox, QBCore and
   ESX scripts land on one themed UI without rewrites, shared services (surfaces, camera, controls) and
   `nuikit doctor`. Design, alternatives rejected, plan and risks: [`docs/architecture.md`](architecture.md).
6. **Later:** Vue and Svelte bindings, DUI surfaces, gamepad navigation, the seller program built on `nuikit check`.

## Status (Oct 19, 2026, `feat/platform`)

- **Protocol v1:** written (`docs/protocol.md`) and fully implemented: versioned manifests and handshake with
  capabilities, one Escape path, compiled themes with live reload, player prefs. `nuikit check` audits any
  resource; every nuikit page is at level 3 and CI keeps it there.
- **Tokens v1:** `docs/tokens.md`, a DTCG file and JSON Schema, `compileTheme` with contrast checks, one
  distribution path (`nuikit theme reload` repaints every UI live).
- **Host:** prototype works end to end (`docs/host.md`); benchmark in `bench/host/results.md`. The gain depends
  on whether FiveM gives each NUI frame its own process: up to −44% memory and −51% main-thread work at 20 UIs
  if so, about −5% memory (but half the JS heap) if not. Stays opt-in until that is measured in game.

## Risks, plainly

- **Cfx could ship something like this.** Unlikely soon (they've never shipped a UI layer), but stay protocol-first
  and framework-agnostic so nuikit fits alongside anything they add.
- **Adoption is a chicken-and-egg problem.** The kit gets nuikit onto servers first; the protocol only matters
  once developers see servers already running it.
- **The host shares one document.** A misbehaving or malicious module shares a JS context with the others, which
  iframes prevent. Keep the host opt-in per resource, isolate errors, and never give modules another resource's
  callbacks.
- **Scope.** The protocol is small and stable on purpose; everything opinionated (the look) lives in the kit and
  the registry, where servers can swap it out.
