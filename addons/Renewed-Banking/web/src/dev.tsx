// Renewed-Banking's traffic, faked for browser development. Press ` for the devtools.
// Each preset is a payload Renewed-Banking's Lua really sends (docs/renewed-banking-protocol.md).
// Lua sends these flat ({ action, ...fields }); the devtools wrap them in `data`, which the page also reads.
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import { browserReplies } from "@/lib/nui";
import type { Account, Transaction } from "@/lib/types";

const now = () => Math.floor(Date.now() / 1000);
const uuid = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => ((c === "x" ? Math.random() * 16 : 8 + Math.random() * 4) | 0).toString(16));
const tx = (p: Partial<Transaction> & { amount: number; trans_type: string }, agoSec: number): Transaction => ({
  trans_id: uuid(),
  title: "Personal Account / TRP48213",
  receiver: "Jordan Vale",
  issuer: "Jordan Vale",
  message: "",
  time: now() - agoSec,
  ...p,
});

const translations = {
  bank_name: "Los Santos Banking",
  account: " Account ",
  accounts: "Accounts",
  balance: "Available Balance",
  cash: "Cash: $",
  personal: "Personal",
  org: "Organization",
  frozen: "Account Status: Frozen",
  secs: "A few seconds ago",
  amin: "A minute ago",
  mins: "%s minutes ago",
  ahour: "A hour ago",
  hours: "%s hours ago",
  aday: "A day ago",
  days: "%s days ago",
  aweek: "A week ago",
  weeks: "%s weeks ago",
};

const personal: Account = {
  id: "TRP48213",
  type: "Personal",
  name: "Jordan Vale",
  frozen: 0,
  amount: 48250,
  cash: 1320,
  transactions: [
    tx({ amount: 2500, trans_type: "deposit", message: "Paycheck — Los Santos Customs", issuer: "Los Santos Customs" }, 40),
    tx({ amount: 85, trans_type: "withdraw", message: "Jordan Vale has withdrawed $85", receiver: "Jordan Vale" }, 600),
    tx({ amount: 1200, trans_type: "withdraw", message: "Rent — Alta St apt 4", receiver: "Dynasty 8" }, 3 * 3600),
    tx({ amount: 400, trans_type: "deposit", message: "Thanks for the tow", issuer: "Casey Reed", title: "Personal Account / TRP10077" }, 26 * 3600),
    tx({ amount: 15000, trans_type: "deposit", message: "Vehicle sale — Sultan RS", issuer: "Morgan Hale" }, 5 * 86400),
    tx({ amount: 650, trans_type: "withdraw", message: "Weazel News subscription", receiver: "Weazel News" }, 9 * 86400),
    tx({ amount: 3200, trans_type: "withdraw", message: "Insurance premium", receiver: "Mors Mutual" }, 16 * 86400),
    tx({ amount: 900, trans_type: "deposit", message: "Jordan Vale has deposited $900" }, 22 * 86400),
  ],
};

const police: Account = {
  id: "police",
  type: "Organization",
  name: "Los Santos Police",
  frozen: false,
  amount: 1250400,
  transactions: [
    tx({ amount: 25000, trans_type: "deposit", title: "Los Santos Police / police", message: "City budget — October", issuer: "City Hall", receiver: "Los Santos Police" }, 7200),
    tx({ amount: 4800, trans_type: "withdraw", title: "Los Santos Police / police", message: "Fleet maintenance", issuer: "Los Santos Police", receiver: "Los Santos Customs" }, 2 * 86400),
  ],
  auth: {},
  creator: null,
};

const shared: Account = { id: "valefamily", type: "Organization", name: "Vale Family Savings", frozen: false, amount: 8200, transactions: [], auth: { TRP48213: true }, creator: "TRP48213" };
const frozen: Account = { id: "ballas", type: "Organization", name: "Grove Holdings", frozen: true, amount: 312, transactions: {} as never, auth: [], creator: null };

let state: Account[] = [personal, police, shared, frozen];

/** The browser stand-in for the server callbacks: mutate, then answer with the full account list. */
function act(kind: "deposit" | "withdraw" | "transfer") {
  return (body: { fromAccount: string; amount: number; comment: string; stateid: string }) => {
    const amount = Number(body.amount);
    if (!amount || amount < 1) return false;
    const acc = state.find((a) => a.id === body.fromAccount);
    if (!acc) return false;
    const me = state[0];
    const msg = body.comment || `Jordan Vale has ${kind === "deposit" ? "deposited" : kind === "withdraw" ? "withdrawed" : "transfered"} $${amount}`;
    const list = Array.isArray(acc.transactions) ? acc.transactions : [];
    if (kind === "deposit") {
      if ((me.cash ?? 0) < amount) return notify("Account does not have enough funds!");
      me.cash = (me.cash ?? 0) - amount;
      acc.amount += amount;
    } else {
      if (acc.amount < amount) return notify("Account does not have enough funds!");
      if (kind === "transfer" && body.stateid === "nobody") return notify("Failed to transfer to unknown account!");
      acc.amount -= amount;
      if (kind === "withdraw") me.cash = (me.cash ?? 0) + amount;
      const target = state.find((a) => a.id === body.stateid);
      if (target) target.amount += amount;
    }
    acc.transactions = [tx({ amount, trans_type: kind === "deposit" ? "deposit" : "withdraw", message: msg, receiver: kind === "transfer" ? body.stateid : "Jordan Vale" }, 0), ...list];
    state = state.map((a) => ({ ...a }));
    return new Promise((r) => setTimeout(() => r(state), 600));
  };
}

function notify(text: string) {
  send({ action: "notify", status: text });
  return false;
}

/** Deliver a message the way SendNUIMessage does for Renewed-Banking: flat. */
function send(msg: Record<string, unknown>) {
  window.dispatchEvent(new MessageEvent("message", { data: msg }));
}

browserReplies.deposit = act("deposit");
browserReplies.withdraw = act("withdraw");
browserReplies.transfer = act("transfer");
browserReplies.closeInterface = () => "ok";

const mocks = defineMocks({
  events: {
    updateLocale: [{ translations, currency: "USD" }, { translations, currency: "EUR" }],
    setLoading: [{ status: true }, { status: false }],
    setVisible: [
      { status: true, accounts: state, loading: false, atm: false },
      { status: true, accounts: state, loading: false, atm: true },
      { status: true, accounts: [personal], loading: false, atm: false },
    ],
    notify: [{ status: "Account does not have enough funds!" }, { status: "Failed to transfer to unknown account!" }],
  },
});

declare global {
  interface Window {
    __rb?: { send: typeof send; accounts: () => Account[]; reset: () => void };
  }
}

export default function Dev() {
  useEffect(() => {
    window.__rb = {
      send,
      accounts: () => state,
      reset: () => {
        state = [personal, police, shared, frozen].map((a) => ({ ...a }));
      },
    };
    send({ action: "updateLocale", translations, currency: "USD" });
    const q = new URLSearchParams(location.search);
    if (q.has("atm") || q.has("bank")) {
      send({ action: "setVisible", status: true, accounts: state, loading: false, atm: q.has("atm") });
    }
  }, []);
  return <NuiDevtools events={mocks.events as never} scene="dusk" />;
}
