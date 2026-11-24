# CLAUDE.md

Operating guide for Claude Code working in this repo. For the full story read
`docs/PROJECT-JOURNAL.md` (history, decisions, gotchas) and `docs/HANDOVER.md` (full
snapshot). This file is the short version: what to run, how it is built, and what not to
break.

## What this is

pdfbot is a small browser library that gives any web page a one click "Save as PDF"
button, with no print dialog and no server. It exists so Sev's own apps (wordanator
and friends) can each offer a PDF of whatever is on screen by copying
two files and adding one attribute. It is a library, not a deployed app.

## Tech stack

Plain JavaScript, ES modules in `src/`. One runtime dependency, bundled:
`html2canvas-pro` (draws the page to a canvas). The PDF is written by pdfbot's own
small writer, `src/pdf.js`. esbuild bundles everything into `dist/`. Tests are `node --test`, no test framework.

## Commands

- `npm test` runs the unit tests in `src/*.test.js` (no browser). One test runs
  `pdftotext` on a generated PDF and skips itself if poppler is not installed.
- `npm run build` rebuilds `dist/pdfbot.js` and `dist/pdfbot-engine.js`.
- `npm run dev` builds, then serves the demo at http://localhost:4173
  (`scripts/dev-server.mjs`). `POST /__save?name=x.pdf` on that server writes the
  body to `.tmp/`, which is how a generated PDF gets out of the browser for inspection.

## Architecture

- `src/core.js`: pure functions, no DOM. Options, paper geometry, and `planPages`,
  which decides where each page is cut. All unit tested.
- `src/pdf.js`: the PDF writer. No DOM, so it is tested in Node. Each page is an
  image plus an invisible text layer in the glyphless font (`src/glyphless.js`).
- `src/engine.js`: measures the live page (layout and where every word sits),
  renders one canvas per page with html2canvas, hands both to the writer. Exposes
  `save`, `toBlob`, `build`.
- `src/loader.js`: the small file apps link to. Defines `window.pdfbot`, handles
  clicks on `[data-pdfbot]`, and injects `pdfbot-engine.js` on first use.
- `src/engine-global.js`: entry point that puts the engine on `window.__pdfbotEngine`.
- `src/index.js`: entry point for apps that bundle.
- `demo/`: `index.html` is a gallery; `explainer.html` is the first card, the how-it-works
  and how-to-use page, designed with impeccable (system in `DESIGN.md`, product record in
  `PRODUCT.md`); `report`, `annual-report` (40 pages, for length against file
  size), `spreadsheet` (1,200 row ledger with charts, landscape), `dashboard`, `article`, `invoice` and `worksheet` are styled test pages, each
  using a different way to add the button.
  They load `../dist/pdfbot.js` by relative path, so they work both from the dev
  server and on GitHub Pages. Generate a PDF from every one after an engine change.
- `.github/workflows/pages.yml`: publishes `demo/` and `dist/` (only those) to
  GitHub Pages on every push to `main` that changes them. Live at
  https://sevitz.github.io/pdfbot/.

## Conventions

Every change bumps `version` in `package.json` (the single source of truth, injected
at build time as `__PDFBOT_VERSION__`, shown as `pdfbot.version`, in the banner of both
dist files and in each PDF's Creator field), rebuilds and commits `dist/`, and updates
`docs/PROJECT-JOURNAL.md`. Repo is public: no secrets, no family names, no personal
data in any file, demo or test. No em dashes; minimal hyphens. Pasteable
terminal blocks contain no `#` comment lines. Test in a real browser and look at the
PDF it makes; unit tests only cover the arithmetic.

## Do not break these (intentional choices)

- `dist/` is committed on purpose: apps copy it, and GitHub Pages serves it at
  https://sevitz.github.io/pdfbot/dist/ for apps that would rather link to it.
- The PDF writer is our own on purpose. jsPDF cannot write a text layer that holds
  any Unicode character without shipping a large font, and it was 400 KB of the bundle.
- The text layer uses Tesseract's glyphless font, with every character mapped to one
  empty glyph. Do not swap it for a standard font such as Helvetica: those only cover
  Latin-1, so symbols and other scripts would silently vanish from search.
- The loader and engine are separate files on purpose, so pages do not download 240 KB
  for a button most visits never press.
- One canvas per page, not one tall canvas. This keeps memory flat and avoids browser
  canvas size limits (Safari's is low).
- The canvas is created by pdfbot and passed to html2canvas with
  `textRendering = 'optimizeLegibility'`. Removing that makes headings in the macOS
  system font lose their word spaces. See the journal.
- Layout is measured with ignored elements hidden, because html2canvas removes them
  from its copy. Measuring without that puts every page break in the wrong place.
- `CAPTURE_CSS` in `engine.js` turns off `hyphens: auto` while measuring and in
  html2canvas's clone. html2canvas cannot draw auto hyphens, so words split with a gap.
  Both sides must get it, or the measured lines and the drawn lines differ.
- Characters beyond U+FFFF (emoji) get codes from the surrogate block in the text
  layer, with explicit ToUnicode entries. Encoding them as two UTF-16 halves makes
  readers drop them.
- Each ToUnicode `bfrange` must keep to one first byte (`<4100> <41FF>`). PDFKit drops
  the whole map otherwise and nothing can be selected in Preview or on iOS.
- `SLACK` in `core.js` stops touching table rows from pushing a page break upwards
  one row at a time.

## Planned work

Tracked as GitHub Issues in this repo, `enhancement` for features and `bug` for bugs.
