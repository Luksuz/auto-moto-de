/** Run `worker` over `items` with at most `limit` in flight, preserving result
 *  order. A worker that throws yields null rather than aborting the batch.
 *
 *  Used to overlap the slow, independent parts of the pipeline. Firecrawl fetches
 *  stay serialized by their own rate gate inside createFirecrawl (see
 *  mobilede.mjs), so raising concurrency here does NOT fetch faster — it lets the
 *  LLM call and the image uploads for one listing run during the mandatory wait
 *  before the next fetch, instead of after it.
 */
export async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
      while (next < items.length) {
        const i = next++;
        try {
          results[i] = await worker(items[i], i);
        } catch (err) {
          results[i] = null;
          if (worker.onError) worker.onError(err, items[i]);
        }
      }
    }),
  );

  return results;
}
