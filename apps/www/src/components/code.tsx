import { Check, Copy } from "@/components/ui/icons";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Copy"
      className={cn("text-muted-foreground", className)}
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
    >
      {done ? <Check /> : <Copy />}
    </Button>
  );
}

export function Command({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("flex h-12 items-center gap-3 rounded-md border bg-muted/40 pr-2 pl-4 font-mono text-sm", className)}>
      <span className="select-none text-muted-foreground">$</span>
      <span className="flex-1 truncate">{children}</span>
      <CopyButton text={children} />
    </div>
  );
}

const LUA_KW = /\b(local|function|end|return|if|then|else|elseif|for|in|do|while|true|false|nil|and|or|not)\b/;
const TS_KW = /\b(import|from|export|const|let|function|return|await|async|if|else|interface|type|declare|module|new|true|false|null)\b/;

/** A deliberately tiny highlighter: comments, strings, keywords, calls. */
function highlight(code: string, lang: "ts" | "lua" | "bash"): ReactNode[] {
  const kw = lang === "lua" ? LUA_KW : TS_KW;
  const comment = lang === "lua" ? /--.*$/ : lang === "bash" ? /#.*$/ : /\/\/.*$/;
  return code.split("\n").map((line, i) => {
    const out: ReactNode[] = [];
    let rest = line;
    let k = 0;
    while (rest.length) {
      const c = comment.exec(rest);
      const s = /(["'`])(?:\\.|(?!\1).)*\1/.exec(rest);
      const w = kw.exec(rest);
      const f = /\b([A-Za-z_][\w.]*)(?=\()/.exec(rest);
      const hits = [c && { m: c, cls: "text-muted-foreground/70 italic" }, s && { m: s, cls: "text-chart-1" }, w && { m: w, cls: "text-primary" }, f && { m: f, cls: "text-chart-2" }]
        .filter(Boolean)
        .sort((a, b) => a!.m.index - b!.m.index) as { m: RegExpExecArray; cls: string }[];
      const hit = hits[0];
      if (!hit) {
        out.push(rest);
        break;
      }
      if (hit.m.index) out.push(rest.slice(0, hit.m.index));
      out.push(
        <span key={k++} className={hit.cls}>
          {hit.m[0]}
        </span>,
      );
      rest = rest.slice(hit.m.index + hit.m[0].length);
    }
    return (
      <div key={i} className="min-h-[1.5em]">
        {out}
      </div>
    );
  });
}

export function CodeBlock({ code, lang, title, className }: { code: string; lang: "ts" | "lua" | "bash"; title?: string; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      {title && (
        <div className="flex items-center justify-between border-b px-4 py-2 text-xs text-muted-foreground">
          <span className="font-mono">{title}</span>
          <CopyButton text={code} />
        </div>
      )}
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-card-foreground">{highlight(code.trim(), lang)}</pre>
    </div>
  );
}
