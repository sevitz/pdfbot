// The heavy half: draws the page with html2canvas-pro, reads where every word
// sits, and writes a PDF whose pages are a picture with real text laid over
// it. Loaded on the first click (see loader.js), never on page load.

import html2canvas from 'html2canvas-pro';
import { PdfWriter, deflate } from './pdf.js';
import {
  resolveOptions,
  pageGeometry,
  planPages,
  defaultFilename,
  ensurePdfExtension,
} from './core.js';

export const version = typeof __PDFBOT_VERSION__ !== 'undefined' ? __PDFBOT_VERSION__ : 'dev';

const PT_PER_MM = 72 / 25.4;

// Things a page break should never pass through.
const ATOMIC = new Set([
  'IMG', 'SVG', 'CANVAS', 'VIDEO', 'PICTURE', 'TR', 'INPUT', 'BUTTON', 'SELECT',
  'TEXTAREA', 'IFRAME',
]);
const HEADINGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
// Above this many elements, skip the per-element style lookup (it is the slow
// part) and rely on tags, text lines and data attributes alone.
const STYLE_SCAN_LIMIT = 4000;

// html2canvas cannot draw the hyphens a browser adds with `hyphens: auto`, so
// hyphenated words come out split with a gap. The PDF is laid out without
// automatic hyphenation instead, both when measuring and when drawing.
const CAPTURE_CSS = '*{-webkit-hyphens:manual!important;hyphens:manual!important}';

function isBoxed(cs) {
  const solid = (c) => c && c !== 'transparent' && !/^rgba\(.*,\s*0\)$/.test(c) && !/\/\s*0\)$/.test(c);
  if (cs.backgroundImage !== 'none' || solid(cs.backgroundColor) || cs.boxShadow !== 'none') return true;
  // A full outline, not a single rule such as a heading underline.
  return ['Top', 'Right', 'Bottom', 'Left'].every((side) =>
    parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== 'none');
}

function resolveTarget(target) {
  if (!target) return document.body;
  if (typeof target === 'string') {
    const el = document.querySelector(target);
    if (!el) throw new Error(`pdfbot: nothing matches "${target}"`);
    return el;
  }
  if (target.nodeType === 1) return target;
  throw new Error('pdfbot: target must be an element or a selector');
}

function isIgnored(el) {
  return el.hasAttribute('data-pdfbot-ignore') || el.hasAttribute('data-html2canvas-ignore');
}

function contentBox(target) {
  const root = target === document.body || target === document.documentElement;
  if (root) {
    const de = document.documentElement;
    return {
      left: -window.scrollX,
      top: -window.scrollY,
      width: Math.max(de.scrollWidth, document.body.scrollWidth, de.clientWidth),
      height: Math.max(de.scrollHeight, document.body.scrollHeight, de.clientHeight),
    };
  }
  const r = target.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

// The first solid background colour at or above the target, so a dark page
// gives dark paper rather than a dark block on a white sheet.
function findBackground(target) {
  for (let el = target; el && el.nodeType === 1; el = el.parentElement) {
    const c = getComputedStyle(el).backgroundColor;
    if (c && c !== 'transparent' && !/^rgba\(.*,\s*0\)$/.test(c) && !/\/\s*0\)$/.test(c)) return c;
  }
  return '#ffffff';
}

// Any CSS colour to [r, g, b]. A canvas does the conversion, so every syntax
// the browser understands works.
function toRgb(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 1;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1, 1);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

// Reads the text off the page as "runs": stretches of words that sit together
// on one line, each with the box it occupies. These become the PDF's text
// layer, and they also tell the page planner where the lines are.
function collectRuns(target, box) {
  const runs = [];
  const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const styles = new Map();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!parent || !/\S/.test(node.nodeValue)) continue;
    let style = styles.get(parent);
    if (!style) {
      const cs = getComputedStyle(parent);
      style = { hidden: cs.visibility !== 'visible', transform: cs.textTransform };
      styles.set(parent, style);
    }
    if (style.hidden) continue;

    const text = node.nodeValue;
    const words = /\S+/g;
    let run = null;
    for (let m = words.exec(text); m; m = words.exec(text)) {
      range.setStart(node, m.index);
      range.setEnd(node, m.index + m[0].length);
      const r = range.getClientRects()[0];
      if (!r || !(r.width > 0) || !(r.height > 0)) continue;
      let word = m[0];
      if (style.transform === 'uppercase') word = word.toUpperCase();
      else if (style.transform === 'lowercase') word = word.toLowerCase();
      const sameLine = run &&
        Math.abs(r.top - run.top) < r.height * 0.5 &&
        r.left >= run.right - 1 &&
        r.left - run.right < r.height * 2;
      if (sameLine) {
        run.text += ' ' + word;
        run.words.push({ text: word, left: r.left, right: r.right });
        run.right = r.right;
        run.top = Math.min(run.top, r.top);
        run.bottom = Math.max(run.bottom, r.bottom);
      } else {
        if (run) runs.push(run);
        run = {
          text: word, left: r.left, right: r.right, top: r.top, bottom: r.bottom,
          words: [{ text: word, left: r.left, right: r.right }],
        };
      }
    }
    if (run) runs.push(run);
  }
  return runs.map((r) => ({
    text: r.text,
    x: r.left - box.left,
    y: r.top - box.top,
    width: r.right - r.left,
    height: r.bottom - r.top,
    words: r.words.map((w) => ({ text: w.text, x: w.left - box.left, width: w.right - w.left })),
  }));
}

// Measures the live page: which vertical spans must stay whole, where the
// page asks for a new sheet, and what text sits where. All positions are
// relative to the target's top left.
function measure(target, box) {
  const originTop = box.top;
  const keeps = [];
  const forced = [];
  const add = (r) => {
    if (r.height > 0 && r.width > 0) keeps.push([r.top - originTop, r.bottom - originTop]);
  };

  const els = target.querySelectorAll('*');
  const scanStyles = els.length <= STYLE_SCAN_LIMIT;
  for (const el of els) {
    const tag = el.tagName.toUpperCase();
    let atomic = ATOMIC.has(tag) || el.hasAttribute('data-pdfbot-keep');
    if (el.hasAttribute('data-pdfbot-break')) {
      forced.push(el.getBoundingClientRect().top - originTop);
    }
    if (scanStyles) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none') continue;
      if (/^avoid/.test(cs.breakInside)) atomic = true;
      // A visible box (a card, a panel, a callout) reads badly cut in half.
      // The planner drops any keep too tall to fit, so big ones still split.
      if (isBoxed(cs)) atomic = true;
      if (/^(page|always|left|right)$/.test(cs.breakBefore)) {
        forced.push(el.getBoundingClientRect().top - originTop);
      }
      if (/^(page|always|left|right)$/.test(cs.breakAfter)) {
        forced.push(el.getBoundingClientRect().bottom - originTop);
      }
    }
    if (atomic) add(el.getBoundingClientRect());
    // Keep a heading with the start of whatever follows it.
    if (HEADINGS.has(tag) && el.nextElementSibling) {
      const h = el.getBoundingClientRect();
      const n = el.nextElementSibling.getBoundingClientRect();
      if (h.height > 0 && n.height > 0 && n.top >= h.top) {
        keeps.push([h.top - originTop, Math.min(n.bottom, n.top + 48) - originTop]);
      }
    }
  }

  // Every rendered line of text, so a cut never slices through letters.
  const runs = collectRuns(target, box);
  for (const r of runs) keeps.push([r.y, r.y + r.height]);
  return { keeps, forced, runs };
}

function emit(name, detail) {
  document.dispatchEvent(new CustomEvent(`pdfbot:${name}`, { detail }));
}

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('pdfbot: could not read the canvas'))), type, quality);
  });
}

// Turns a rendered page into the image the PDF will hold. 'auto' tries both
// encodings and keeps the smaller: flat pages of text and colour pack better
// (and stay sharper) lossless, photographs pack better as JPEG.
async function encodeImage(canvas, o) {
  let lossless = null;
  if (o.image !== 'jpeg') {
    const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    const rgb = new Uint8Array(canvas.width * canvas.height * 3);
    for (let i = 0, j = 0; i < data.length; i += 4) {
      rgb[j++] = data[i]; rgb[j++] = data[i + 1]; rgb[j++] = data[i + 2];
    }
    // null where the browser cannot deflate; JPEG is used instead.
    const packed = await deflate(rgb);
    if (packed) lossless = { bytes: packed, width: canvas.width, height: canvas.height, filter: 'FlateDecode' };
    if (lossless && o.image === 'png') return lossless;
  }
  const blob = await canvasBlob(canvas, 'image/jpeg', o.quality);
  const jpeg = {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    width: canvas.width,
    height: canvas.height,
    filter: 'DCTDecode',
  };
  return lossless && lossless.bytes.length <= jpeg.bytes.length ? lossless : jpeg;
}

// Builds the PDF and returns { bytes, pages, filename }. Nothing is downloaded.
export async function build(options) {
  const o = resolveOptions(options);
  const target = resolveTarget(o.target);
  const filename = o.filename
    ? ensurePdfExtension(o.filename)
    : defaultFilename(document.title);

  if (document.fonts && document.fonts.ready) await document.fonts.ready;

  // html2canvas drops ignored elements from its copy of the page, so the
  // content below them moves up. Measure with them hidden to match. This is
  // all synchronous, so the browser never paints the hidden state.
  const hide = document.createElement('style');
  hide.textContent = '[data-pdfbot-ignore],[data-html2canvas-ignore]{display:none!important}' + CAPTURE_CSS;
  const scroll = [window.scrollX, window.scrollY];
  document.head.appendChild(hide);
  let box, geo, keeps, forced, runs;
  try {
    box = contentBox(target);
    if (!(box.width > 0) || !(box.height > 0)) {
      throw new Error('pdfbot: the target has no size, so there is nothing to save');
    }
    geo = pageGeometry(o, box.width);
    ({ keeps, forced, runs } = measure(target, box));
  } finally {
    hide.remove();
    window.scrollTo(scroll[0], scroll[1]);
  }

  const pages = planPages({
    totalHeight: box.height,
    pageHeight: geo.pageHeightPx,
    keeps,
    forced,
  });
  const background = o.background || findBackground(target);
  const paper = toRgb(background);
  const ptPerPx = PT_PER_MM / geo.pxPerMm;
  const marginPt = o.margin * PT_PER_MM;

  const pdf = new PdfWriter({
    title: document.title || filename,
    creator: `pdfbot ${version}`,
  });

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    emit('progress', { page: i + 1, pages: pages.length });
    // One canvas per page keeps memory flat however long the page is, and
    // stays clear of browser limits on canvas size.
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(Math.ceil(box.width) * o.scale);
    canvas.height = Math.floor(page.height * o.scale);
    // Chromium's canvas spaces the macOS system font wider than the page does
    // at heading sizes, which makes words run together. This setting makes
    // the canvas measure text the way the page does.
    const ctx = canvas.getContext('2d');
    if ('textRendering' in ctx) ctx.textRendering = 'optimizeLegibility';
    await html2canvas(target, {
      canvas,
      scale: o.scale,
      useCORS: true,
      logging: false,
      backgroundColor: background,
      x: 0,
      y: page.y,
      width: Math.ceil(box.width),
      height: page.height,
      scrollX: 0,
      scrollY: 0,
      ignoreElements: isIgnored,
      onclone: (doc) => {
        const style = doc.createElement('style');
        style.textContent = CAPTURE_CSS;
        doc.head.appendChild(style);
      },
    });
    const image = await encodeImage(canvas, o);
    canvas.width = canvas.height = 0; // release the bitmap now, not at GC

    // The words whose line falls on this page, placed over the picture.
    const pageRuns = [];
    if (o.text) {
      for (const run of runs) {
        const mid = run.y + run.height / 2;
        if (mid < page.y || mid >= page.y + page.height) continue;
        if (run.x + run.width < 0 || run.x > box.width) continue;
        pageRuns.push({
          text: run.text,
          x: marginPt + run.x * ptPerPx,
          y: marginPt + (run.y - page.y) * ptPerPx,
          width: run.width * ptPerPx,
          height: run.height * ptPerPx,
          words: run.words.map((w) => ({
            text: w.text,
            x: marginPt + w.x * ptPerPx,
            width: w.width * ptPerPx,
          })),
        });
      }
    }

    pdf.addPage({
      width: geo.pageWidthMm * PT_PER_MM,
      height: geo.pageHeightMm * PT_PER_MM,
      background: paper,
      image,
      imageRect: {
        x: marginPt,
        y: marginPt,
        width: geo.printableWidthMm * PT_PER_MM,
        height: page.height * ptPerPx,
      },
      runs: pageRuns,
      footer: o.pageNumbers ? `${i + 1} / ${pages.length}` : null,
      footerY: Math.max(3, o.margin / 2) * PT_PER_MM - 3,
    });
  }

  return { bytes: await pdf.finish(), pages: pages.length, filename };
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Builds the PDF and downloads it. Resolves to { filename, pages }.
export async function save(options) {
  emit('start', {});
  try {
    const { bytes, pages, filename } = await build(options);
    download(new Blob([bytes], { type: 'application/pdf' }), filename);
    const result = { filename, pages };
    emit('done', result);
    return result;
  } catch (error) {
    emit('error', { error });
    throw error;
  }
}

// Builds the PDF and hands it back as a Blob, for uploading or previewing.
export async function toBlob(options) {
  const { bytes } = await build(options);
  return new Blob([bytes], { type: 'application/pdf' });
}
