/**
 * Facebook group feed scraper — PASTE INTO THE BROWSER CONSOLE while the
 * group feed (Autocar EU-Premium posts) is open and you are logged in.
 *
 * It auto-scrolls the feed, expands "Prikaži više", collects each post's
 * text + image URLs + date, stops once posts older than the CUTOFF
 * (1.6.2026) appear, and downloads everything as fb-feed.json.
 *
 * Then run: node scripts/import-fb-feed.mjs fb-feed.json
 * (CDN image URLs expire after a few weeks — run the import soon.)
 */
(async () => {
  const CUTOFF = new Date("2026-06-01T00:00:00");
  const MAX_IDLE_ROUNDS = 8;

  const MONTHS = {
    "siječnja": 0, "veljače": 1, "ožujka": 2, "travnja": 3, "svibnja": 4,
    "lipnja": 5, "srpnja": 6, "kolovoza": 7, "rujna": 8, "listopada": 9,
    "studenoga": 10, "studenog": 10, "prosinca": 11,
    // english fallback
    "january": 0, "february": 1, "march": 2, "april": 3, "may": 4, "june": 5,
    "july": 6, "august": 7, "september": 8, "october": 9, "november": 10, "december": 11,
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function parseDate(label) {
    if (!label) return null;
    const s = label.trim().toLowerCase();
    let m;
    if ((m = s.match(/^(\d+)\s*min/))) return new Date(Date.now() - m[1] * 60e3);
    if ((m = s.match(/^(\d+)\s*(h|hr|sat)/))) return new Date(Date.now() - m[1] * 3600e3);
    if ((m = s.match(/^(\d+)\s*(d|dan)/))) return new Date(Date.now() - m[1] * 86400e3);
    if ((m = s.match(/^(\d+)\s*(tj|w)/))) return new Date(Date.now() - m[1] * 7 * 86400e3);
    // "1. lipnja" / "1. lipnja u 09:31" / "28. svibnja 2026."
    if ((m = s.match(/^(\d{1,2})\.?\s+([a-zžćčšđ]+)\.?\s*(\d{4})?(?:\.|,)?(?:\s+u\s+(\d{1,2}):(\d{2}))?/))) {
      const month = MONTHS[m[2]];
      if (month !== undefined) {
        const now = new Date();
        const year = m[3] ? Number(m[3]) : now.getFullYear();
        const d = new Date(year, month, Number(m[1]), Number(m[4] ?? 12), Number(m[5] ?? 0));
        // no explicit year and date in the future => it was last year
        if (!m[3] && d > now) d.setFullYear(year - 1);
        return d;
      }
    }
    return null;
  }

  function expandPost(article) {
    for (const el of article.querySelectorAll('div[role="button"]')) {
      if (/^(prikaži više|see more)$/i.test(el.textContent.trim())) el.click();
    }
  }

  function harvest(posts) {
    let added = 0;
    for (const article of document.querySelectorAll('div[role="feed"] [role="article"]')) {
      const postLink = article.querySelector('a[href*="/posts/"]');
      if (!postLink) continue; // virtualized placeholder / loading glimmer
      const url = postLink.href.split("?")[0];
      const dateLabel = postLink.getAttribute("aria-label") || postLink.textContent;
      const date = parseDate(dateLabel);

      expandPost(article);

      const msg = article.querySelector('[data-ad-comet-preview="message"], [data-ad-preview="message"]');
      const text = msg ? msg.innerText : "";

      const images = [...article.querySelectorAll('a[href*="/photo/"] img')]
        .map((img) => img.src)
        .filter((src) => src && src.includes("scontent"));

      const existing = posts.get(url);
      if (!existing) {
        posts.set(url, { url, dateLabel, date: date ? date.toISOString() : null, text, images: [...new Set(images)] });
        added++;
      } else {
        // keep the longest text (post may have been expanded since) + union images
        if (text.length > existing.text.length) existing.text = text;
        existing.images = [...new Set([...existing.images, ...images])];
        if (!existing.date && date) existing.date = date.toISOString();
      }
    }
    return added;
  }

  const posts = new Map();
  let idle = 0;
  let reachedCutoff = false;

  console.log("⏳ scraping… scroll stays automatic, leave the tab focused");

  while (idle < MAX_IDLE_ROUNDS && !reachedCutoff) {
    const added = harvest(posts);
    await sleep(400); // let "Prikaži više" expansions render
    harvest(posts);

    reachedCutoff = [...posts.values()].some(
      (p) => p.date && new Date(p.date) < CUTOFF,
    );
    idle = added === 0 ? idle + 1 : 0;

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(2200);
    console.log(`posts: ${posts.size}${reachedCutoff ? " (cutoff reached)" : ""}`);
  }

  const result = [...posts.values()]
    .filter((p) => !p.date || new Date(p.date) >= CUTOFF)
    .filter((p) => p.text && p.text.length > 40);

  console.log(`✅ ${result.length} posts collected (of ${posts.size} seen)`);

  const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "fb-feed.json";
  a.click();
})();
