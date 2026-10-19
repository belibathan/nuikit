import type { Transaction } from "./types";

const COLUMNS = ["trans_id", "title", "amount", "trans_type", "receiver", "issuer", "message", "time"] as const;

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** RFC 4180 CSV: a header row, then one row per transaction. */
export function toCsv(rows: Transaction[]): string {
  return [COLUMNS.join(","), ...rows.map((r) => COLUMNS.map((c) => cell(r[c])).join(","))].join("\r\n");
}

/** Copy without the async Clipboard API, which CEF NUI doesn't reliably allow. */
export function copyText(text: string) {
  const el = document.createElement("textarea");
  el.value = text;
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.appendChild(el);
  el.select();
  try {
    document.execCommand("copy");
  } finally {
    el.remove();
  }
}
