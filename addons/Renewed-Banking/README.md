# nuikit for Renewed-Banking

A drop-in replacement for [Renewed-Banking](https://github.com/Renewed-Scripts/Renewed-Banking)'s interface (Qbox's default bank and ATM), built from stock shadcn/ui and themed by your server's `nuikit/theme.css`. You get an account switcher, a big balance, quick deposit / withdraw / transfer, and a filterable transactions table at the bank. ATMs get a compact single card. **Renewed-Banking's Lua is untouched.**

## Install

1. Download `nuikit-Renewed-Banking.zip` from the latest nuikit release (or take `overrides/Renewed-Banking/web/public` from `nuikit.zip`).
2. Back up `Renewed-Banking/web/public`.
3. Copy the zip's `web/public` folder over `Renewed-Banking/web/public` (merge and overwrite). It includes `build/bundle.js`, which Renewed-Banking's server checks for at start. The stock leftovers (`global.css`, `img/`) are unused and harmless.
4. Optional: add the `nuikit` resource (from `[nuikit]`) and paste any [TweakCN](https://tweakcn.com) theme into `nuikit/theme.css`. Without it, the stock shadcn neutral theme is used.
5. `restart Renewed-Banking` (or restart the server).

Keep the resource named `Renewed-Banking`; its server refuses to run under any other name. Updating Renewed-Banking replaces `web/public`, so re-copy the override afterwards. Built against Renewed-Banking v2.1.4.

## Behaviour notes

- Escape closes an open deposit/withdraw/transfer dialog first, then the bank.
- A dialog stays open if the server rejects the action (its notification says why); success closes it and refreshes balances.
- Frozen accounts show their frozen status instead of action buttons. The stock UI never did, because of a field-name mismatch (see the spec, §6).
- Labels nuikit adds (All / In / Out, Money in / out, …) can be translated by adding `nuikit_*` keys to Renewed-Banking's `locales/*.json` (list in the spec, §5).

## Edit it

`web/` is a normal Vite + React + shadcn app: `web/src/App.tsx` (layouts), `web/src/features` (accounts, transactions, money dialog), stock shadcn components in `web/src/components/ui`. The full message protocol it implements is in [`docs/renewed-banking-protocol.md`](../../docs/renewed-banking-protocol.md).

```bash
# from the nuikit repo root
pnpm install
pnpm --filter nuikit-renewed-banking-ui dev     # browser; press ` to fire any Renewed-Banking message
                                                # (?bank or ?atm opens it straight away)
pnpm --filter nuikit-renewed-banking-ui build   # writes addons/Renewed-Banking/web/build
```

## License

Renewed-Banking is CC BY-NC-SA 4.0 © Renewed Scripts. This is a separate, clean-room implementation of its UI protocol, written from a behavioural spec. It contains no Renewed-Banking code, markup or styles. MIT, by [@belibathan](https://github.com/belibathan).
