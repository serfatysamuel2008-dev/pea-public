// Génère public/products/*.webp à partir du générateur 3D.
// Usage : npm run render [-- slug1 slug2]
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Playwright : dépendance locale (npm i -D playwright) ou installation globale.
const { chromium } = await import('playwright').catch(() => createRequire(import.meta.url)('playwright'));

const root = fileURLToPath(new URL('../..', import.meta.url));
const only = process.argv.slice(2);
const server = await createServer({ root, server: { port: 5199 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('console', (m) => m.type() === 'error' && console.error(m.text()));
await page.goto('http://localhost:5199/render.html');
await page.waitForFunction(() => typeof window.renderAll === 'function');
const images = await page.evaluate((o) => window.renderAll(o.length ? o : undefined), only);
await mkdir(new URL('../../public/products/', import.meta.url), { recursive: true });
for (const [name, dataUrl] of Object.entries(images)) {
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  await writeFile(new URL(`../../public/products/${name}.webp`, import.meta.url), buf);
}
console.log(`${Object.keys(images).length} images écrites dans public/products/`);
await browser.close();
await server.close();
