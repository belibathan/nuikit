import { formatMoney } from "@/components/ui/money";
import { useSyncExternalStore } from "react";

/** English fallbacks (the values in Renewed-Banking's locales/en.json for the keys the page uses). */
const FALLBACK: Record<string, string> = {
  account: " Account ",
  accounts: "Accounts",
  account_search: "Account Search...",
  account_not_found: "No accounts found",
  amount: "Amount",
  comment: "Comment",
  transfer: "Business or Citizen ID",
  cancel: "Cancel",
  confirm: "Submit",
  transactions: "Transactions",
  select_account: "Select any Account",
  message: "Message",
  balance: "Available Balance",
  frozen: "Account Status: Frozen",
  deposit_but: "Deposit",
  withdraw_but: "Withdraw",
  transfer_but: "Transfer",
  bank_name: "Los Santos Banking",
  trans_search: "Transaction Search (Message, TransID, Receiver)...",
  trans_not_found: "No transactions found",
  export_data: "Export Transaction Data",
  weeks: "%s weeks ago",
  aweek: "A week ago",
  days: "%s days ago",
  aday: "A day ago",
  hours: "%s hours ago",
  ahour: "A hour ago",
  mins: "%s minutes ago",
  amin: "A minute ago",
  secs: "A few seconds ago",
  personal: "Personal",
  org: "Organization",
  cash: "Cash",
  // nuikit additions (not in Renewed-Banking's locales; add these keys there to translate them)
  nuikit_all: "All",
  nuikit_in: "In",
  nuikit_out: "Out",
  nuikit_cash: "Cash",
  nuikit_atm: "ATM",
  nuikit_from: "From",
  nuikit_to: "To",
  nuikit_close: "Close",
  nuikit_loading: "Connecting…",
  nuikit_available: "Available",
  nuikit_total_in: "Money in",
  nuikit_total_out: "Money out",
  nuikit_recent: "Recent activity",
  nuikit_max: "Max",
};

let strings: Record<string, string> = {};
let currency = "USD";
let version = 0;
const listeners = new Set<() => void>();

export function setLocale(translations: Record<string, unknown> | undefined, cur?: string) {
  const next: Record<string, string> = {};
  for (const [k, v] of Object.entries(translations ?? {})) if (typeof v === "string") next[k] = v;
  strings = next;
  if (typeof cur === "string" && cur) currency = cur;
  version++;
  listeners.forEach((l) => l());
}

export function t(key: string, n?: number | string): string {
  const s = strings[key] ?? FALLBACK[key] ?? key;
  return n === undefined ? s : s.replace("%s", String(n));
}

/** "Cash: $" (the stock value) → "Cash". */
export const cashLabel = () => (strings.nuikit_cash ?? t("cash").replace(/[:\s$]+$/, "")) || "Cash";

type Style = "full" | "whole" | "compact";

/** A valid ISO 4217 code, or USD (an invalid Config.currency would throw in Intl). */
function validCurrency(code: string) {
  try {
    new Intl.NumberFormat("en-US", { style: "currency", currency: code });
    return code;
  } catch {
    return "USD";
  }
}

/**
 * Currency, like the stock page (en-US, Config.currency), through the kit's money format (registry
 * money: tabular, narrow symbol). Cents in full, none in whole; "compact" only kicks in from 100k.
 */
export function money(n: number | undefined | null, style: Style = "full"): string {
  const value = Number(n) || 0;
  if (style === "compact" && Math.abs(value) < 100000) style = "full";
  const cur = validCurrency(currency);
  if (style === "compact") return formatMoney(value, { currency: cur, compact: true, fractionDigits: 2 });
  return formatMoney(value, { currency: cur, fractionDigits: style === "whole" ? 0 : 2 });
}

/** The original's relative-time rule: largest whole unit, singular wording for exactly 1. */
export function ago(seconds: number, now = Date.now() / 1000): string {
  const elapsed = Math.max(0, Math.floor(now) - Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(elapsed / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  if (weeks > 1) return t("weeks", weeks);
  if (weeks === 1) return t("aweek");
  if (days > 1) return t("days", days);
  if (days === 1) return t("aday");
  if (hours > 1) return t("hours", hours);
  if (hours === 1) return t("ahour");
  if (minutes > 1) return t("mins", minutes);
  if (minutes === 1) return t("amin");
  return t("secs");
}

/** Re-render on locale changes. */
export function useLocale() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
  );
}
