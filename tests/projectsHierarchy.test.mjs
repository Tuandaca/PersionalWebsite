import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
});
after(() => server.close());

const { default: App } = await server.ssrLoadModule('/src/App.tsx');
const html = renderToStaticMarkup(React.createElement(App));
const projects = html.match(/<section id="projects"[\s\S]*?<\/section>/)?.[0];
assert.ok(projects, 'The portfolio renders a Projects section');

test('flagship projects lead the rendered portfolio and secondary projects follow', () => {
  const cards = [...projects.matchAll(/<article\b[^>]*data-project-tier="(flagship|secondary)"[^>]*>[\s\S]*?<\/article>/g)];
  assert.deepEqual(cards.map(([, tier]) => tier), ['flagship', 'flagship', 'secondary', 'secondary']);
  assert.deepEqual(
    cards.map(([card]) => card.match(/<h3[^>]*>(.*?)<\/h3>/)?.[1]),
    [
      'Travel AI — GraphRAG &amp; Knowledge Graph Q&amp;A',
      'Cinema — Movie Booking &amp; AI Recommendation',
      'AI Coding Starter',
      'Gaming Mouse — Premium Product Landing Page',
    ],
  );
});

test('each flagship communicates a technical challenge and architecture in its card', () => {
  const flagships = [...projects.matchAll(/<article\b[^>]*data-project-tier="flagship"[^>]*>[\s\S]*?<\/article>/g)]
    .map(([card]) => card);
  assert.equal(flagships.length, 2);
  for (const card of flagships) {
    assert.match(card, /Technical challenge/);
    assert.match(card, /Architecture/);
    assert.match(card, /Contribution/);
    assert.match(card, /Engineering focus/);
    assert.match(card, /View Source/);
  }
  assert.match(flagships[0], /FastAPI/);
  assert.match(flagships[0], /Neo4j/);
  assert.match(flagships[1], /Redis/);
  assert.match(flagships[1], /Socket.IO/);
});

test('Travel AI describes node retrieval and its verified contribution', () => {
  const travel = [...projects.matchAll(/<article\b[^>]*data-project-tier="flagship"[^>]*>[\s\S]*?<\/article>/g)][0]?.[0];
  assert.ok(travel);
  assert.match(travel, /vector index/i);
  assert.match(travel, /keyword.*node/i);
  assert.match(travel, /Engineering focus/);
  assert.doesNotMatch(travel, /relationship traversal|relationships between|Cypher paths/i);
});

test('engineering capabilities describe observable project mechanisms without outcome guarantees', () => {
  assert.match(html, /Redis-backed seat holds and Socket.IO seat updates/);
  assert.match(html, /Neo4j vector index and Cypher keyword search/);
  assert.doesNotMatch(html, /low-latency|transaction isolation|hallucination-resistant|entity-relation graphs/i);
});
