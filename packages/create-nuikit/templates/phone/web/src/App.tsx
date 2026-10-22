import { PhoneSurface } from "@/components/blocks/phone/phone";
import { NuiNotices } from "@/components/ui/notice";

// The phone block (npx shadcn add @nuikit/phone). It's your code now: the shell and the apps are in
// components/blocks/phone, its messages in components/blocks/phone/nui.ts, and client/main.lua +
// server/main.lua own the numbers, the contacts and the texts. <NuiNotices /> shows nk.notify() from
// Lua (a new text while the phone is closed).
export default function App() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <PhoneSurface />
      <NuiNotices />
    </main>
  );
}
