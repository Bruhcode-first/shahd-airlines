// Gzip budgets (spec 11.3). Run after `npm run build`:  node tools/budget.mjs
// (a) first load: index.html + its CSS + the entry JS and everything it imports statically
//     (the lazy globe and physics chunks and images/ are excluded) <= 1 258 291 bytes
// (b) everything in dist/ <= 4 194 304 bytes
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const DIST = path.resolve('dist');
const gz = f => zlib.gzipSync(fs.readFileSync(f), { level: 9 }).length;
const walk = d => fs.readdirSync(d, { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);

const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const refs = [...html.matchAll(/(?:src|href)="\/shahd-airlines\/(assets\/[^"]+)"/g)].map(m => m[1]);
const first = new Set(['index.html']);
const queue = [...refs];
while (queue.length) {
  const rel = queue.shift();
  if (first.has(rel)) continue;
  first.add(rel);
  if (!rel.endsWith('.js')) continue;
  const code = fs.readFileSync(path.join(DIST, rel), 'utf8');
  // static imports only: `import"./x.js"`, `import{a}from"./x.js"`, `export*from"./x.js"`
  for (const m of code.matchAll(/(?:\bimport\s*|\bfrom\s*)["']\.\/([^"']+\.(?:js|css))["']/g)) {
    queue.push(path.posix.join(path.posix.dirname(rel), m[1]));
  }
}
const all = walk(DIST).map(f => path.relative(DIST, f).split(path.sep).join('/'));
let a = 0, b = 0;
const rows = [];
for (const rel of all) {
  const size = gz(path.join(DIST, rel));
  b += size;
  if (first.has(rel)) { a += size; rows.push([rel, size]); }
}
rows.sort((x, y) => y[1] - x[1]);
console.log('First load (gzip):');
for (const [rel, size] of rows) console.log(`  ${(size / 1024).toFixed(1).padStart(8)} KB  ${rel}`);
console.log(`(a) first load: ${a} bytes (${(a / 1024).toFixed(1)} KB) ${a <= 1258291 ? 'OK' : 'OVER'} (limit 1 258 291)`);
console.log(`(b) total:      ${b} bytes (${(b / 1024 / 1024).toFixed(2)} MB) ${b <= 4194304 ? 'OK' : 'OVER'} (limit 4 194 304)`);
process.exitCode = a <= 1258291 && b <= 4194304 ? 0 : 1;
