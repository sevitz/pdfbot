import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PdfWriter, hexUtf16 } from './pdf.js';

const latin1 = (bytes) => Buffer.from(bytes).toString('latin1');

async function sample() {
  const pdf = new PdfWriter({ title: 'Übung: Brüche', creator: 'pdfbot test', date: new Date(Date.UTC(2026, 10, 24)) });
  pdf.addPage({
    width: 595.28,
    height: 841.89,
    background: [255, 255, 255],
    runs: [
      { text: 'Autumn term reading report', x: 40, y: 50, width: 300, height: 24 },
      { text: 'Brüche für Ben: ½ + ¼ = ¾ “quoted” ➗', x: 40, y: 90, width: 280, height: 14 },
      { text: 'Pizza 🍕 and 😊 twice 🍕', x: 40, y: 120, width: 200, height: 14 },
    ],
    footer: '1 / 2',
  });
  pdf.addPage({ width: 595.28, height: 841.89, runs: [{ text: 'Second page', x: 40, y: 50, width: 90, height: 14 }] });
  return pdf.finish();
}

test('hexUtf16 writes UTF-16 code units', () => {
  assert.equal(hexUtf16('Aé'), '004100E9');
  assert.equal(hexUtf16('➗'), '2797');
  assert.equal(hexUtf16('😀'), 'D83DDE00');
});

test('the file is framed as a PDF and every xref offset points at its object', async () => {
  const bytes = await sample();
  const text = latin1(bytes);
  assert.ok(text.startsWith('%PDF-1.5\n'));
  assert.ok(text.trimEnd().endsWith('%%EOF'));

  const startxref = Number(/startxref\n(\d+)\n%%EOF/.exec(text)[1]);
  assert.equal(text.slice(startxref, startxref + 4), 'xref');
  const count = Number(/xref\n0 (\d+)\n/.exec(text.slice(startxref))[1]);
  const rows = text.slice(startxref).split('\n').slice(2, 2 + count);
  assert.equal(rows[0], '0000000000 65535 f ');
  rows.slice(1).forEach((row, i) => {
    const offset = Number(row.slice(0, 10));
    assert.ok(text.slice(offset).startsWith(`${i + 1} 0 obj\n`), `object ${i + 1}`);
  });
  assert.match(text, /\/Type \/Pages \/Count 2 /);
});

test('characters beyond U+FFFF get one code each, mapped back to the full character', () => {
  const pdf = new PdfWriter();
  assert.deepEqual(pdf.encode('a🍕b😊🍕'), { hex: '0061D8000062D801D800', glyphs: 5 });
  assert.equal(pdf.astral.get('🍕'), 0xd800);
  assert.equal(pdf.astral.get('😊'), 0xd801);
  // A lone surrogate from the page becomes a replacement mark, not a stray code.
  assert.deepEqual(pdf.encode('x\ud800'), { hex: '0078FFFD', glyphs: 2 });
});

test('page content: invisible text, flipped to PDF coordinates, stretched to width', () => {
  const pdf = new PdfWriter();
  const content = pdf.pageContent({
    width: 600,
    height: 800,
    background: null,
    image: null,
    runs: [{ text: 'abcd', x: 10, y: 100, width: 60, height: 20 }],
    footer: null,
  });
  // 4 glyphs x 0.5em x 20pt = 40pt natural, so 150% to fill 60pt.
  // Top 100 + height 20 down from an 800pt page puts the baseline at 680.
  assert.equal(content, 'BT 3 Tr\n/F1 20 Tf\n150 Tz 1 0 0 1 10 680 Tm <0061006200630064> Tj\nET');
});

test('page content: with words, each is pinned to its own start', () => {
  const pdf = new PdfWriter();
  const content = pdf.pageContent({
    width: 600,
    height: 800,
    runs: [{
      text: 'ab cd', x: 10, y: 100, width: 70, height: 20,
      words: [{ text: 'ab', x: 10, width: 25 }, { text: 'cd', x: 50, width: 30 }],
    }],
  });
  // "ab": 25pt over 2 glyphs (20pt) = 125%. The space fills 35 to 50: 15pt
  // over one glyph (10pt) = 150%. "cd": 30pt over 20pt = 150%. A quarter-em
  // space closes the line.
  assert.equal(content, [
    'BT 3 Tr',
    '/F1 20 Tf',
    '125 Tz 1 0 0 1 10 680 Tm <00610062> Tj',
    '150 Tz 1 0 0 1 35 680 Tm <0020> Tj',
    '150 Tz 1 0 0 1 50 680 Tm <00630064> Tj',
    '50 Tz 1 0 0 1 80 680 Tm <0020> Tj',
    'ET',
  ].join('\n'));
});

test('a real PDF reader finds the text, accents and symbols included', async (t) => {
  let pdftotext = true;
  try { execFileSync('pdftotext', ['-v'], { stdio: 'ignore' }); } catch { pdftotext = false; }
  if (!pdftotext) return t.skip('pdftotext (poppler) is not installed');
  const file = join(mkdtempSync(join(tmpdir(), 'pdfbot-')), 'sample.pdf');
  writeFileSync(file, await sample());
  const out = execFileSync('pdftotext', [file, '-'], { encoding: 'utf8' });
  assert.match(out, /Autumn term reading report/);
  assert.match(out, /Brüche für Ben: ½ \+ ¼ = ¾ “quoted” ➗/);
  assert.match(out, /Second page/);
  assert.match(out, /Pizza 🍕 and 😊 twice 🍕/);
  const info = execFileSync('pdfinfo', [file], { encoding: 'utf8' });
  assert.match(info, /Title:\s+Übung: Brüche/);
  assert.match(info, /Pages:\s+2/);
});
