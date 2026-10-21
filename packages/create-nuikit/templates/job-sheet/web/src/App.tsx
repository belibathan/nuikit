import { JobSheetSurface } from "@/components/blocks/job-sheet/job-sheet";

// The job-sheet block (npx shadcn add @nuikit/job-sheet). It's your code now: the sheet is in
// components/blocks/job-sheet, its messages in components/blocks/job-sheet/nui.ts, and
// client/main.lua + server/main.lua decide what it shows and check every row.
export default function App() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <JobSheetSurface />
    </main>
  );
}
