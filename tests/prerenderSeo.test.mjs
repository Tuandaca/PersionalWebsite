import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('production HTML exposes the portfolio before JavaScript and hydrates safely', async () => {
  const html = await readFile('dist/index.html', 'utf8');
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /id="projects"/);
  assert.match(html, /id="contact"/);
  assert.match(html, /<main\b/);
  assert.doesNotMatch(html, /<div id="root"><\/div>/);
  assert.doesNotMatch(html, /<canvas\b/);
  assert.doesNotMatch(html, /<link[^>]*rel="modulepreload"[^>]*vendor-(?:p5|three)/);
  assert.doesNotMatch(html, /fonts\.googleapis\.com/);
  assert.match(html, /rel="preload" href="\/fonts\/space-grotesk-latin\.woff2"/);
  assert.match(html, /<noscript>[\s\S]*?\.scroll-reveal[\s\S]*?opacity: 1 !important/);
});

test('canonical, discovery files, social image, and Person data agree', async () => {
  const html = await readFile('dist/index.html', 'utf8');
  const robots = await readFile('dist/robots.txt', 'utf8');
  const sitemap = await readFile('dist/sitemap.xml', 'utf8');
  const image = await readFile('dist/og-card.png');
  const origin = 'https://tuandacadev.vercel.app/';
  assert.match(html, /rel="canonical" href="https:\/\/tuandacadev\.vercel\.app\/"/);
  assert.match(html, /property="og:image" content="https:\/\/tuandacadev\.vercel\.app\/og-card\.png"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(robots, /Sitemap: https:\/\/tuandacadev\.vercel\.app\/sitemap\.xml/);
  assert.match(sitemap, /<loc>https:\/\/tuandacadev\.vercel\.app\/<\/loc>/);
  assert.equal((sitemap.match(/<url>/g) || []).length, 1);
  assert.equal(image.toString('hex', 0, 8), '89504e470d0a1a0a');
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 630);
  const structuredData = html.match(/<script type="application\/ld\+json">\s*([^<]+)\s*<\/script>/);
  assert.ok(structuredData);
  const person = JSON.parse(structuredData[1]);
  assert.equal(person['@type'], 'Person');
  assert.equal(person.url, origin);
  assert.equal(person.name, 'Ngo Anh Tuan');
});
