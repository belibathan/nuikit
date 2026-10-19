import { marked } from "marked";
import { useMemo } from "react";
import { Footer, Nav, REPO } from "@/components/site";

/** A page rendered from a markdown file in docs/, so the site and the repo never disagree. */
export function DocPage({ source, path }: { source: string; path: string }) {
  const html = useMemo(() => marked.parse(source, { async: false, gfm: true }) as string, [source]);
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-16">
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
