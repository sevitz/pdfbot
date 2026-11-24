// A small PDF writer, just big enough for what pdfbot makes: pages that are a
// picture with a layer of real, invisible text laid exactly over it, so the
// text can be searched, selected and copied. This is the same construction a
// scanner's "searchable PDF" uses.
//
// No DOM here, so it runs (and is tested) in Node as well as the browser.

import { GLYPHLESS_TTF_BASE64 } from './glyphless.js';

const enc = new TextEncoder();

function num(n) {
  // PDF numbers: plain decimals, no exponent, no trailing noise.
  return String(Math.round(n * 1000) / 1000);
}

function concat(parts) {
  let size = 0;
  for (const p of parts) size += p.length;
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

function fromBase64(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Text as UTF-16 code units in hex, the form the text layer's font expects.
export function hexUtf16(text) {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    out += text.charCodeAt(i).toString(16).padStart(4, '0');
  }
  return out.toUpperCase();
}

function pdfDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `D:${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}

// zlib deflate, which is exactly PDF's FlateDecode. Returns null where the
// browser has no CompressionStream; callers then store the bytes as they are.
export async function deflate(bytes) {
  if (typeof CompressionStream === 'undefined') return null;
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// Maps every character back to Unicode for readers. Codes are 2 bytes, which
// covers U+0000 to U+FFFF directly. Characters beyond that (emoji, rarer CJK)
// would otherwise be split into two surrogate halves that readers throw away,
// so each one gets a code from the surrogate block (never a real character on
// its own) with an explicit entry mapping it to the full character.
export function toUnicodeCMap(astral) {
  const lines = [
    '/CIDInit /ProcSet findresource begin',
    '12 dict begin',
    'begincmap',
    '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def',
    '/CMapName /Adobe-Identity-UCS def',
    '/CMapType 2 def',
    '1 begincodespacerange',
    '<0000> <FFFF>',
    'endcodespacerange',
  ];
  // Identity for every code outside the surrogate block. The spec only allows
  // a range whose start and end share their first byte, and macOS PDFKit
  // (Preview, iOS) drops the whole map if a range breaks that rule, leaving
  // nothing to select. So: one range per first byte, 100 ranges per block.
  const ranges = [];
  for (let hi = 0; hi < 256; hi++) {
    if (hi >= 0xd8 && hi <= 0xdf) continue;
    const h = hi.toString(16).padStart(2, '0').toUpperCase();
    ranges.push(`<${h}00> <${h}FF> <${h}00>`);
  }
  for (let i = 0; i < ranges.length; i += 100) {
    const chunk = ranges.slice(i, i + 100);
    lines.push(`${chunk.length} beginbfrange`, ...chunk, 'endbfrange');
  }
  const entries = [...astral].map(([char, code]) =>
    `<${code.toString(16).toUpperCase()}> <${hexUtf16(char)}>`);
  for (let i = 0; i < entries.length; i += 100) {
    const chunk = entries.slice(i, i + 100);
    lines.push(`${chunk.length} beginbfchar`, ...chunk, 'endbfchar');
  }
  lines.push('endcmap', 'CMapName currentdict /CMap defineresource pop', 'end', 'end');
  return lines.join('\n');
}

const ASTRAL_FIRST = 0xd800;
const ASTRAL_LAST = 0xdfff;

const GLYPH_ADVANCE = 0.5; // the glyphless font's fixed width, in ems

export class PdfWriter {
  constructor({ title = '', creator = 'pdfbot', date = new Date() } = {}) {
    this.title = title;
    this.creator = creator;
    this.date = date;
    this.pages = [];
    this.astral = new Map(); // character beyond U+FFFF -> its code
  }

  // Text to the hex codes the text layer's font uses, one code per character.
  encode(text) {
    let hex = '';
    let glyphs = 0;
    for (const char of text) {
      let code = char.codePointAt(0);
      if (code > 0xffff) {
        if (!this.astral.has(char) && ASTRAL_FIRST + this.astral.size <= ASTRAL_LAST) {
          this.astral.set(char, ASTRAL_FIRST + this.astral.size);
        }
        code = this.astral.get(char) ?? 0xfffd; // past 2048 different ones: a replacement mark
      } else if (code >= ASTRAL_FIRST && code <= ASTRAL_LAST) {
        code = 0xfffd; // a lone surrogate in the page's text
      }
      hex += code.toString(16).padStart(4, '0').toUpperCase();
      glyphs++;
    }
    return { hex, glyphs };
  }

  // Sizes and positions are in PDF points (1/72 inch), origin top left, y
  // pointing down, the way a web page thinks. The writer flips them.
  //
  //   image       { bytes, width, height, filter } filter 'DCTDecode' for a
  //               JPEG file, 'FlateDecode' for deflated raw RGB
  //   imageRect   { x, y, width, height } where the picture sits
  //   background  [r, g, b] 0..255 paper colour, or null for white
  //   runs        [{ text, x, y, width, height, words? }] each a stretch of
  //               text on one line; x,y its top left corner. `words` is
  //               optionally [{ text, x, width }] for word by word placement
  //   footer      short ASCII string centred at the foot, or null
  addPage({ width, height, image, imageRect, background = null, runs = [], footer = null, footerY = 12 }) {
    this.pages.push({ width, height, image, imageRect, background, runs, footer, footerY });
  }

  pageContent(page) {
    const H = page.height;
    const out = [];
    if (page.background) {
      const [r, g, b] = page.background.map((v) => num(v / 255));
      out.push(`${r} ${g} ${b} rg 0 0 ${num(page.width)} ${num(H)} re f`);
    }
    if (page.image) {
      const r = page.imageRect;
      out.push(`q ${num(r.width)} 0 0 ${num(r.height)} ${num(r.x)} ${num(H - r.y - r.height)} cm /Im0 Do Q`);
    }
    if (page.runs.length) {
      out.push('BT 3 Tr'); // text rendering mode 3: invisible
      for (const run of page.runs) {
        if (!run.text || !(run.width > 0) || !(run.height > 0)) continue;
        const size = run.height;
        const y = num(H - run.y - run.height);
        // Each piece is stretched to the exact width it has on the page, so a
        // selection highlight covers the words it should. With `words`, every
        // word sits on its own letters and a space fills the gap to the next.
        const pieces = [];
        if (run.words && run.words.length) {
          run.words.forEach((w, i) => {
            pieces.push(w);
            const next = run.words[i + 1];
            // The space after the last word lets a reader join this line to
            // the next, so a search for a phrase that wraps still finds it.
            const end = w.x + w.width;
            const gap = next ? Math.max(next.x - end, 0.1) : size * 0.25;
            pieces.push({ text: ' ', x: end, width: gap });
          });
        } else {
          pieces.push(run);
        }
        out.push(`/F1 ${num(size)} Tf`);
        for (const piece of pieces) {
          if (!piece.text || !(piece.width > 0)) continue;
          const { hex, glyphs } = this.encode(piece.text);
          const natural = glyphs * GLYPH_ADVANCE * size;
          out.push(
            `${num((piece.width / natural) * 100)} Tz ` +
            `1 0 0 1 ${num(piece.x)} ${y} Tm <${hex}> Tj`,
          );
        }
      }
      out.push('ET');
    }
    if (page.footer) {
      const text = page.footer.replace(/[^\x20-\x7e]/g, '').replace(/([\\()])/g, '\\$1');
      const size = 8;
      const approxWidth = text.length * size * 0.5; // Helvetica averages about half an em
      out.push(
        `BT 0 Tr 100 Tz 0.47 g /F2 ${size} Tf ` +
        `1 0 0 1 ${num((page.width - approxWidth) / 2)} ${num(page.footerY)} Tm (${text}) Tj ET`,
      );
    }
    return out.join('\n');
  }

  async finish() {
    const objects = []; // index i holds object number i + 1
    const add = (body) => { objects.push(body); return objects.length; };
    const reserve = () => { objects.push(null); return objects.length; };
    const set = (id, body) => { objects[id - 1] = body; };

    const dict = (text) => [enc.encode(text)];
    const stream = async (head, bytes, { compress = true } = {}) => {
      let data = bytes;
      let filter = '';
      if (compress) {
        const packed = await deflate(bytes);
        if (packed) { data = packed; filter = ' /Filter /FlateDecode'; }
      }
      return [
        enc.encode(`<< ${head}${filter} /Length ${data.length} >>\nstream\n`),
        data,
        enc.encode('\nendstream'),
      ];
    };

    // Page text first: it decides which extra characters the font must map.
    const contents = this.pages.map((page) => this.pageContent(page));

    const catalogId = reserve();
    const pagesId = reserve();

    // The invisible text font: any character, one empty glyph.
    const fontFile = fromBase64(GLYPHLESS_TTF_BASE64);
    const fontFileId = add(await stream(`/Length1 ${fontFile.length}`, fontFile));
    const descriptorId = add(dict(
      `<< /Type /FontDescriptor /FontName /GlyphLessFont /Flags 5 /FontBBox [0 0 500 1000] ` +
      `/ItalicAngle 0 /Ascent 1000 /Descent -1 /CapHeight 1000 /StemV 80 /FontFile2 ${fontFileId} 0 R >>`,
    ));
    const cidToGid = new Uint8Array(65536 * 2);
    for (let i = 1; i < cidToGid.length; i += 2) cidToGid[i] = 1;
    const cidToGidId = add(await stream('', cidToGid));
    const cidFontId = add(dict(
      `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /GlyphLessFont ` +
      `/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> ` +
      `/FontDescriptor ${descriptorId} 0 R /CIDToGIDMap ${cidToGidId} 0 R /DW 500 >>`,
    ));
    const toUnicodeId = add(await stream('', enc.encode(toUnicodeCMap(this.astral))));
    const textFontId = add(dict(
      `<< /Type /Font /Subtype /Type0 /BaseFont /GlyphLessFont /Encoding /Identity-H ` +
      `/DescendantFonts [${cidFontId} 0 R] /ToUnicode ${toUnicodeId} 0 R >>`,
    ));
    // Visible page numbers use a font every PDF reader already has.
    const footerFontId = add(dict(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    ));

    const pageIds = [];
    for (const [index, page] of this.pages.entries()) {
      let xobject = '';
      if (page.image) {
        const im = page.image;
        const imageId = add([
          enc.encode(
            `<< /Type /XObject /Subtype /Image /Width ${im.width} /Height ${im.height} ` +
            `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /${im.filter} /Length ${im.bytes.length} >>\nstream\n`,
          ),
          im.bytes,
          enc.encode('\nendstream'),
        ]);
        xobject = ` /XObject << /Im0 ${imageId} 0 R >>`;
      }
      const contentId = add(await stream('', enc.encode(contents[index])));
      pageIds.push(add(dict(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${num(page.width)} ${num(page.height)}] ` +
        `/Resources << /Font << /F1 ${textFontId} 0 R /F2 ${footerFontId} 0 R >>${xobject} >> ` +
        `/Contents ${contentId} 0 R >>`,
      )));
    }

    set(pagesId, dict(`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((i) => `${i} 0 R`).join(' ')}] >>`));
    set(catalogId, dict(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`));
    const infoId = add(dict(
      `<< /Title <FEFF${hexUtf16(this.title)}> /Creator <FEFF${hexUtf16(this.creator)}> ` +
      `/Producer <FEFF${hexUtf16(this.creator)}> /CreationDate (${pdfDate(this.date)}) >>`,
    ));

    // Lay the objects out and record where each one starts.
    // The second line is four high bytes, the usual signal that the file is binary.
    const parts = [concat([enc.encode('%PDF-1.5\n%'), new Uint8Array([0xe2, 0xe3, 0xcf, 0xd3]), enc.encode('\n')])];
    let offset = parts[0].length;
    const offsets = [];
    objects.forEach((body, i) => {
      const chunk = concat([enc.encode(`${i + 1} 0 obj\n`), ...body, enc.encode('\nendobj\n')]);
      offsets.push(offset);
      offset += chunk.length;
      parts.push(chunk);
    });
    const xref = [`xref\n0 ${objects.length + 1}\n`, '0000000000 65535 f \n'];
    for (const o of offsets) xref.push(`${String(o).padStart(10, '0')} 00000 n \n`);
    xref.push(
      `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\n` +
      `startxref\n${offset}\n%%EOF\n`,
    );
    parts.push(enc.encode(xref.join('')));
    return concat(parts);
  }
}
