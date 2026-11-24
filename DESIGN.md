---
name: pdfbot
description: The pdfbot explainer, drawn as a brick build-instruction booklet.
colors:
  sky: "#aee1ff"
  sky-deep: "#93d3f7"
  ink: "#111111"
  ink-soft: "#1d3a52"
  brick: "#e53935"
  brick-deep: "#c62828"
  yellow: "#ffcd00"
  blue: "#147bd1"
  blue-deep: "#0f5fa3"
  blue-ink: "#0b4a80"
  plate: "#d9d9d9"
  paper: "#ffffff"
typography:
  display:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2.8rem, 6.4vw, 5.6rem)"
    fontWeight: 850
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  numeral:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(4.5rem, 8vw, 7rem)"
    fontWeight: 900
    lineHeight: 0.78
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2.1rem, 4.4vw, 3.4rem)"
    fontWeight: 850
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.55rem"
    fontWeight: 800
    lineHeight: 1.05
  title-sm:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 800
    lineHeight: 1.05
  lede:
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.22rem"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "0.05em"
  code:
    fontFamily: "ui-monospace, Menlo, Consolas, monospace"
    fontSize: "0.86rem"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  focus: "4px"
  piece: "10px"
spacing:
  pitch: "28px"
  gap-sm: "14px"
  gutter: "clamp(18px, 4vw, 56px)"
  section: "84px"
  measure: "1240px"
components:
  button-primary:
    backgroundColor: "{colors.blue-deep}"
    textColor: "{colors.paper}"
    rounded: "{rounded.piece}"
    padding: "14px 20px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.blue-ink}"
    textColor: "{colors.paper}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.piece}"
    padding: "14px 20px"
  button-secondary-hover:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.ink}"
  step:
    backgroundColor: "{colors.sky}"
    textColor: "{colors.ink}"
    rounded: "{rounded.piece}"
    padding: "28px"
  panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.piece}"
    padding: "22px 24px"
  callout:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.piece}"
    padding: "14px 16px"
  part:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.piece}"
    padding: "12px 16px 14px"
  diagram-board:
    backgroundColor: "{colors.sky-deep}"
    textColor: "{colors.ink}"
    rounded: "{rounded.piece}"
    padding: "28px"
  demo-tile-hover:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.ink}"
---

# Design System: pdfbot

Scope: this system belongs to the explainer page (`demo/explainer.html`). The other pages in `demo/` (report, dashboard, article, invoice, worksheet) are deliberately varied test fixtures, each in its own style, so that pdfbot is proven on unlike pages. They are not part of this system and must not be pulled into it.

## Overview

**Creative North Star: "The Build-Instruction Booklet"**

The page reads like the instruction booklet in a box of plastic bricks. Sky-blue paper ruled with a faint stud grid carries every piece; each piece, panel and drawing is outlined with the same 2px ink keyline and the same 10px corner. The mechanism is shown as an exploded diagram of one PDF page (paper, picture, text layer dropping onto it), and adoption is shown as numbered build steps, each with its part beside it and a "1x" count, the way a booklet lists the pieces a step uses.

Colour is assigned by job, as in a booklet: brick red marks the new piece, build yellow marks inventory and the hover state, accent blue marks actions and the text layer, plate grey marks what is already built. Type is a heavy grotesk (Archivo) for numerals and headings over a plain system sans for reading. Depth comes only from drawing: isometric bricks with lit tops and shaded sides. Nothing on the page casts a shadow.

The page must survive being saved by the thing it explains, so the system is also bound by what html2canvas-pro and the pdfbot text layer can reproduce (the PDF limits are listed in Do's and Don'ts).

**Key Characteristics:**
- Sky-blue paper ruled by a 28px stud grid, drawn as an SVG data-URI tile.
- One keyline (2px solid ink) and one corner (10px) on every piece.
- Colour by job: brick red new, yellow inventory and hover, blue action, plate grey built.
- Huge Archivo step numerals (weight 900) beside each step.
- Isometric brick drawings with studs as the only depth.
- A "1x" piece count on every part and call-out.

## Colors

A toy-box palette on instruction-sheet blue: four saturated working colours, ink, and white paper, each with one job.

### Primary
- **Accent Blue** (`blue`): the text-layer outline and drop arrows in the diagram, the stud dots, focus rings, scrollbar thumb and form accent colour.
- **Deep Accent Blue** (`blue-deep`): the primary button (white on it is 6.5:1; white on Accent Blue is only 4.4:1, so Accent Blue never carries text), link colour, strings in code, and the visible words of the text layer in the diagram.

### Secondary
- **Brick Red** (`brick`): the new piece in each step: the engine brick, the card the page break avoids, the logo tile. Never used as a surface for running text.
- **Shaded Brick** (`brick-deep`): the shaded side of red bricks, and keywords in code.

### Tertiary
- **Build Yellow** (`yellow`): inventory (the loader brick, the measured card) and the one hover colour for secondary buttons and demo tiles. Also the text-selection highlight.

### Neutral
- **Instruction Sky** (`sky`): the page paper and the step boxes.
- **Deep Sky** (`sky-deep`): the board behind the exploded diagram, one step darker than the paper.
- **Ink** (`ink`): text, every keyline, the step numerals.
- **Soft Ink** (`ink-soft`): secondary text in the inventory and comments in code.
- **Plate Grey** (`plate`): what is already built (the paper plate in the diagram, finished sheets) and hairline row dividers in tables and lists.
- **Paper White** (`paper`): panels, call-outs, parts, the inventory box and secondary buttons.

### Named Rules
**The Colour Has A Job Rule.** Each working colour means one thing: red is the new piece, yellow is inventory or hover, blue is an action or the text layer, grey is already built. A colour used outside its job is a bug.

**The Two Sky Rule.** Surfaces are sky (paper, steps) or white (pieces that hold reading). Deep sky is reserved for the one diagram board.

## Typography

**Display Font:** Archivo, variable weight 100 to 900, self-hosted from `demo/fonts/archivo-latin-wght-normal.woff2` (SIL OFL), with Helvetica Neue and Arial as fallback.
**Body Font:** the system sans (system-ui, -apple-system, Segoe UI).
**Label/Mono Font:** ui-monospace, Menlo, Consolas for code, file names and API names.

**Character:** a squat, heavy grotesk that reads like the numerals printed on a booklet page, over a neutral system sans that keeps the explanation plain. Headings are tight and heavy; reading text is never styled.

### Hierarchy
- **Numeral** (900, clamp 4.5rem to 7rem, line-height 0.78, tracking -0.04em): the step number at the left of each build step. Drops to 4.5rem under 900px.
- **Display** (850, clamp 2.8rem to 5.6rem, line-height 1.05, tracking -0.035em): the one page headline.
- **Headline** (850, clamp 2.1rem to 3.4rem, tracking -0.03em): section heads. The closing panel's head runs a size smaller (clamp 1.9rem to 2.8rem).
- **Title** (800, 1.55rem): step titles; 1.3rem for panel titles; 1.05rem for call-out titles, with the "1x" count set right in Archivo.
- **Lede** (400, 1.22rem, line-height 1.55, max 34em): the single opening paragraph.
- **Body** (400, 17px, line-height 1.6): reading text; step paragraphs cap at 38em, section intros at 46em.
- **Label** (Archivo 800, 0.8rem, tracking 0.05em, uppercase): table headers. The inventory box title uses the same treatment at 0.95rem; piece captions use system sans 700 at 0.8rem, uppercase.
- **Code** (0.86rem, line-height 1.65, wraps rather than scrolls): code in parts; inline code at 0.88em.

### Named Rules
**The Heavy Numeral Rule.** Numbers that count something (step numbers, "1x" piece counts) are set in Archivo at 800 or more. Reading text never is.

**The Wrap Not Scroll Rule.** Code wraps (`white-space: pre-wrap`, `overflow-wrap: anywhere`) so every character lands on the paper and in the text layer; no horizontal scrollers.

## Layout

The page sits on one ruled sheet: content up to 1240px wide, side gutters of clamp(18px, 4vw, 56px). The 28px stud pitch is the spacing module: step padding and the gap between steps are one pitch, sections are three pitches (84px) apart, the sheet ends with one pitch.

- **Opening:** a two-column grid, headline and lede on the left, a 340px inventory box on the right.
- **Exploded diagram:** the drawing at 1.5fr beside a stack of three call-outs at 1fr, on the deep-sky board.
- **Steps:** a three-column row: 120px numeral, text, then the piece (280px drawing, or a wider code part at 1.05fr).
- **Reference:** tables and definition panels side by side (1.25fr / 1fr); limits as an auto-fit list of 300px minimum columns; demo tiles as an auto-fill grid of 330px minimum.
- **Under 900px** every grid collapses to one column, the masthead nav is hidden and the Save button keeps its place at the right of the masthead.

### Named Rules
**The Stud Pitch Rule.** Vertical rhythm is counted in studs (28px). New spacing is a multiple or a clean fraction of the pitch.

## Elevation & Depth

The system is flat. There are no box shadows anywhere. Depth is drawn, not cast: isometric bricks are built from three faces (a lit top, a mid side, a shaded side, all keylined in ink) with elliptical studs, and the exploded diagram separates layers by stacking them in isometric space with drop arrows between them. Surfaces are told apart by fill (sky, deep sky, white) and the shared keyline.

### Named Rules
**The Drawn Depth Rule.** Things look solid because they are drawn as bricks, never because a shadow sits under a box.

## Shapes

One corner and one line for everything: 10px radius and a 2px solid ink keyline on panels, steps, call-outs, parts, the inventory, the diagram board and buttons. Hairline dividers inside pieces are 1px plate grey (ink for the limits list). Drawings inside pieces use smaller corners (4 to 8px) and 2 to 2.5px ink strokes so they match the keyline at their scale. Pieces are isometric bricks, two to eight studs, in the four working colours. Status marks are drawn circles: hollow for "not supported", half-filled for "works, with a catch".

### Named Rules
**The One Keyline Rule.** Every piece wears `2px solid` ink and a 10px corner. A box without the keyline is not a piece and should not look like one.

## Components

### Buttons
Chunky and toy-like: a keylined brick of a button.
- **Shape:** 10px corner, 2px ink keyline, 14px by 20px padding, system sans 700 at 1rem, an optional 20px drawn icon.
- **Primary ("go"):** deep blue with white text; hover deepens to blue-ink (#0b4a80).
- **Secondary:** white with ink text; hover fills build yellow.
- **Press:** moves down 1px. Colour changes run 150ms ease-out.
- **Busy:** while saving, `aria-busy` drops it to 75% opacity with a progress cursor; disabled keeps the progress cursor.

### Cards / Containers
- **Step:** sky fill, keyline, one pitch of padding, never split across a PDF page (`break-inside: avoid`).
- **Panel:** white fill, keyline, 22px by 24px padding; used for reference tables and definition lists. As a demo tile it takes sky fill and turns yellow on hover.
- **Call-out:** white, keyline, 14px by 16px, a title with a right-set "1x" count.
- **Inventory:** white, keyline, an uppercase Archivo title, rows of brick drawing, file name in mono, one-line description, and count, divided by plate-grey hairlines.
- **Closing panel:** white, keyline, the logo brick, the last headline and the Save button.

### Navigation
The masthead sits above the saved area with an ink rule under it: the brick logo and wordmark (Archivo 800, 1.5rem) on the left, section links in ink at weight 600 that gain a 2px ink underline on hover, and the primary Save button at the right. Links in body text are deep blue with a 2px underline offset 3px, turning ink on hover.

### Piece (signature)
A step's drawing on white paper ruled with the stud tile at a 22px pitch, keylined, with an uppercase 0.8rem caption below.

### Part (signature)
A step's code, treated as the part the step uses: white, keylined, a header with the matching brick drawing on the left and the "1x" count on the right, then wrapped code in ink with keywords in shaded brick, strings in deep blue and comments in soft ink.

### Exploded Diagram (signature)
One PDF page shown as three stacked isometric layers on the deep-sky stud board: the grey paper plate, the white picture of the screen with coloured blocks, and the dashed blue text layer with its words. Blue drop arrows join them. Its one motion: when the board first scrolls into view, the text layer drops 46px onto the picture over 1.1s on `cubic-bezier(.16, 1, .3, 1)`. It rests in its final place by default, is never armed under reduced motion or when the board is already on screen at load, and is put back in place on `pdfbot:start` so a save never catches it mid-air.

### System details
- **Focus:** 3px accent-blue outline, offset 3px, 4px corner.
- **Selection:** build yellow behind ink text.
- **Scrollbar and form accent:** accent blue on sky.
- **Smooth scrolling** for in-page links, switched off under reduced motion.

## Do's and Don'ts

### Do:
- **Do** put every piece on the sky paper with the stud ruling, a 2px ink keyline and a 10px corner.
- **Do** give each working colour one job: red new, yellow inventory and hover, blue action, grey built.
- **Do** show depth by drawing isometric bricks with lit tops, shaded sides and studs.
- **Do** count spacing in 28px studs: one pitch inside and between steps, three between sections.
- **Do** pair a step with its part and a "1x" count, and keep each step and panel unsplit (`break-inside: avoid`).
- **Do** draw the stud ruling as an SVG data-URI tile on the element inside the saved area (`.sheet`), not on the saved element itself.
- **Do** keep icons as drawn inline SVG, and inline the paths of any icon inside the saved area.
- **Do** keep the masthead and on-page action buttons out of the PDF with `data-pdfbot-ignore`.
- **Do** reset any motion to its final state before a save, and skip it under reduced motion.

### Don't:
- **Don't** add box shadows, hard or soft; depth is drawn.
- **Don't** draw the stud ruling or any tiled pattern with a repeating `radial-gradient`; html2canvas-pro does not draw tiled radial gradients and the PDF loses the ruling.
- **Don't** use SVG `<use>` references inside the saved area; inline the shape instead.
- **Don't** use `::first-letter` for drop caps; it is not drawn in the PDF.
- **Don't** use `hyphens: auto`; pdfbot switches it off in the PDF, so lines break differently from the screen.
- **Don't** put `position: fixed` or `position: sticky` elements inside the saved area.
- **Don't** let code scroll sideways; wrap it.
- **Don't** set reading text in Archivo, or headings in the system sans.
- **Don't** bring the styles of the fixture demos (report, dashboard, article, invoice, worksheet) into this system, or this system into them.
