import { marked } from "marked";
import { useEffect, useState } from "react";
import { Footer, Nav, REPO } from "@/components/site";

/** Docs that have a page here; any other relative link goes to the file on GitHub. */
const ON_SITE: Record<string, string> = {
  "docs/protocol.md": "/protocol",
  "docs/intents.md": "/intents",
  "docs/adopt.md": "/adopt",
  "docs/design.md": "/design",
  "docs/coverage.md": "/coverage",
};

function resolve(href: string, from: string): string {
  if (/^(https?:|mailto:|#|\/)/.test(href)) return href;
  const [file, hash = ""] = href.split("#");
  const parts = from.split("/").slice(0, -1);
  for (const seg of (file || "").split("/")) {
    if (seg === "..") parts.pop();
    else if (seg && seg !== ".") parts.push(seg);
  }
  const target = parts.join("/");
  const page = ON_SITE[target];
  if (page) return page + (hash ? `#${hash}` : "");
  return `${REPO}/blob/main/${target}${hash ? `#${hash}` : ""}`;
}

/** A page rendered from a markdown file in docs/, so the site and the repo never disagree. */
export function DocPage({ load, path }: { load: () => Promise<string>; path: string }) {
  const [html, setHtml] = useState("");
  useEffect(() => {
    let live = true;
    load().then((source) => {
      if (!live) return;
      const parsed = marked.parse(source, { async: false, gfm: true }) as string;
      setHtml(parsed.replace(/href="([^"]+)"/g, (_, href: string) => `href="${resolve(href, path)}"`));
    });
    return () => void (live = false);
  }, [load, path]);
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <article className="doc" dangerouslySetInnerHTML={{ __html: html }} />
        <p className="mt-12 border-t pt-6 text-sm text-muted-foreground">
          This page is{" "}
          <a className="text-foreground underline underline-offset-4" href={`${REPO}/blob/main/${path}`}>
            {path}
          </a>{" "}
          in the repository.
        </p>
      </main>
      <Footer />
    </div>
  );
}
