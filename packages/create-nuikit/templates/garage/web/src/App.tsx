import { GarageSurface } from "@/components/blocks/garage/garage";

// The garage block (npx shadcn add @nuikit/garage). It's your code now: the panel is in
// components/blocks/garage, its messages in components/blocks/garage/nui.ts, and client/main.lua +
// server/main.lua decide what it shows and what each button does.
export default function App() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <GarageSurface />
    </main>
  );
}
