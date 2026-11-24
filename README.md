# pdfbot

One click "Save as PDF" for any web page, done entirely in the browser. No print
dialog, no server, nothing leaves the page.

**Try it:** https://sevitz.github.io/pdfbot/

## Use it in an app

Copy the two files in `dist/` into the app's static files, side by side:

- `pdfbot.js` (3 KB): the only file the page links to.
- `pdfbot-engine.js` (about 240 KB): fetched on the first click, never on page load.

Then:

```html
<script src="/pdfbot/pdfbot.js" defer></script>
<button data-pdfbot>Save as PDF</button>
```

That is the whole integration. Any element with `data-pdfbot` becomes a save button,
including ones added to the page later.

### Options on the button

| Attribute | Meaning | Default |
| --- | --- | --- |
| `data-pdfbot="#report"` | Selector of the part of the page to save | the whole page |
| `data-pdfbot-filename="report"` | File name (`.pdf` is added) | page title plus today's date |
| `data-pdfbot-format` | `a4`, `a3`, `a5`, `letter`, `legal` | `a4` |
| `data-pdfbot-orientation` | `portrait` or `landscape` | `portrait` |
| `data-pdfbot-margin` | Page margin in mm | `10` |
| `data-pdfbot-page-numbers="true"` | Print "1 / 6" at the foot of each page | off |
| `data-pdfbot-scale` | Sharpness, 0.5 to 4 (bigger file when higher) | `2` |
| `data-pdfbot-image` | `auto` (smaller of the two, page by page), `jpeg` or `png` (lossless) | `auto` |
| `data-pdfbot-text="false"` | Leave out the text layer (picture only) | text on |
| `data-pdfbot-busy-label` | Button text while saving | `Saving…` |

While saving, the button is disabled, has `aria-busy="true"` and
`data-pdfbot-state="busy"` (then `done` or `error`), so an app can style it.

### Marking up the page

| Attribute | On | Effect |
| --- | --- | --- |
| `data-pdfbot-ignore` | any element | Left out of the PDF (nav bars, the button itself) |
| `data-pdfbot-break` | any element | Starts a new page before it |
| `data-pdfbot-keep` | any element | Kept whole on one page where possible |

CSS `break-before: page`, `break-after: page` and `break-inside: avoid` are honoured
too. Lines of text, images, table rows and form controls are never cut in half, a
heading stays with what follows it, and cards and other boxes (anything with a
background, a full border or a shadow) are kept whole when they fit on one page.

### No markup at all

```html
<script src="/pdfbot/pdfbot.js" data-pdfbot-auto defer></script>
```

adds a floating "Save as PDF" button to the corner of the page.

### From JavaScript

```js
await pdfbot.save({ target: '#report', filename: 'report', pageNumbers: true });
const blob = await pdfbot.toBlob({ target: '#report' });
document.body.append(pdfbot.button({ label: 'Download' }));
pdfbot.preload();
pdfbot.version;
```

Option names match the attributes without the `data-pdfbot-` prefix, in camelCase.
`pdfbot:start`, `pdfbot:progress`, `pdfbot:done` and `pdfbot:error` events fire on
`document`.

Apps with a bundler can `import { save } from 'pdfbot'` instead.

## What to expect

- **The text is real.** Each page is a picture of the screen with the page's actual
  words laid invisibly over it, word for word, the way a scanner's "searchable PDF"
  works. So it looks exactly like the screen, and the text can be searched, selected,
  copied and read aloud, accents and symbols included.
- **The text cannot be retyped in a PDF editor.** What you see is still the picture;
  changing a word in Acrobat would change the hidden layer, not the page. To change
  the document, change the page and save again.
- A phrase that wraps onto a second line may not be found as one phrase in Preview.
  Each word is always found.
- Text typed into form fields is in the picture but not in the text layer.
- Automatic hyphenation (`hyphens: auto`) is switched off in the PDF, because the
  hyphens cannot be drawn. Lines may break slightly differently from the screen.
- Tiled `radial-gradient` backgrounds are not drawn; use an SVG image tile instead.
- `::first-letter` styling is not drawn. For a drop cap, wrap the letter in a `<span>`.
- Multi-column text that runs onto a second page is sliced across both columns, so
  each column continues at the top of the next page rather than flowing in order.
- Files run to roughly 100 to 200 KB a page.
- **It saves what the screen shows, at the width it shows it.** Saved from a phone,
  the PDF has the phone layout. Print stylesheets (`@media print`) are not applied.
- **Images from other sites** need CORS headers or they come out blank.
- Fixed and sticky bars are captured wherever they sit; mark them `data-pdfbot-ignore`.

## Demos

`demo/` has a gallery, an explainer (`explainer.html`: how it works, how to build it in,
options and limits), and five pages in different styles, each wiring the button up a
different way: a long report (data attributes), a dark dashboard saved landscape, a
magazine article (the floating `data-pdfbot-auto` button), a one page invoice
(`pdfbot.save()` from JavaScript) and a German maths worksheet (`pdfbot.button()`).
They are live at https://sevitz.github.io/pdfbot/, published with `dist/` by
`.github/workflows/pages.yml` on every push that changes either.

## Develop

```bash
npm install
```

```bash
npm test
```

```bash
npm run dev
```

`npm run dev` builds `dist/` and serves the demos at http://localhost:4173/demo/.
`dist/` is committed, because it is what apps copy. Run `npm run build` and commit the
result with every change to `src/`.

Built on [html2canvas-pro](https://github.com/yorickshan/html2canvas-pro) (MIT) for the
picture. The PDF itself is written by `src/pdf.js`. The text layer's font is the
glyphless font from [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) (Apache 2.0).
