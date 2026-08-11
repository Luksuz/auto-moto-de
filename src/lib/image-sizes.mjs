// The only place image dimensions and JPEG quality are defined.
//
// Plain .mjs rather than .ts so both trees can import the same file: the Next
// app resolves it through allowJs, and the node scripts import it directly. It
// used to be a constant in scripts/lib/car-import.mjs duplicated into the admin
// upload route under a "keep in sync" comment, which is exactly the kind of pair
// that drifts — the two had already diverged from the Facebook importer and the
// bucket optimizer, each carrying its own hardcoded 1600/q78.
//
// Anything that writes an image to storage MUST resize through these. A single
// path that stores what it was handed is enough to undo the sizing: one dealer
// import is ~5,600 photos, so 100 KB of drift per photo is half a gigabyte.
//
// WHY 1280 AND NOT 1600: the full size is loaded by exactly one surface, the
// gallery viewer on a car page, which renders it object-cover in a 16:10 box at
// 60vw desktop / 100vw mobile. At 1600/q78 it averaged 210 KB and was 75% of the
// entire bucket — which filled the MinIO volume mid-import on 2026-08-11 and
// left 54 cars with no photos. Measured over 12 real listing photos, 1280/q74 is
// 34% smaller across all three sizes with no visible difference at that display
// size. Cards read the 800px variant and the gallery strip the 400px one, so
// neither was ever touching the full size.
//
// Vercel's image optimizer is off (next.config.ts images.unoptimized), so these
// objects are served byte-for-byte to browsers — there is no resizing layer
// downstream to correct a bad choice here.
export const FULL_WIDTH = 1280;
export const FULL_QUALITY = 74;

/** Pre-rendered smaller sizes, written alongside every full-size object.
 *  `suffix` is appended before the .jpg to form the variant's key. */
export const VARIANTS = [
  { name: "medium", width: 800, quality: 74, suffix: "-800" },
  { name: "thumb", width: 400, quality: 70, suffix: "-400" },
];

/** `cars/x.jpg` + `-400` -> `cars/x-400.jpg` */
export const variantKey = (key, suffix) => key.replace(/\.jpg$/, `${suffix}.jpg`);

/** Full size plus every variant for one photo, as {key, width, quality}. */
export function allSizes(key) {
  return [
    { key, width: FULL_WIDTH, quality: FULL_QUALITY },
    ...VARIANTS.map((v) => ({ key: variantKey(key, v.suffix), width: v.width, quality: v.quality })),
  ];
}
