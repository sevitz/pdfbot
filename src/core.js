// Pure logic: no DOM, no dependencies. Everything here is unit tested in
// core.test.js, so the fiddly arithmetic (where a page may be cut) can be
// proven without a browser.

// Page sizes in millimetres, portrait.
export const FORMATS = {
  a3: [297, 420],
  a4: [210, 297],
  a5: [148, 210],
  letter: [215.9, 279.4],
  legal: [215.9, 355.6],
};

export const DEFAULTS = {
  target: null, // Element, selector, or null for the whole page
  filename: null, // null: built from the page title and today's date
  format: 'a4',
  orientation: 'portrait',
  margin: 10, // mm, all four sides
  scale: 2, // canvas pixels per CSS pixel; 2 is sharp on paper
  quality: 0.92, // JPEG quality, 0 to 1
  image: 'auto', // 'auto' (smaller of the two per page), 'jpeg' or 'png' (lossless)
  pageNumbers: false,
  text: true, // lay real, selectable text over the picture
  background: null, // null: taken from the page
};

export function resolveOptions(options) {
  const o = { ...DEFAULTS };
  for (const [k, v] of Object.entries(options || {})) {
    if (v !== undefined && v !== null && v !== '') o[k] = v;
  }
  o.format = String(o.format).toLowerCase();
  if (!FORMATS[o.format]) throw new Error(`pdfbot: unknown format "${o.format}"`);
  o.orientation = String(o.orientation).toLowerCase() === 'landscape' ? 'landscape' : 'portrait';
  o.margin = clamp(Number(o.margin), 0, 50, DEFAULTS.margin);
  o.scale = clamp(Number(o.scale), 0.5, 4, DEFAULTS.scale);
  o.quality = clamp(Number(o.quality), 0.1, 1, DEFAULTS.quality);
  o.image = ['auto', 'jpeg', 'png'].includes(String(o.image).toLowerCase())
    ? String(o.image).toLowerCase()
    : 'auto';
  o.text = !(o.text === false || o.text === 'false');
  o.pageNumbers = o.pageNumbers === true || o.pageNumbers === 'true' || o.pageNumbers === '';
  return o;
}

function clamp(n, lo, hi, fallback) {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}

// Works out how the captured content maps onto paper. `contentWidthPx` is the
// width of the thing being captured, in CSS pixels; it is scaled to fill the
// printable width, and that fixes how many CSS pixels fit down one page.
export function pageGeometry(options, contentWidthPx) {
  let [w, h] = FORMATS[options.format];
  if (options.orientation === 'landscape') [w, h] = [h, w];
  const printableW = w - options.margin * 2;
  const printableH = h - options.margin * 2;
  const pxPerMm = contentWidthPx / printableW;
  return {
    pageWidthMm: w,
    pageHeightMm: h,
    printableWidthMm: printableW,
    printableHeightMm: printableH,
    pxPerMm,
    pageHeightPx: printableH * pxPerMm,
  };
}

// Splits a tall strip of content into pages.
//
//   totalHeight  height of the content, CSS px
//   pageHeight   how much fits on one page, CSS px
//   keeps        [top, bottom] spans that should not be cut through (a line of
//                text, an image, a table row)
//   forced       y positions where a new page must start
//   minFill      a page is never left emptier than this fraction just to keep
//                something whole; past that we cut straight through instead
//
// Returns [{ y, height }] covering 0..totalHeight exactly, with no gaps or
// overlaps.
export function planPages({ totalHeight, pageHeight, keeps = [], forced = [], minFill = 0.35 }) {
  if (!(totalHeight > 0) || !(pageHeight > 0)) return [];
  const total = Math.ceil(totalHeight);
  // A span taller than a page cannot be kept whole, so it gives no guidance.
  const spans = keeps
    .filter(([a, b]) => b > a && b - a < pageHeight * (1 - minFill))
    .sort((p, q) => p[0] - q[0]);
  const breaks = [...new Set(forced.map((v) => Math.floor(v)))]
    .filter((v) => v > 0 && v < total)
    .sort((a, b) => a - b);

  const pages = [];
  let y = 0;
  while (total - y >= 1) {
    let end = Math.min(Math.floor(y + pageHeight), total);
    if (end <= y) end = Math.min(y + 1, total);
    const forcedAt = breaks.find((v) => v > y && v < end);
    if (forcedAt !== undefined) end = forcedAt;
    else if (end < total) end = safeCut(spans, y, end, pageHeight * minFill);
    pages.push({ y, height: end - y });
    y = end;
  }
  return pages;
}

const SLACK = 1.5; // CSS px

// Moves a cut upwards until it no longer passes through any span. Gives up
// (and returns the original cut) if that would leave the page too empty.
function safeCut(spans, start, end, minHeight) {
  let cut = end;
  for (let i = 0; i < 200; i++) {
    let top = Infinity;
    for (const [a, b] of spans) {
      if (a >= cut) break; // sorted by top: nothing later can straddle
      // A span only counts as cut if the cut is properly inside it. Neighbours
      // such as table rows overlap by a fraction of a pixel, and without the
      // slack each one would push the cut up to the next, all the way up.
      if (b > cut + SLACK && a < cut - SLACK && a > start) top = Math.min(top, a);
    }
    if (top === Infinity) break;
    cut = Math.floor(top);
  }
  if (cut - start < minHeight) return end;
  return cut;
}

// "My Report: Q3 / Final" -> "my-report-q3-final-2026-11-24.pdf"
export function defaultFilename(title, date = new Date()) {
  const slug = String(title || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${slug || 'page'}-${y}-${m}-${d}.pdf`;
}

export function ensurePdfExtension(name) {
  const clean = String(name).replace(/[\\/:*?"<>|]+/g, '-').trim();
  return /\.pdf$/i.test(clean) ? clean : `${clean}.pdf`;
}
