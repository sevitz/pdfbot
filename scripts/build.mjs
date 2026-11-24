// Builds the two files apps actually load, into dist/ (which is committed).
import { build } from 'esbuild';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const { version } = JSON.parse(readFileSync(root + 'package.json', 'utf8'));
const banner = { js: `/*! pdfbot ${version} */` };
const define = { __PDFBOT_VERSION__: JSON.stringify(version) };

await build({
  entryPoints: [root + 'src/loader.js'],
  outfile: root + 'dist/pdfbot.js',
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2019',
  banner,
  define,
});

await build({
  entryPoints: [root + 'src/engine-global.js'],
  outfile: root + 'dist/pdfbot-engine.js',
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2019',
  legalComments: 'eof',
  banner,
  define,
});

// Demo pages link the loader with ?v=<version>, so a browser holding an older
// copy (GitHub Pages lets browsers keep files for 10 minutes) fetches the new one.
const demoDir = root + 'demo/';
for (const name of readdirSync(demoDir).filter((f) => f.endsWith('.html'))) {
  const file = demoDir + name;
  const html = readFileSync(file, 'utf8');
  const stamped = html.replace(/\.\.\/dist\/pdfbot\.js(\?v=[^"']*)?/g, `../dist/pdfbot.js?v=${version}`);
  if (stamped !== html) writeFileSync(file, stamped);
}

console.log(`built pdfbot ${version}`);
