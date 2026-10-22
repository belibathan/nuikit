// Renewed-Banking: flat messages ({ action, ...fields }); posts closeInterface / deposit / withdraw / transfer
// (docs/renewed-banking-protocol.md). Bank, a deposit, the ATM, Escape.
export const resource = "Renewed-Banking";
export const entry = "index.html";
export const scene = "street.jpg";

const now = Math.floor(Date.now() / 1000);
const tx = (id, amount, trans_type, message, ago) => ({ trans_id: id, title: "Personal Account / TRP48213", receiver: "Jordan Vale", issuer: "Jordan Vale", message, time: now - ago, amount, trans_type });
const personal = {
  id: "TRP48213",
  type: "Personal",
  name: "Jordan Vale",
  frozen: false,
  amount: 48210,
  cash: 1520,
  transactions: [tx("a1", 1200, "deposit", "Paycheck", 120), tx("a2", 85, "withdraw", "Gas", 3600), tx("a3", 400, "transfer", "Rent share", 86400)],
};
const org = { id: "police", type: "Organization", name: "LSPD", frozen: false, amount: 912000, transactions: [] };
const translations = { bank_name: "Los Santos Banking", account: " Account ", accounts: "Accounts", balance: "Available Balance", cash: "Cash: $", personal: "Personal", org: "Organization" };

export async function run({ send, shot, sleep, page, at }) {
  await send("locale", { action: "updateLocale", translations, currency: "USD" });
  await send("open", { action: "setVisible", status: true, accounts: [personal, org], loading: false, atm: false });
  await sleep(700);
  await shot("bank");

  at("escape");
  await page.keyboard.press("Escape");
  await sleep(600);

  await send("open-atm", { action: "setVisible", status: true, accounts: [personal], loading: false, atm: true });
  await sleep(700);
  await shot("atm");
  at("escape-atm");
  await page.keyboard.press("Escape");
  await sleep(600);
}
