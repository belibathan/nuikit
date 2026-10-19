# Renewed-Banking NUI protocol: compatibility spec

Target: drop-in replacement for `Renewed-Banking/web/public` (Renewed-Banking **v2.1.4**, commit `e4c3c63`).
Scope: everything that crosses the boundary between Renewed-Banking's client Lua and its NUI page, plus the UI behaviour the Lua and server depend on.

> Clean-room note. Renewed-Banking is CC BY-NC-SA 4.0. This document describes the wire protocol and observable behaviour in our own words. It doesn't reproduce Renewed-Banking source, markup or styles. Message names, field names, locale keys and small literal values appear only as interface facts.

Conventions:

- **Inbound** means Lua → UI via `SendNUIMessage`. **Renewed-Banking messages are flat**: `event.data` is `{ action, ...fields }`. There is **no `data` wrapper**. (Our dev fixtures also accept `{ action, data: { ...fields } }`; the page merges the two.)
- **Outbound** means UI → Lua: `fetch('https://Renewed-Banking/<name>', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8' }, body: JSON.stringify(payload) })`.
- Lua `nil` arrives as an absent key. An empty Lua table may arrive as `[]` or `{}`.
- "Focus" means `SetNuiFocus`. **The UI never sets focus.** Lua does it (§4).

---

## 0. Page, files and the resource-name lock

| Item | Requirement |
|---|---|
| Entry | `ui_page 'web/public/index.html'`. `files` lists `web/public/index.html` and `web/public/**/*`. Everything we ship lives under `web/public/`, with relative asset paths (`base: './'`). |
| **Hard server check** | 500 ms after start, the server calls `LoadResourceFile('Renewed-Banking', 'web/public/build/bundle.js')`. If that file is missing, **or the resource isn't named exactly `Renewed-Banking`**, it errors `ui_not_built` and **stops the resource**. Our build must emit `web/public/build/bundle.js` (the page's JS entry). Other asset names are free. |
| Resource name | The original hard-codes `Renewed-Banking` in callback URLs. Because the server refuses any other name, `GetParentResourceName()` always returns the same value. We use `GetParentResourceName()`. |
| Stock files left behind | Installing by copying over the stock `web/public` leaves `global.css`, `img/bank.png` and `build/bundle.css` in place. Our `index.html` doesn't reference them, so they're inert. |
| Transparency | `html`/`body` background transparent; no page scrollbars. |
| External assets | The original pulls Roboto from Google Fonts and Font Awesome 6 from cdnjs at runtime. We bundle everything (lucide icons, system/theme font). |

## 1. Message index

### 1.1 Inbound (Lua → UI)

| action | Sent by | Fields | Effect |
|---|---|---|---|
| `updateLocale` | client `framework.lua`: on player loaded (qb/qbx/esx) and on resource start when already loaded | `translations`: the whole ox_lib locale table (`lib.getLocales()`), `currency`: string from `Config.currency` (default `'USD'`) | Store translations and the ISO 4217 currency code used for every amount. Sent once, before any open. |
| `setLoading` | `openBankUI`, first thing | `status: true` | Show a full-screen loading state. It is **not** gated on visibility: the UI isn't visible yet when this arrives. |
| `setVisible` | `openBankUI`, ~1 s after the server callback returns | `status`: boolean (in practice always `true`), `accounts`: Account[] (§2), `loading`: `false`, `atm`: boolean | Replace the account list, select `accounts[1]` (first, the personal account), set visibility to `status`, set loading to `loading`, set ATM mode to `atm`. |
| `notify` | client event `Renewed-Banking:client:sendNotification(msg)` (server: "not enough money", "failed transfer", …) | `status`: string | Show an in-bank toast with that text for **3.5 s**. A falsy msg is never sent. It may arrive while the bank is closed. The original only renders it inside the visible bank. |

No other inbound messages exist. **There is no close message.** Nothing in Lua ever sends `setVisible` with `status = false`.

### 1.2 Outbound (UI → Lua)

| name | Body | Lua response | Effect |
|---|---|---|---|
| `closeInterface` | `{}` | `'ok'` (a bare string, **not valid JSON**: `res.json()` rejects; ignore it) | `SetNuiFocus(false, false)`. |
| `deposit` | `{ fromAccount, amount, comment, stateid }` | Account[] on success, `false` on failure | Cash → account. Server: `tonumber(amount)`, rejects `nil`/`< 1` with an ox_lib notify `invalid_amount`. An empty comment becomes an auto message. Not enough cash → inbound `notify` `not_enough_money`, response `false`. |
| `withdraw` | same | Account[] / `false` | Account → cash. For an org account, the account balance must cover it. For personal, the bank balance must. |
| `transfer` | same, `stateid` = target | Account[] / `false` | Target is an org account id **or** a citizen id (`stateid` string). Unknown target → `notify` `fail_transfer`, `false`. Some failing paths still return the full Account[], so treat any array as the new truth. |

Body details (all three money actions):

| Field | Type | Notes |
|---|---|---|
| `fromAccount` | string | `id` of the account whose action button was pressed (personal: the citizen id; org: the job/gang/shared account id). |
| `amount` | number | The original sends the bound number input (a number, `0` by default; can be `null` when cleared). The server `tonumber`s it. |
| `comment` | string | `""` when empty (the server then writes its own description). The server escapes quotes. |
| `stateid` | string | `""` for deposit/withdraw; the target account/citizen id for transfer. |

All four callbacks are registered on the client; the three money ones are proxied straight to `lib.callback.await('Renewed-Banking:server:<name>', data)`.

## 2. Account and transaction shapes

`Account` (array order: the personal account is **always index 0**, then job accounts the player is authorised for, then the gang account, then shared accounts):

| Field | Personal account | Org / shared account |
|---|---|---|
| `id` | citizen id (string) | account id, e.g. `police`, or a custom shared id |
| `type` | locale `personal` ("Personal") | locale `org` ("Organization") |
| `name` | character name | society label or custom name |
| `amount` | bank balance (number) | account balance (number) |
| `cash` | **cash on hand** (number). Only here. | absent |
| `frozen` | the player row's `isFrozen` (**number** `0`/`1`) | **boolean** |
| `transactions` | Transaction[] (may be `{}`/`[]`) | Transaction[] |
| `auth` | absent | `{ [citizenid]: true }` (or `[]` when empty). Not used by the UI. |
| `creator` | absent | citizen id or `null`. Not used by the UI. |

`Transaction` (newest first: the server inserts at position 1):

| Field | Type | Meaning |
|---|---|---|
| `trans_id` | string | UUID-like id. A transfer creates **two** rows (one per account) with the **same** `trans_id`. |
| `title` | string | e.g. "Personal Account / ABC123" or "LSPD / police" |
| `amount` | number | Always positive. The direction is in `trans_type`. |
| `trans_type` | `'deposit'` \| `'withdraw'` | Money in / out of this account. |
| `receiver` | string | Name of the receiving party |
| `issuer` | string | Name of the issuing party |
| `message` | string | The comment (quotes escaped by the server), or the auto message |
| `time` | number | Unix seconds (`os.time()`) |

## 3. UI behaviour the protocol depends on

| Behaviour | Original | Ours |
|---|---|---|
| Visibility | Shown only while `status` from the last `setVisible` is true. Hidden locally on Escape. | Same. |
| Selected account | Reset to `accounts[0].id` on every `setVisible`. Clicking an account card selects it. | Same; after a money action we keep the current selection if its id still exists. |
| Cash display | `accounts[0].cash` formatted as currency. | Same, in the header. |
| Action buttons per account | Deposit (hidden in ATM mode), Withdraw, Transfer. Replaced by the `frozen` text when frozen. | Same rules. See §6 quirk 2 about which field means frozen. |
| Money dialog | Title "`type` + `account` + `/ ` + `id`". Fields: amount, comment, plus the transfer target for transfers. Cancel / confirm. | Same fields. Confirm is disabled until amount > 0 (and a target for transfers). |
| After confirm | Closes the dialog at once, shows loading, waits for the response, then **1 s later** replaces `accounts` (unless `false`) and clears loading. | Keeps the dialog open with a busy button until the response arrives. An array replaces `accounts` and closes the dialog. `false` leaves the dialog open (the server's `notify` explains why). No artificial 1 s delay. |
| Transaction search | Case-insensitive substring over `message`, `trans_id`, `receiver`. | Same, plus a direction filter (all / in / out). |
| Account search | Case-insensitive substring over `name`. | Same. |
| Relative time | From `time`: `weeks`/`aweek`/`days`/`aday`/`hours`/`ahour`/`mins`/`amin`/`secs` (`%s` replaced by the count). | Same keys, same thresholds. |
| Export | Bank mode only. Copies a CSV of the selected account's transactions to the clipboard via a hidden input and `document.execCommand('copy')`. Shows the hard-coded "Data copied to clipboard!" or, when empty, "No transactions to export!". | Same mechanism; our own CSV writer (header row, one row per transaction, RFC 4180 quoting). Same two English messages. |
| ATM mode (`atm: true`) | No Deposit button and no Export button. Withdraw and Transfer stay. | Same rules, in a compact single-card layout. |
| Loading | Full-screen spinner while `loading`, independent of visibility. | Same. Plus a 15 s safety timeout while not visible (see §6 quirk 4). |

## 4. Focus and Escape

| Moment | Who | What |
|---|---|---|
| Open (`Renewed-Banking:client:openBankUI`, after the ox_lib progress bar) | Lua | `setLoading` → `SetNuiFocus(true, true)` → server callback → after 1 s `setVisible`. |
| Init failure (server returns nothing) | Lua | `SetNuiFocus(false, false)` and an ox_lib error notify. **No message to the UI**, so `loading` stays `true`. |
| Escape | UI | Only while visible: POST `closeInterface` with `{}`, hide locally, close any open money dialog. Lua drops focus. |
| `/closeBankUI` command | Lua | Drops focus only. **The UI isn't told and stays visible** but unclickable until the next open. |

The UI never calls focus natives.

Ours: while a money dialog is open, the first Escape closes only the dialog. The next Escape closes the bank (posts `closeInterface`).

## 5. Locale keys used by the page

From `translations` (ox_lib flattens nested keys; Renewed-Banking's are all top level). English values from `locales/en.json` are our fallbacks when a key is missing:

`account` (" Account ", note the surrounding spaces; used as `type + account + "/ " + id`), `accounts`, `account_search`, `account_not_found`, `amount`, `comment`, `transfer` (the transfer-target label), `cancel`, `confirm`, `transactions`, `select_account`, `message`, `balance`, `frozen`, `deposit_but`, `withdraw_but`, `transfer_but`, `bank_name`, `trans_search`, `trans_not_found`, `export_data`, `weeks`, `aweek`, `days`, `aday`, `hours`, `ahour`, `mins`, `amin`, `secs`, `personal`, `org`.

Ours also uses `cash` (the stock value is "Cash: $", so we strip a trailing `: $`/`$`). Labels nuikit adds are English constants, overridable by adding the same-named keys to Renewed-Banking's locale files: `nuikit_all`, `nuikit_in`, `nuikit_out`, `nuikit_cash`, `nuikit_atm`, `nuikit_from`, `nuikit_to`, `nuikit_loading`, `nuikit_total_in`, `nuikit_total_out`, `nuikit_recent`, `nuikit_max`.

## 6. Quirks

1. **Flat messages.** Fields sit next to `action`, not under `data`. A generic `{action, data}` listener sees `data === undefined`.
2. **Frozen flag mismatch.** The original page tests `account.isFrozen`, but the server sends `frozen` (boolean for org accounts, number `0`/`1` for the personal account). So the stock UI **never** shows an account as frozen. We treat `frozen === true || frozen === 1` (and `isFrozen` the same way) as frozen. A frozen account shows the `frozen` text instead of buttons. This is the only behavioural difference a player could notice, and only for accounts an admin actually froze.
3. **`closeInterface` replies `'ok'`**, which isn't JSON. Swallow the parse error.
4. **Loading can stick.** If the server callback fails, Lua drops focus but never clears `loading`. The original then shows its spinner until the next successful open. Ours clears the loading state after 15 s if `setVisible` hasn't arrived.
5. **No close message.** `/closeBankUI` removes focus but the UI stays drawn. Only an Escape inside the UI (or the next `setVisible`) changes visibility.
6. **`notify` outside the bank.** It can arrive after the player has closed the bank (slow server). The original renders toasts only inside the visible bank, so they're lost. Ours shows them regardless of visibility (they're transient, 3.5 s, and click-through).
7. **Currency.** `Config.currency` is passed to `Intl` as an ISO code. An invalid code throws in the original. Ours falls back to `USD`.
8. **Personal transactions may be `{}`.** Normalise any non-array to `[]`.
9. **Duplicate `trans_id`s** exist across accounts (a transfer writes one row per side). Within one account they're unique, so key rows by `trans_id` + index.
10. **Initial selection.** `setVisible` always selects the first account, even when the player had a different one selected before closing.

## 7. Checklist

- [x] Build emits `index.html` + `build/bundle.js` at the root of the override (`web/public/`).
- [x] Flat inbound messages: `updateLocale`, `setLoading`, `setVisible`, `notify`.
- [x] Outbound `closeInterface` `{}` on Escape (only while visible); response ignored.
- [x] `deposit` / `withdraw` / `transfer` with `{ fromAccount, amount: number, comment: string, stateid: string }`; an array response replaces accounts, `false` keeps state.
- [x] Personal account first; cash from `accounts[0].cash`.
- [x] ATM: no deposit, no export.
- [x] Frozen accounts: no action buttons.
- [x] Searches and relative times use the locale keys in §5.
- [x] CSV export to clipboard via `execCommand('copy')`.
- [x] Never calls focus natives; transparent body.
