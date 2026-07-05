import type { Dict } from "@/lib/i18n/dictionary";

/** Gold USP strip under the hero: four selling points separated by dots. */
export function UspStrip({ t }: { t: Dict }) {
  const items = [t.strip1, t.strip2, t.strip3, t.strip4];

  return (
    <div className="flex flex-wrap justify-center gap-11 bg-primary px-5 py-3.5 font-display text-[14px] font-semibold uppercase tracking-[2px] text-primary-foreground">
      {items.map((item, i) => (
        <span key={item} className="contents">
          {i > 0 && <span aria-hidden>·</span>}
          <span>{item}</span>
        </span>
      ))}
    </div>
  );
}
