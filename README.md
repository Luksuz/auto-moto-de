This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Dealer inventory sync (mobile.de)

Dealer inventories are imported from mobile.de and re-synced on a schedule.
Sources are managed in the admin panel at **/admin/izvori**.

### How a sync works

Three stages, all sharing `scripts/lib/mobilede.mjs` (fetch + extract) and
`scripts/lib/car-import.mjs` (write):

1. **Discover** — the dealer page is fetched and an LLM lists every car on it.
   The LLM extracts; a regex over the raw HTML audits it, dropping invented ad
   ids and re-adding ones the model missed.
2. **Extract** — each detail page is fetched and an LLM fills the `Car` fields
   under a strict JSON schema. Enum values are re-validated in code before they
   reach Postgres.

   The seller's description comes back **already structured** as
   `description_blocks` (heading / prose / one entry per feature) rather than as
   one string. Dealers separate features every possible way — `a, b, c`,
   `a / b / c`, `-a` per line — and splitting that in code needs a list of German
   abbreviations (`z. B.`, `elektr.`, `Elektron.`, `serienm.`) that can never be
   complete; a single missed one turns a 36-item feature list back into a wall of
   text. The model reads the markup and the language, so it decides. The blocks
   are then flattened to the stored text format (`Heading:` line, `• item` lines)
   which `CarDescription` renders and the admin can still edit as a textarea.

   One thing the model is *not* trusted with: the prompt asks it to drop the
   selling dealer's URL, phone and opening hours, and in 2 of 3 sampled listings
   it kept them anyway. `scrubDealerContact()` removes them after parsing — a
   publishing rule, enforced rather than requested.
3. **Sync** — new cars are created, existing ones updated (price, mileage, new
   photos), and cars the dealer no longer lists are deleted along with their
   MinIO objects. Attached leads survive with `carId` set to null.

### Scheduling

The sync cannot run on Vercel. Function duration is capped at 300s on Hobby and
800s on Pro (1800s with the extended-duration beta); a full sync is minutes to
hours. It runs as an **always-on Railway service** against the same Postgres:

```
Start Command: node scripts/scheduler.mjs
```

A long-lived process rather than a Railway cron job, deliberately. Cron jobs
must exit when finished, and Railway *skips* a scheduled execution while the
previous one is still running — fine for a 15-minute sync, wrong for a
multi-hour one, which would silently swallow ticks and get killed without a
graceful shutdown when a deploy lands mid-run.

`scripts/scheduler.mjs` therefore:

- ticks every `TICK_MINUTES` (default 10) and asks only "is anything due?",
  which is one indexed query when the answer is no
- runs one sync at a time; a tick arriving mid-run is skipped and logged, never
  queued behind it
- finishes the current run on SIGTERM before exiting (up to
  `SHUTDOWN_GRACE_S`), so a deploy does not abandon a half-imported dealer
- closes `ScrapeRun` rows left `RUNNING` by a killed process at boot, which
  otherwise show as a sync that never ends in the admin panel
- serves `GET /health` with live status if `PORT` is set

The cadence itself still lives per-dealer in `DealerSource.intervalDays`
(default 14), so each dealer can differ, a missed tick self-heals on the next
one, and the admin panel's "Pokreni" button is just `nextRunAt = now()` — no
HTTP call from Vercel to Railway to secure or time out.

**Throughput is bounded by Firecrawl, not by this service.** The rate gate
allows `FIRECRAWL_RPM` pages per minute across the whole run, so at the default
10 a sync covers ~600 pages/hour regardless of `CONCURRENCY`. If a run takes
hours, raising `FIRECRAWL_RPM` (as far as the plan allows) is the lever that
matters.

Required: `DATABASE_URL`, `FIRECRAWL_API_KEY`, `OPENROUTER_API_KEY`,
`MINIO_ENDPOINT`, `MINIO_ACCESS_KEY_ID`, `MINIO_SECRET_ACCESS_KEY`.
Optional: `MINIO_BUCKET`, `MINIO_REGION`, `OPENROUTER_EXTRACT_MODEL`,
`FIRECRAWL_RPM`, `CONCURRENCY`, `TICK_MINUTES`, `RUN_ON_START`,
`STALE_RUN_MINUTES`, `SHUTDOWN_GRACE_S`, `PORT`.

`railway-function/index.ts` is a single-file Bun port of the same worker for
Railway Functions. It duplicates the prompts and schemas, so prefer the service
above; never run both, as they would fight over the same `nextRunAt` queue.

### Manual / one-off runs

```bash
node scripts/run-due-sources.mjs --all --dry-run   # scrape everything, write nothing
node scripts/run-due-sources.mjs --source <id|url> # one dealer, ignore schedule
```

The three-step CLI path below writes JSON files instead of the database and
caches every fetched page under `.cache/mobilede-html/`, which makes it the cheap
way to iterate on a prompt — re-running costs LLM tokens but zero Firecrawl
credits. Fetch dealer pages with `onlyMainContent:false`, or the `customerId`
gets stripped (see below).

```bash
node scripts/extract-listing-urls.mjs dealer-page.html   # -> listing-urls.json
node scripts/extract-listing-details.mjs                 # -> mobilede.json
node scripts/import-mobilede.mjs mobilede.json           # -> database
```

### Gotchas worth knowing before touching this

- **Never send `location: {country: "DE"}` to Firecrawl.** Its German egress pool
  fails to tunnel to mobile.de and returns `ERR_TUNNEL_CONNECTION_FAILED` on
  every attempt. The site serves German content regardless.
- **Detail pages must use `home.mobile.de/home/vip?customerId=…&id=…`.**
  `suchen.mobile.de/fahrzeuge/details.html?id=…` renders zero gallery
  thumbnails, and without them the image scrape falls back to a blind sweep that
  collects photos of *other* dealers' cars from the recommendations carousel.
  The `customerId` is auto-detected from the dealer page.
- **`onlyMainContent` must be false.** Detail pages come back as ~139 bytes with
  it on, and dealer pages lose the `customerId`.
- **mobile.de splits the headline** into `title` ("Audi Q5") and `subTitle`
  ("40 TDI quattro sport/…"), and the `<h1>` holds the *dealer's* name. The
  prompt asks for both joined, or six different BMWs collapse onto one title.
- The dealer page's own `"34 Pkw von 36 Angeboten"` counter is the right target:
  the larger number includes non-car offers.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
