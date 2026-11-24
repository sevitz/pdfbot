# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS for the demo pages, no build step, system fonts only, no external
network resources. The library itself is plain JavaScript ES modules bundled by esbuild
into `dist/` (see CLAUDE.md).

## Users

Developers who know how web pages are built but have never seen pdfbot, evaluating
whether to trust it and how to add it to an app. The owner, Sev, is also a user when
wiring it into his own apps (recaipe first), but the demo pages are written for the
newcomer.

## Product Purpose

A one click "Save as PDF" for any web page, done entirely in the browser: no print
dialog, no server, nothing leaves the page. Success is a developer adding a working
button to a page in about five minutes, and the PDF it makes looking like the screen
while its text stays searchable and selectable.

## Positioning

Each PDF page is a picture of the screen with the page's real text laid invisibly over
it, word for word, in a 572 byte glyphless font: exact looks and real text at once, in
the browser. The print dialog gives real text but its own layout; image-only libraries
give the looks but no text. Page breaks are planned so they never cut through a line of
text, an image, a table row or a card.

## Operating Context

Used by dropping two files into an app (`pdfbot.js`, a 3 KB loader, and
`pdfbot-engine.js`, about 240 KB, fetched on first click), linking them from GitHub
Pages, or as an npm dependency from GitHub imported on demand. Buttons are plain HTML
with `data-pdfbot` attributes, or made from JavaScript. Readers check the result in
Preview, Chrome or Acrobat.

## Capabilities and Constraints

- Whole page or one element; A3, A4, A5, Letter, Legal; portrait or landscape; margins;
  page numbers; `data-pdfbot-ignore`, `-break`, `-keep`; CSS break rules honoured.
- Text layer covers any Unicode character, emoji included.
- Limits, stated openly: text cannot be retyped in a PDF editor (the visible page is a
  picture); `::first-letter` is not drawn; `hyphens: auto` is switched off in the PDF;
  multi-column text over a page break is sliced across both columns; text typed into
  form fields is in the picture but not the text layer; files run 100 to 350 KB a page.
- Repo and demos are public: no secrets, no family names, no personal data anywhere.

## Evidence on Hand

- Live demos: https://sevitz.github.io/pdfbot/demo/ (report, dashboard, article,
  invoice, worksheet), all synthetic sample content.
- Real use: recaipe's PDF button on the cook view (https://recaipe.sevitz.com).
- No users, benchmarks, testimonials or adoption figures exist; do not invent them.

## Product Principles

- The PDF should look like the screen and read like a document.
- Honest about limits: say what it cannot do before a developer finds out.
- Tiny to adopt: one attribute on a button, nothing to configure first.
- Nothing leaves the browser.
