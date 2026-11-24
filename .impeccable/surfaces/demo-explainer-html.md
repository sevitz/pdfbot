---
version: 1
slug: "demo-explainer-html"
primary_target: "demo/explainer.html"
related_targets: []
---

# Surface: pdfbot explainer (demo/explainer.html)

Mode: read. First page of the demo gallery. Reader: a developer new to pdfbot (like a
colleague evaluating it). Job: understand how it works, then add a working Save as PDF
button to a page in about five minutes. Must include an honest limits section. The page
is itself a demo: it has a working Save as PDF button and must PDF well through pdfbot
(no ::first-letter, no hyphens:auto, nothing fixed or sticky inside the capture, cards
shorter than a page). No external network requests; fonts self-hosted from demo/fonts.

## Direction contract

THESIS: pdfbot explained as a brick build-instruction booklet: the mechanism as an
exploded step diagram, adoption as numbered build steps with 1:1 piece call-outs. It
refuses the default library docs page (sidebar, feature grid, dark code).

OWN-WORLD: sky-blue instruction paper (#AEE1FF) ruled by a stud-grid module, 2px black
keylines on every piece, brick red for the new piece in each step, build yellow for
inventory, accent blue for actions, plate grey for what is already built. Heavy grotesk
(Archivo, self-hosted) for numerals and headings; system sans for reading; Menlo for code.

STORY: the reader sees the parts list (3 KB loader, 240 KB engine, your page), watches a
PDF page assemble (picture plate, then the text layer dropping onto it), follows five
numbered steps of how it works, builds it into a page in four steps, checks options and
limits, then presses Save on this very page.

FIRST VIEWPORT: masthead with brick logo tile, pdfbot, section links and the Save button
(right). Left two thirds: headline "Every page lands where it should" scale 5-6rem, one
paragraph, two actions (Build it in, See how it works). Right: "Pieces in this set"
inventory box listing the two files and your page with 1x counts. Below the fold edge:
the exploded diagram of one PDF page assembling.

FORM: catalog challenger games-toys-physics-play-brick-build-instructions (chosen over
the assigned Timetable Booklet); seed:1c44935cb378d094

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
