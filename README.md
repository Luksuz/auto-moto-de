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

The app runs on Vercel, whose function timeout is far below the ~10 minutes a
full sync needs. The worker therefore runs as a **small Railway cron service**
against the same Postgres:

```
Cron Schedule: 0 * * * *          # hourly
Start Command: node scripts/run-due-sources.mjs
```

It ticks hourly, but the cadence lives per-dealer in
`DealerSource.intervalDays` (default 14). That way each dealer can have its own
interval, a missed tick self-heals on the next hour rather than waiting another
fortnight, and the admin panel's "Pokreni" button is just `nextRunAt = now()` —
no HTTP call from Vercel to Railway to secure or time out.

The service needs `DATABASE_URL`, `MINIO_*`, `FIRECRAWL_API_KEY` and
`OPENROUTER_API_KEY`.

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
