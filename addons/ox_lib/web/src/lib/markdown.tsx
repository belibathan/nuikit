import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/** Script-provided markdown. Raw HTML is never rendered. `gfm` adds tables, strikethrough, task lists. */
export function Markdown({ children, gfm, className }: { children?: string | null; gfm?: boolean; className?: string }) {
  if (!children) return null;
  return (
    <div className={cn("ox-md", className)}>
      <ReactMarkdown remarkPlugins={gfm ? [remarkGfm] : []}>{String(children)}</ReactMarkdown>
    </div>
  );
}
