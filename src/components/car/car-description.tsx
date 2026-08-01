/** Renders a scraped mobile.de Fahrzeugbeschreibung as real structure.
 *
 *  The scraper (scripts/lib/mobilede.mjs extractDescription) preserves the
 *  seller's layout as plain text: "Heading:" lines, "• item" lines, blank lines
 *  between blocks. Rendering that with `whitespace-pre-line` technically shows
 *  the breaks but still reads as one grey slab, so headings get weight and
 *  bullets become a real list.
 *
 *  Anything that is neither a heading nor a bullet is ordinary prose and is
 *  rendered as a paragraph, unchanged.
 */
function isHeading(line: string) {
  // "Sonderausstattung:", "Weitere Ausstattung:" — short, ends in a colon, and
  // not a feature that merely contains one ("Service-System: Remote Services").
  return line.endsWith(":") && line.length <= 48;
}

export function CarDescription({ text }: { text: string }) {
  const lines = text.split("\n").map((l) => l.trim());

  // Group consecutive bullets so each run becomes one <ul>.
  const blocks: ({ type: "list"; items: string[] } | { type: "p" | "h"; text: string })[] = [];
  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith("•")) {
      const item = line.replace(/^•\s*/, "");
      const last = blocks.at(-1);
      if (last?.type === "list") last.items.push(item);
      else blocks.push({ type: "list", items: [item] });
    } else if (isHeading(line)) {
      blocks.push({ type: "h", text: line.replace(/:$/, "") });
    } else {
      blocks.push({ type: "p", text: line });
    }
  }

  return (
    <div className="space-y-4 text-[14.5px] leading-relaxed text-muted">
      {blocks.map((b, i) =>
        b.type === "h" ? (
          <h3
            key={i}
            className="pt-1 font-display text-[12px] font-bold uppercase tracking-[1.5px] text-foreground"
          >
            {b.text}
          </h3>
        ) : b.type === "list" ? (
          <ul key={i} className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {b.items.map((item, j) => (
              <li key={j} className="flex gap-2">
                <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>{b.text}</p>
        ),
      )}
    </div>
  );
}
