# pdfbot — Handover

Full snapshot for a fresh Claude Code session picking this up cold, from GitHub alone.
If you only read one document in this repo, read this one, then
`docs/PROJECT-JOURNAL.md` for the detailed history.

## Project overview

pdfbot is a browser library that gives any web page a one click "Save as PDF" button
with no print dialog and no server. It is for Sev's own family apps. It is not deployed
anywhere; apps copy the two files in `dist/`.

## Tech stack

Plain JavaScript ES modules. `html2canvas-pro` draws the page, pdfbot's own
`src/pdf.js` writes the PDF, esbuild bundles both into `dist/`. Tests use `node --test`.

## Key identifiers

- GitHub repo: `sevitz/pdfbot`, public.
- Demo site: https://sevitz.github.io/pdfbot/ (GitHub Pages, from `.github/workflows/pages.yml`).
- No Cloudflare Worker, no database, no secrets.

## Current state

Version 0.3.0. PDFs have real text: searchable, selectable, copyable. Works in Chromium against the demo page: whole page or a chosen element,
A4/A3/A5/Letter/Legal, portrait or landscape, margins, page numbers, forced breaks, and
page cuts that avoid text lines, images and table rows. 24 unit tests pass. Five styled demo pages under `demo/` all produce correct PDFs. Not yet
included in any app, and not yet tested in Safari or on a phone or tablet.

## Key design decisions and reasoning

- Each page is an image with an invisible layer of real text over it. The image gives
  exact looks; the text layer gives search, select and copy. Text cannot be retyped in
  a PDF editor.
- Loader and engine are separate files so the 240 KB engine loads only on first click.
- `dist/` is committed because apps copy it, and Pages serves it too.
- One canvas per page to stay inside browser canvas limits.

## Conventions and patterns

`src/core.js` holds anything that can be tested without a browser; put new arithmetic
there with a test. `src/loader.js` is written in plain ES5 style and must stay tiny and
dependency free. Public options are the same names as attributes
(`data-pdfbot-page-numbers` is `pageNumbers`).

## Outstanding items

See section 8 of the journal. The first real job is wiring it into an app and trying it
on the family's iPads.

## Deploy and commit workflow

No deploy. Bump the version, `npm test`, `npm run build`, check the demo, commit with
`dist/`, push.

## Gotchas and intentional oddities

All in section 6 of the journal. The three that look like unnecessary code but are not:
the canvas `textRendering` setting, the temporary stylesheet during measurement, and
`SLACK` in the page planner. Also: the glyphless font is deliberate, not a placeholder.
