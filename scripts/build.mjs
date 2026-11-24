// Builds the two files apps actually load, into dist/ (which is committed).
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

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

console.log(`built pdfbot ${version}`);
