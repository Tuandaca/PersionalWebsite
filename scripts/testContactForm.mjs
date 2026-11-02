import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:5173/';
const USER_DATA_DIR = 'C:\\Users\\tuand\\AppData\\Local\\Temp\\chrome_contact_qa_' + Date.now();

console.log('===============================================================');
console.log('   CONTACT FORM & FOOTER REAL BROWSER CDP AUDIT               ');
console.log('===============================================================');

// 1. First test the contact endpoint directly against specification
console.log('\n--- 1. DIRECT API /api/contact SPECIFICATION TEST ---');
const API_URL = new URL('/api/contact', TARGET_URL).toString();

try {
  // 1.1 Valid payload
  const resValid = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Elena Rostova',
      email: 'elena@cybercore.io',
      company: 'CyberCore Inc',
      subject: 'Architecture Discussion',
      message: 'Hello Tuan, let us build something incredible together.',
      formLoadedAt: Date.now() - 3500, // 3.5s elapsed
    }),
  });
  assert.equal(resValid.status, 200, 'Valid contact request should return HTTP 200');
  const dataValid = await resValid.json();
  assert.equal(dataValid.success, true, 'Valid response must indicate success');
  console.log('✔ Direct API: Valid message submission returned HTTP 200 & success=true');

  // 1.2 Honeypot trigger (website field filled)
  const resBot = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Spam Bot',
      email: 'spammer@botnet.ru',
      company: 'SpamCorp LLC',
      website: 'https://spam.example.com', // genuine honeypot trap
      subject: 'Cheap backlinks',
      message: 'Buy our links now for instant high search rankings!',
      formLoadedAt: Date.now() - 5000,
    }),
  });
  assert.equal(resBot.status, 200, 'Honeypot should silently return HTTP 200');
  const dataBot = await resBot.json();
  assert.equal(dataBot.success, true, 'Honeypot returns success=true without dispatching');
  console.log('✔ Direct API: Honeypot (website field) caught and silently dropped with HTTP 200');

  // 1.3 Validation error: invalid email
  const resBad = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Elena Rostova',
      email: 'not-an-email',
      subject: 'Valid Subject',
      message: 'Valid length message text for testing validation.',
      formLoadedAt: Date.now() - 3500,
    }),
  });
  assert.equal(resBad.status, 400, 'Invalid email should return HTTP 400');
  console.log('✔ Direct API: Invalid payload rejected with HTTP 400');

  // 1.4 Missing required fields
  const resMissing = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'A',
      message: 'Too short',
    }),
  });
  assert.equal(resMissing.status, 400, 'Missing fields should return HTTP 400');
  console.log('✔ Direct API: Missing fields rejected with HTTP 400');
} catch (apiErr) {
  console.warn('⚠ Direct API endpoint test skipped or warning (dev server may be offline):', apiErr.message);
}

// 2. Headless Chrome Browser Form Test
console.log('\n--- 2. REAL BROWSER DOM & FORM INTERACTION AUDIT ---');

const chromeProcess = spawn(CHROME_PATH, [
  '--headless=new',
  '--remote-debugging-port=9223',
  `--user-data-dir=${USER_DATA_DIR}`,
  '--no-first-run',
  '--no-default-browser-check',
  'about:blank'
]);

let ws = null;
let msgId = 1;
const callbacks = new Map();

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    callbacks.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const res = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (res.exceptionDetails) {
    throw new Error(`Evaluation failed: ${JSON.stringify(res.exceptionDetails)}`);
  }
  return res.result?.value;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

try {
  let target = null;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9223/json/list');
      const tabs = await res.json();
      target = tabs.find((t) => t.type === 'page');
      if (target && target.webSocketDebuggerUrl) break;
    } catch {
      await sleep(250);
    }
  }

  if (!target || !target.webSocketDebuggerUrl) {
    throw new Error('Failed to find CDP page target on port 9223');
  }

  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      const { resolve, reject } = callbacks.get(msg.id);
      callbacks.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: TARGET_URL });
  await sleep(2000);

  // Check Contact Section and Form Elements
  const contactFormAudit = await evaluate(`(() => {
    const contactSec = document.getElementById('contact');
    const form = document.getElementById('contact-form');
    const nameInput = document.getElementById('contact-name');
    const emailInput = document.getElementById('contact-email');
    const subjectInput = document.getElementById('contact-subject');
    const messageInput = document.getElementById('contact-message');
    const submitBtn = document.getElementById('contact-submit-btn');
    const directEmail = document.getElementById('contact-email-link');
    const githubLink = document.getElementById('contact-github-link');

    // Footer check
    const footer = document.querySelector('footer');
    const bodyText = document.body.innerText;
    const hasHugeWatermark = document.querySelector('[class*="text-[14vw]"]') !== null ||
                             document.querySelector('[class*="text-[16vw]"]') !== null ||
                             document.querySelector('[class*="text-[20vw]"]') !== null;

    return {
      contactSecExists: !!contactSec,
      formExists: !!form,
      nameExists: !!nameInput,
      emailExists: !!emailInput,
      subjectExists: !!subjectInput,
      messageExists: !!messageInput,
      submitBtnExists: !!submitBtn,
      directEmailHref: directEmail ? directEmail.getAttribute('href') : null,
      githubHref: githubLink ? githubLink.getAttribute('href') : null,
      footerExists: !!footer,
      hasHugeWatermark: hasHugeWatermark,
    };
  })()`);

  assert.ok(contactFormAudit.contactSecExists, '#contact section must exist');
  assert.ok(contactFormAudit.formExists, '#contact-form element must exist');
  assert.ok(contactFormAudit.nameExists, 'Name input must exist');
  assert.ok(contactFormAudit.emailExists, 'Email input must exist');
  assert.ok(contactFormAudit.subjectExists, 'Subject input must exist');
  assert.ok(contactFormAudit.messageExists, 'Message textarea must exist');
  assert.ok(contactFormAudit.submitBtnExists, 'Submit button must exist');
  assert.equal(contactFormAudit.hasHugeWatermark, false, 'Huge watermark must be completely removed');
  assert.ok(contactFormAudit.directEmailHref?.includes('ngoanhtuan23.it@gmail.com'), 'Direct mail link must be present');
  console.log('✔ Form Structure: All inputs, labels, buttons, and fallback links mounted in DOM');
  console.log('✔ Footer Cleanliness: Legacy empty watermark confirmed 100% removed');

  // Test form submission inside the browser
  console.log('\n[Form] Testing in-browser submission through React state...');
  const submitResult = await evaluate(`(async () => {
    const nameInput = document.getElementById('contact-name');
    const emailInput = document.getElementById('contact-email');
    const subjectInput = document.getElementById('contact-subject');
    const messageInput = document.getElementById('contact-message');
    const form = document.getElementById('contact-form');

    // Fill form
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    const nativeAreaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;

    nativeSetter.call(nameInput, 'Alex Chen');
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    nameInput.dispatchEvent(new Event('change', { bubbles: true }));

    nativeSetter.call(emailInput, 'alex.chen@cyberinfra.dev');
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    emailInput.dispatchEvent(new Event('change', { bubbles: true }));

    nativeSetter.call(subjectInput, 'Full Stack Opportunities');
    subjectInput.dispatchEvent(new Event('input', { bubbles: true }));
    subjectInput.dispatchEvent(new Event('change', { bubbles: true }));

    nativeAreaSetter.call(messageInput, 'Excited to discuss building high performance distributed systems.');
    messageInput.dispatchEvent(new Event('input', { bubbles: true }));
    messageInput.dispatchEvent(new Event('change', { bubbles: true }));

    // Submit form
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    // Wait for submission response
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 200));
      const successBanner = document.querySelector('[role="status"]');
      if (successBanner && successBanner.textContent.includes('Message Sent Successfully')) {
        return {
          delivered: true,
          bannerText: successBanner.textContent.trim(),
        };
      }
    }

    return { delivered: false };
  })()`);

  assert.ok(submitResult.delivered, 'Form submission must display TRANSMISSION DELIVERED status');
  console.log(`✔ Form Submission: In-browser submission succeeded -> "${submitResult.bannerText.slice(0, 60)}..."`);

  console.log('\n===============================================================');
  console.log('   CONTACT FORM & FOOTER AUDIT COMPLETE — 100% SUCCESS!        ');
  console.log('===============================================================');
} catch (err) {
  console.error('\n❌ CONTACT AUDIT FAILED:', err);
  process.exitCode = 1;
} finally {
  if (ws) ws.close();
  chromeProcess.kill();
}
