import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => server.close());
const { default: App } = await server.ssrLoadModule('/src/App.tsx');
const { buildContactPayload } = await server.ssrLoadModule('/src/components/ContactSection.tsx');
const html = renderToStaticMarkup(React.createElement(App));

test('recruiter path leads from exact role and project CTA to contact', () => {
  const hero = html.match(/<section id="hero"[\s\S]*?<\/section>/)?.[0];
  assert.ok(hero, 'hero renders');
  assert.match(hero, /Full-Stack Software Engineer<\/span>/);
  assert.match(hero, /href="#projects" id="hero-projects-btn"/);
  assert.doesNotMatch(hero, /github\.com\/Tuandaca|mailto:/, 'hero has no duplicate quick contact strip');
  assert.match(html, /href="#contact" id="nav-hire-btn"/);
});

test('About profile presents professional links before personal channels', () => {
  const about = html.match(/<section id="about"[\s\S]*?<\/section>/)?.[0];
  assert.ok(about, 'About section renders');
  const professional = ['about-github-link', 'about-email-link', 'about-phone-link'];
  const personal = ['about-discord-link', 'about-facebook-link', 'about-instagram-link'];
  const positions = [...professional, ...personal].map((id) => about.indexOf(`id="${id}"`));
  assert.ok(positions.every((position) => position >= 0), 'all six verified channels render');
  assert.ok(positions[0] < positions[1] && positions[1] < positions[2], 'professional links follow keyboard order');
  assert.ok(Math.max(...positions.slice(0, 3)) < Math.min(...positions.slice(3)), 'personal links follow professional links');
});

test('contact form lets a visitor skip subject and submits a server-valid default', () => {
  const subject = html.match(/<input[^>]*id="contact-subject"[^>]*>/)?.[0];
  assert.ok(subject, 'subject field remains available');
  assert.doesNotMatch(subject, /\brequired\b/);
  assert.equal(typeof buildContactPayload, 'function', 'form exposes its submission payload builder');
  const base = { name: 'Alex', email: 'alex@example.com', company: '', subject: ' ', message: 'Can we discuss this role?', website: '' };
  assert.deepEqual(buildContactPayload(base, 12345), { ...base, subject: 'Portfolio Inquiry', formLoadedAt: 12345 });
  assert.equal(buildContactPayload({ ...base, subject: ' Engineering role ' }, 12345).subject, 'Engineering role');
});

test('Experience leads with engineering internship and reserves amber for Aptis', () => {
  const experience = html.match(/<section id="experience"[\s\S]*?<\/section>/)?.[0];
  assert.ok(experience, 'Experience section renders');
  assert.ok(experience.indexOf('Software Developer Intern') < experience.indexOf('Rating Task'));
  assert.ok(experience.indexOf('Software Developer Intern') < experience.indexOf('B.Sc. Software Engineering'));
  assert.match(experience, /Aptis ESOL B2 \(2024\)/);
  assert.match(experience, /text-amber-300/);
});
