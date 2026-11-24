# pdfbot — Project Journal

Continuity document for future sessions. If you are a fresh Claude picking this up from
GitHub alone, read `docs/HANDOVER.md` first for the current snapshot, then this file for
the history and reasoning behind it. Every new version adds an entry to the version log
below, records any new gotchas or decisions, and updates `docs/HANDOVER.md`.

---

## 1. What this project is

A browser library that adds a one click "Save as PDF" to any web page, without the
print dialog. Made for Sev's family apps to share. A library, not a deployed app.

---

## 2. Architecture

A click on `[data-pdfbot]` is caught by the loader (`dist/pdfbot.js`, 3 KB), which
injects the engine (`dist/pdfbot-engine.js`, 240 KB) the first time. The engine:

1. Measures the live page: the size of the target, every span that should not be cut
   (text lines, images, table rows, `break-inside: avoid`, `data-pdfbot-keep`), every
   forced break, and every word with the box it occupies.
2. Plans the pages (`planPages` in `src/core.js`), moving each cut up to the nearest
   place that slices nothing, unless that would leave the page under 35% full.
3. Renders each page to its own canvas with html2canvas-pro, cropped by `y`/`height`.
4. Hands each canvas (as JPEG or lossless, whichever is smaller) and that page's words
   to the PDF writer (`src/pdf.js`), which lays the words invisibly over the picture.

---

## 3. Repo layout

- `src/` source. `core.js` pure logic, `engine.js` capture, `pdf.js` the PDF writer,
  `glyphless.js` the text layer's font, `loader.js` button
  wiring, `engine-global.js` and `index.js` entry points, `core.test.js` tests.
- `dist/` built files, committed. This is what apps copy.
- `demo/` the test page.
- `scripts/` `build.mjs` (esbuild) and `dev-server.mjs` (demo server).
- `docs/` this journal and the handover.

---

## 4. How a change ships

There is no deploy. Change `src/`, bump `version` in `package.json`, `npm test`,
`npm run build`, check the demo in a browser, commit (including `dist/`), push. Apps
pick up a new version by copying `dist/` again.

---

## 5. Version history (what & why)

### 2026-11-24 — 0.3.6 — The explainer page

`demo/explainer.html`, now the first card in the gallery: how pdfbot works (an exploded
diagram of one PDF page, then five numbered steps), how to build it in (four steps with
code), every option, an honest limits section, and links to the demos and recaipe. It
saves itself through pdfbot like every other demo.

Designed with the impeccable skill: `PRODUCT.md` (new, the product record), a direction
round where Sev chose the "brick build-instruction booklet" world, the contract in
`.impeccable/surfaces/demo-explainer-html.md`, then an independent finish review.
Headings are Archivo (OFL), self-hosted in `demo/fonts/` with its licence; body text is
the system sans. No external requests.

Measured while building it (Chromium on a Mac, the browser pane): saving the invoice demo
took 0.2 to 0.6 seconds, the 12 page report about 1.2 seconds. The explainer quotes the
invoice figure.

Gotcha found: html2canvas draws each `<svg>` on its own, so `<use href="#symbol">`
pointing at a symbol defined elsewhere in the page comes out blank in the PDF. Inside
anything that gets saved, draw icons inline.

### 2026-11-24 — 0.3.5 — Breathing room in the report chart

The bar chart in `demo/report.html` had its "Week 12" label about 12 units from the
right border and its baselines 10 units from the bottom. The viewBox now runs from
`-16 -16` at `792 x 292`, with the background rect enlarged to match, so there is a
16 unit margin inside the border without moving any bar. The impeccable detector still
reads the full bleed background rect as flush content, so that one finding is ignored
for this file in `.impeccable/config.json`.

### 2026-11-24 — 0.3.4 — Favicon for the demo pages

The demo pages on GitHub Pages had no favicon, so browsers showed a blank tab icon and
requested a missing `/favicon.ico`. Added `demo/favicon.svg` (a white page with a
download arrow on a red square) and linked it from every demo page. Library code is
unchanged; only the version stamp in `dist/` moves.

### 2026-11-24 — 0.3.3 — Versioned file links

After 0.3.2 went live, Sev's browser still ran 0.3.1: GitHub Pages sends
`cache-control: max-age=600`, so browsers reuse files for up to 10 minutes. The loader
now fetches `pdfbot-engine.js?v=<version>`, so a cached engine from another release is
never paired with it, and `npm run build` stamps `?v=<version>` onto the demo pages'
link to `pdfbot.js`. A demo page itself can still be up to 10 minutes stale; a hard
reload (Cmd+Shift+R) skips that.

### 2026-11-24 — 0.3.2 — Text selectable again in Preview and on iOS

Sev could not select text in PDFs from the demos. Since 0.3.0 the text layer's
ToUnicode map split identity into `<0000> <D7FF>` and `<E000> <FFFF>`. The spec only
allows a range whose two ends share their first byte; macOS PDFKit (Preview, Safari,
iOS) then discarded the whole font's text, leaving 5 characters on a page instead of
hundreds. Poppler (`pdftotext`) is lenient, which is why the tests still passed. Now
one range per first byte, 100 per block, with a unit test for the rule. Verified with
PDFKit itself: click a word, drag across a phrase, and emoji, on three demo PDFs.

### 2026-11-24 — 0.3.1 — Public repo, demos on GitHub Pages

The worksheet's pizza question used real family names. Swapped for Ben and Mia, since
the repo is public and the demos are published on GitHub Pages. Keep real family names
out of this repo entirely.

The repo was made public so the demos can be served free on GitHub Pages at
https://sevitz.github.io/pdfbot/. Before that, its history was replaced with a single
commit, because earlier commits held family names. The Pages workflow publishes only
`demo/` and `dist/`.

### 2026-11-24 — 0.3.0 — More demo pages, and what they found

Added a gallery and four new styled demo pages (dark dashboard, magazine article,
invoice, German maths worksheet), each wiring the button a different way. The old
`demo/index.html` became `demo/report.html`. Demos load `../dist/` relatively so the
same files work from the dev server and from GitHub Pages; added a Pages workflow
(manual trigger only, publishes `demo/` and `dist/` and nothing else).

Generating a PDF from every page found four real bugs, now fixed:

- **Emoji vanished from the text layer.** Characters beyond U+FFFF were written as two
  UTF-16 surrogate codes, and readers discard lone surrogates. Now each such character
  gets one code from the surrogate block (D800 to DFFF, never valid alone) with an
  explicit ToUnicode entry. Unit tested, including with `pdftotext`.
- **Cards were cut in half** across pages on the dashboard. Elements with a background,
  a full border or a shadow are now kept whole when they fit (the planner already drops
  keeps taller than 65% of a page).
- **Hyphenated words split with a gap** in the justified article: html2canvas draws only
  DOM text, and auto hyphens are not in the DOM. `hyphens: auto` is now off while
  measuring and in the clone html2canvas draws.
- **`::first-letter` drop caps are not drawn** by html2canvas. Not fixable here; the
  article demo uses a span, and the README says so.

Also fixed three demo contrast failures the design hook flagged (white on orange,
white on a light violet button, grey link on grey).

### 2026-11-24 — 0.2.0 — Real text in the PDF

Sev's verdict on 0.1.0: a PDF that is just an image is less than useful. Now every page
carries an invisible layer of the page's real text, placed word for word over the
picture, so the PDF can be searched, selected and copied. This is how a scanner's
searchable PDF is built.

- Replaced jsPDF with our own writer, `src/pdf.js` (about 200 lines). jsPDF's built-in
  fonts only cover Latin-1, and a full Unicode font would add megabytes. The writer
  embeds Tesseract's 572 byte glyphless font instead: every character maps to one empty
  glyph, with a ToUnicode map so readers get the real characters back. Any character
  works, including ½ and ➗. The engine went from 650 KB to 240 KB.
- The engine reads each word's box from the live page (a Range per word) and groups
  words into line runs. The same runs feed the page planner, replacing the old
  per-node line rectangles.
- New default `image: 'auto'`: each page is encoded both as JPEG and as deflated raw
  pixels, and the smaller is kept. Flat pages of text come out lossless and about 30%
  smaller than JPEG. Compression uses the browser's `CompressionStream`.
- New option `text` (`data-pdfbot-text="false"` turns the layer off).

Verified: `pdftotext` extracts the demo's text in reading order with table columns
intact; word boxes drawn over the rendered page sit exactly on the letters; macOS
PDFKit (the engine behind Preview) finds words, accented words and symbols. Not yet
tried by hand in Preview, Acrobat or on iOS.

### 2026-11-24 — 0.1.0 — First version

Built the whole thing: loader, engine, page planner, demo, docs. Verified in Chromium
(the Claude desktop browser pane) by generating PDFs from the demo and rendering them
back to images: whole page, a selected element, landscape Letter, page numbers, a
forced break, a scrolled page, the real click path and the error path.

Prior art considered: html2pdf.js is the same idea (html2canvas plus jsPDF) but renders
one giant canvas and breaks pages by modifying the page's DOM; its html2canvas is the
original, which fails on modern CSS colours such as `oklch()`. html2canvas-pro is the
maintained fork that handles those, so pdfbot uses it directly and does its own paging.

---

## 6. Key decisions & hard-won gotchas (READ THIS)

- **The visible page is an image; the text is a hidden layer over it.** Searchable and
  selectable, but not retypeable in a PDF editor. Drawing the visible text as real PDF
  text would need the page's actual font files, which a browser will not hand over for
  system fonts. If that is ever needed, the route is server rendering (Cloudflare
  Browser Rendering), a different product: pages behind login would have to be sent
  to it.
- **Selection only lines up if each word is placed separately.** The glyphless font is
  fixed width, so one stretched string per line drifts by up to a letter. Each word is
  stretched to its own measured width and a space fills the gap to the next.
- **PDFKit does not find a phrase that wraps across two lines** in these files (each
  word is found). A trailing space per line, as Tesseract writes, did not change that.
- **Words ran together in headings.** Chromium's canvas spaces `system-ui` about 8%
  wider than the page does at 24px and up on macOS, and html2canvas places each word
  at the page's position, so the wider words swallowed the gaps. Setting
  `ctx.textRendering = 'optimizeLegibility'` on the canvas makes the widths match
  exactly. That requires pdfbot to create the canvas itself and pass it in, since
  html2canvas offers no hook on its own canvas.
- **Ignored elements shift the layout.** html2canvas deletes ignored elements from its
  cloned page, so everything below moves up by their height. Measuring the live page
  without accounting for that put every break off by the height of the demo's nav bar.
  Fix: a temporary stylesheet hides ignored elements during measurement, added and
  removed synchronously so it never paints, with the scroll position restored.
- **Touching table rows cascaded the page cut.** Adjacent rows overlap by a fraction of
  a pixel. Moving a cut to the top of one row made it "inside" the row above, and so on
  up the table until the 35% rule gave up and cut straight through a row. `SLACK`
  (1.5px) in `core.js` ignores overlaps that small. There is a unit test for it.
- **html2canvas `x`/`y` are relative to the element**, not the document.
- **The app's launch.json preview only works once the session is in this folder.** The
  first session started elsewhere and ran the demo server by hand.
- **Test the text layer with PDFKit, not only poppler.** Poppler accepts CMaps that
  break the spec; PDFKit silently drops them. `PDFDocument(url:).page(at:0).string`
  and `selection(from:to:)` from a small Swift script is the real check for Preview.
- **Tiled `radial-gradient` backgrounds are not drawn by html2canvas-pro**, even small
  repeating dot patterns that look fine on screen. Use an SVG data-URI tile as the
  `background-image` instead (the explainer's stud ruling does this). Background images on
  the saved element itself are also skipped, so put page-wide texture on a wrapper inside it.
- **SVG `<use>` of a shared symbol is blank in the PDF.** html2canvas renders each SVG in
  isolation. Inline the shapes inside any saved area.
- **Multi-column text over a page break** is sliced across both columns, so reading
  order across pages is column 1 top, column 2 top, then both bottoms. Inherent in
  paging a picture of the screen.
- **A hidden browser pane throttles the page.** Generating several PDFs in one script
  call timed out at 45s while the pane was hidden; one or two per call is fine.

---

## 7. How to continue this project (for a fresh Claude)

1. Read `docs/HANDOVER.md`, then this file.
2. `npm install`, `npm test`, `npm run dev`, open the demo, press the buttons.
3. To inspect a PDF without downloading it, run in the page:
   `fetch('/__save?name=x.pdf', { method: 'POST', body: await pdfbot.toBlob() })`,
   then `pdftoppm -r 40 -png .tmp/x.pdf .tmp/x` and look at the images.
4. Commit and push after every change, with `dist/` rebuilt.

---

## 8. Known open items / ideas (as of 2026-11-24)

- Not yet used in any app. Wordanator is the obvious first.
- Not tested in Safari or on an iPad or phone. Canvas behaviour differs there.
- A `width` option to lay the page out at a fixed desktop width before capture, so a
  PDF saved from a phone is not the phone layout.
- Optional header and footer text (title, date) beyond page numbers.
- Text typed into inputs and textareas is not in the text layer.
- Right-to-left and vertical text are not handled in the text layer.
- Hosting `dist/` at one URL (for example a small Worker) so apps link rather than copy.
