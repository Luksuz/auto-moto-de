import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  pages: number;
  /** Current search params (without `page`) to preserve in links. */
  params: Record<string, string | undefined>;
}

function buildHref(params: Record<string, string | undefined>, page: number) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "page") continue;
    if (value) sp.set(key, value);
  }
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return `/vozila${qs ? `?${qs}` : ""}`;
}

/** Compact page list: 1 … (p-1) p (p+1) … last */
function pageList(page: number, pages: number): (number | "...")[] {
  if (pages <= 7) {
    return Array.from({ length: pages }, (_, i) => i + 1);
  }
  const out: (number | "...")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);
  if (start > 2) out.push("...");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < pages - 1) out.push("...");
  out.push(pages);
  return out;
}

export function Pagination({ page, pages, params }: PaginationProps) {
  if (pages <= 1) return null;

  const items = pageList(page, pages);

  return (
    <nav
      className="flex items-center justify-center gap-1.5"
      aria-label="Stranice rezultata"
    >
      {page > 1 ? (
        <Link
          href={buildHref(params, page - 1)}
          className="grid size-10 place-items-center rounded-lg border border-border bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          aria-label="Prethodna stranica"
        >
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span className="grid size-10 place-items-center rounded-lg border border-border bg-surface-2 text-muted/40">
          <ChevronLeft className="size-4" />
        </span>
      )}

      {items.map((it, i) =>
        it === "..." ? (
          <span
            key={`gap-${i}`}
            className="grid size-10 place-items-center text-muted"
          >
            …
          </span>
        ) : (
          <Link
            key={it}
            href={buildHref(params, it)}
            aria-current={it === page ? "page" : undefined}
            className={cn(
              "grid size-10 place-items-center rounded-lg border text-sm font-semibold transition-colors",
              it === page
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-foreground hover:bg-surface-2",
            )}
          >
            {it}
          </Link>
        ),
      )}

      {page < pages ? (
        <Link
          href={buildHref(params, page + 1)}
          className="grid size-10 place-items-center rounded-lg border border-border bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          aria-label="Sljedeća stranica"
        >
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className="grid size-10 place-items-center rounded-lg border border-border bg-surface-2 text-muted/40">
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
