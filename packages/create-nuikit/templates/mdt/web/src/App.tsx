import { MdtSurface } from "@/components/blocks/mdt/mdt";
import { NuiNotices } from "@/components/ui/notice";

// The MDT block (npx shadcn add @nuikit/mdt). It's your code now: the terminal is in
// components/blocks/mdt, its messages in components/blocks/mdt/nui.ts, and client/main.lua +
// server/main.lua decide who may use it and run every search and report. <NuiNotices /> shows
// nk.notify() from Lua.
export default function App() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <MdtSurface />
      <NuiNotices />
    </main>
  );
}
