import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

const root = process.cwd();
const output = path.join(root, 'dist', 'index.html');
const server = await createServer({
  configFile: path.join(root, 'vite.config.ts'),
  server: { middlewareMode: true },
  appType: 'custom',
});

try {
  const { default: App } = await server.ssrLoadModule('/src/App.tsx');
  const markup = renderToString(React.createElement(React.StrictMode, null, React.createElement(App)));
  if (!markup.includes('<h1') || !markup.includes('id="projects"') || !markup.includes('id="contact"')) {
    throw new Error('Prerendered portfolio is missing its semantic content');
  }

  const html = await readFile(output, 'utf8');
  const emptyRoot = '<div id="root"></div>';
  if (!html.includes(emptyRoot)) throw new Error('Built HTML is missing the empty React root');
  await writeFile(output, html.replace(emptyRoot, `<div id="root">${markup}</div>`));
  console.log(`Prerendered portfolio content into dist/index.html (${markup.length} characters)`);
} finally {
  await server.close();
}
