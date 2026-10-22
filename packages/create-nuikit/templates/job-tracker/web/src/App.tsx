import { JobTrackerSurface } from "@/components/blocks/job-tracker/job-tracker";
import { NuiNotices } from "@/components/ui/notice";

// The job tracker block (npx shadcn add @nuikit/job-tracker). It's your code now: the panel is in
// components/blocks/job-tracker, its messages in components/blocks/job-tracker/nui.ts, and
// client/main.lua + server/main.lua own the jobs, the steps and the pay. <NuiNotices /> shows
// nk.notify() from Lua.
export default function App() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <JobTrackerSurface />
      <NuiNotices />
    </main>
  );
}
