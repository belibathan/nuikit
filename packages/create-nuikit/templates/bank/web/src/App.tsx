import { BankSurface } from "@/components/blocks/bank/bank";

// The bank block (npx shadcn add @nuikit/bank). It's your code now: the panels are in
// components/blocks/bank, its messages in components/blocks/bank/nui.ts, and client/main.lua +
// server/main.lua decide what it shows and check every move.
export default function App() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <BankSurface />
    </main>
  );
}
