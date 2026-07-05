import Link from "next/link";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  pages: number;
  /** Current search params (without `page`) to preserve in links. */
  params: Record<string, string | undefined>;
  prevLabel?: string;
  nextLabel?: string;
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

const CELL =
  "grid size-10 place-items-center border text-sm font-semibold transition-colors";

export function Pagination({
  page,
  pages,
  params,
  prevLabel = "Prethodna stranica",
  nextLabel = "Sljedeća stranica",
}: PaginationProps) {
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
          className={cn(
            CELL,
            "border-border-strong bg-surface text-foreground hover:border-primary",
          )}
          aria-label={prevLabel}
        >
          ←
        </Link>
      ) : (
        <span
          className={cn(CELL, "border-border-strong bg-surface text-muted-2/50")}
        >
          ←
        </span>
      )}

      {items.map((it, i) =>
        it === "..." ? (
          <span
            key={`gap-${i}`}
            className="grid size-10 place-items-center text-muted-2"
          >
            …
          </span>
        ) : (
          <Link
            key={it}
            href={buildHref(params, it)}
            aria-current={it === page ? "page" : undefined}
            className={cn(
              CELL,
              it === page
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border-strong bg-surface text-foreground hover:border-primary",
            )}
          >
            {it}
          </Link>
        ),
      )}

      {page < pages ? (
        <Link
          href={buildHref(params, page + 1)}
          className={cn(
            CELL,
            "border-border-strong bg-surface text-foreground hover:border-primary",
          )}
          aria-label={nextLabel}
        >
          →
        </Link>
      ) : (
        <span
          className={cn(CELL, "border-border-strong bg-surface text-muted-2/50")}
        >
          →
        </span>
      )}
    </nav>
  );
}
