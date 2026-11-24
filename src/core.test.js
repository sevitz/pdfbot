import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  planPages,
  pageGeometry,
  resolveOptions,
  defaultFilename,
  ensurePdfExtension,
} from './core.js';

// Every plan must tile the content exactly: start at 0, no gaps, no overlaps,
// end at the total height.
function assertTiles(pages, total) {
  let y = 0;
  for (const p of pages) {
    assert.equal(p.y, y);
    assert.ok(p.height > 0, 'page has height');
    y += p.height;
  }
  assert.equal(y, Math.ceil(total));
}

test('content shorter than a page is one page', () => {
  const pages = planPages({ totalHeight: 500, pageHeight: 1000 });
  assert.deepEqual(pages, [{ y: 0, height: 500 }]);
});

test('plain content is cut at page height', () => {
  const pages = planPages({ totalHeight: 2500, pageHeight: 1000 });
  assert.deepEqual(pages.map((p) => p.height), [1000, 1000, 500]);
  assertTiles(pages, 2500);
});

test('a cut moves above a line of text it would slice', () => {
  const pages = planPages({ totalHeight: 2000, pageHeight: 1000, keeps: [[990, 1010]] });
  assert.equal(pages[0].height, 990);
  assertTiles(pages, 2000);
});

test('stacked spans: moving the cut up re-checks what it now crosses', () => {
  // A table row 950..1005, with an image beside it 900..960.
  const pages = planPages({
    totalHeight: 2000,
    pageHeight: 1000,
    keeps: [[950, 1005], [900, 960]],
  });
  assert.equal(pages[0].height, 900);
  assertTiles(pages, 2000);
});

test('touching rows with fractional edges do not cascade the cut upwards', () => {
  // Table rows 52.4px tall whose edges meet off the pixel grid.
  const keeps = [];
  for (let i = 0; i < 40; i++) keeps.push([i * 52.4, (i + 1) * 52.4 + 0.6]);
  const pages = planPages({ totalHeight: 40 * 52.4, pageHeight: 1000, keeps });
  // 19 whole rows fit (995.6); the cut lands on that row boundary.
  assert.equal(pages[0].height, 995);
  assertTiles(pages, 40 * 52.4);
});

test('a span taller than a page is cut through rather than looping', () => {
  const pages = planPages({ totalHeight: 3000, pageHeight: 1000, keeps: [[100, 2900]] });
  assert.deepEqual(pages.map((p) => p.height), [1000, 1000, 1000]);
});

test('will not leave a page mostly empty to keep something whole', () => {
  // Keeping 200..1100 whole would leave page one only 20% full.
  const pages = planPages({
    totalHeight: 2000,
    pageHeight: 1000,
    keeps: [[200, 800], [200, 1100]],
    minFill: 0.35,
  });
  assert.equal(pages[0].height, 1000);
  assertTiles(pages, 2000);
});

test('forced break starts a new page', () => {
  const pages = planPages({ totalHeight: 1500, pageHeight: 1000, forced: [400] });
  assert.deepEqual(pages.map((p) => p.height), [400, 1000, 100]);
  assertTiles(pages, 1500);
});

test('forced breaks at the edges are ignored', () => {
  const pages = planPages({ totalHeight: 800, pageHeight: 1000, forced: [0, 800, 900] });
  assert.equal(pages.length, 1);
});

test('fractional heights still tile exactly', () => {
  const total = 3210.6;
  const pages = planPages({
    totalHeight: total,
    pageHeight: 1046.31,
    keeps: [[1040.2, 1061.7], [2080.5, 2101.9]],
  });
  assertTiles(pages, total);
  for (const p of pages) assert.ok(Number.isInteger(p.y) && Number.isInteger(p.height));
});

test('empty input gives no pages', () => {
  assert.deepEqual(planPages({ totalHeight: 0, pageHeight: 1000 }), []);
});

test('geometry: A4 portrait with 10mm margins', () => {
  const g = pageGeometry(resolveOptions({}), 950);
  assert.equal(g.printableWidthMm, 190);
  assert.equal(g.printableHeightMm, 277);
  assert.equal(g.pxPerMm, 5);
  assert.equal(g.pageHeightPx, 1385);
});

test('geometry: landscape swaps the sides', () => {
  const g = pageGeometry(resolveOptions({ orientation: 'landscape', margin: 0 }), 297);
  assert.equal(g.pageWidthMm, 297);
  assert.equal(g.pageHeightMm, 210);
});

test('options: blanks fall back to defaults, bad values are clamped', () => {
  const o = resolveOptions({ filename: '', margin: 'abc', scale: 99, format: 'A4' });
  assert.equal(o.filename, null);
  assert.equal(o.margin, 10);
  assert.equal(o.scale, 4);
  assert.equal(o.format, 'a4');
});

test('options: unknown format throws', () => {
  assert.throws(() => resolveOptions({ format: 'b7' }), /unknown format/);
});

test('options: page numbers accepts attribute style values', () => {
  assert.equal(resolveOptions({ pageNumbers: 'true' }).pageNumbers, true);
  assert.equal(resolveOptions({ pageNumbers: 'false' }).pageNumbers, false);
  assert.equal(resolveOptions({}).pageNumbers, false);
});

test('filename is built from the title and date', () => {
  const d = new Date(2026, 10, 24);
  assert.equal(defaultFilename('My Report: Q3 / Final', d), 'my-report-q3-final-2026-11-24.pdf');
  assert.equal(defaultFilename('Übung für Brüche', d), 'ubung-fur-bruche-2026-11-24.pdf');
  assert.equal(defaultFilename('', d), 'page-2026-11-24.pdf');
});

test('explicit filenames get a .pdf extension and safe characters', () => {
  assert.equal(ensurePdfExtension('report'), 'report.pdf');
  assert.equal(ensurePdfExtension('report.PDF'), 'report.PDF');
  assert.equal(ensurePdfExtension('a/b:c'), 'a-b-c.pdf');
});
