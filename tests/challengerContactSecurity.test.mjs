import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Auto-respawn with --experimental-strip-types if run under pure node without flags
if (!process.execArgv.includes('--experimental-strip-types')) {
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    { stdio: 'inherit', env: process.env }
  );
  process.exit(result.status ?? 0);
}

// Dynamically import api/contact.ts
const { default: handler, _resetRateLimits } = await import('../api/contact.ts');

console.log('========================================================================');
console.log('   CHALLENGER 2: ADVERSARIAL API SECURITY & PROTOCOL STRESS HARNESS    ');
console.log('========================================================================\n');

// Mock request and response builder
function createMockReqRes({
  method = 'POST',
  body = {},
  headers = {},
  ip = '127.0.0.1',
  rawBody = null,
} = {}) {
  const req = {
    method,
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
      ...headers,
    },
    body: rawBody !== null ? rawBody : body,
  };

  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = String(value);
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    end(data) {
      this.body = data;
      return this;
    },
  };

  return { req, res };
}

// Global fetch mocking
const originalFetch = globalThis.fetch;
let mockFetchCalls = [];

function setupMockFetch(responder) {
  mockFetchCalls = [];
  globalThis.fetch = async (url, options) => {
    mockFetchCalls.push({ url, options });
    if (typeof responder === 'function') {
      return responder(url, options);
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: 'mock_delivered_id' }),
      text: async () => JSON.stringify({ id: 'mock_delivered_id' }),
    };
  };
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

let challengeTestsPassed = 0;
let challengeTestsTotal = 0;

async function runChallenge(category, name, fn) {
  challengeTestsTotal++;
  console.log(`[Challenge ${challengeTestsTotal}] [${category}] ${name}`);
  try {
    _resetRateLimits();
    await fn();
    challengeTestsPassed++;
    console.log(`  ✔ PASSED\n`);
  } catch (err) {
    console.error(`  ❌ FAILED: ${name}`);
    console.error(err);
    throw err;
  }
}

try {
  process.env.RESEND_API_KEY = 're_test_empiric_key';
  process.env.CONTACT_FROM_EMAIL = 'Portfolio <test@dev.network>';
  process.env.CONTACT_TO_EMAIL = 'ngoanhtuan23.it@gmail.com';

  // =========================================================================
  // 1. RATE LIMITING ADVERSARIAL CHALLENGES
  // =========================================================================

  await runChallenge('RATE LIMITING', 'Rapid burst: 5 permitted, 10 subsequent rejected with 429 & Retry-After', async () => {
    setupMockFetch();
    const attackerIp = '185.220.101.5';

    // 5 allowed
    for (let i = 1; i <= 5; i++) {
      const { req, res } = createMockReqRes({
        ip: attackerIp,
        body: {
          name: `Attacker User ${i}`,
          email: `attacker${i}@test.com`,
          subject: `Burst Message ${i}`,
          message: 'Valid length testing body for rapid burst sequence.',
          formLoadedAt: Date.now() - 5000,
        },
      });
      await handler(req, res);
      assert.equal(res.statusCode, 200, `Request ${i} must succeed with 200`);
    }
    assert.equal(mockFetchCalls.length, 5, 'Exactly 5 emails dispatched');

    // 10 subsequent rapid requests must all be 429
    for (let i = 6; i <= 15; i++) {
      const { req, res } = createMockReqRes({
        ip: attackerIp,
        body: {
          name: `Attacker User ${i}`,
          email: `attacker${i}@test.com`,
          subject: `Burst Message ${i}`,
          message: 'Valid length testing body for rapid burst sequence.',
          formLoadedAt: Date.now() - 5000,
        },
      });
      await handler(req, res);
      assert.equal(res.statusCode, 429, `Request ${i} must return HTTP 429`);
      assert.ok(res.headers['retry-after'], `Request ${i} must include Retry-After header`);
      const retryAfterSec = parseInt(res.headers['retry-after'], 10);
      assert.ok(retryAfterSec >= 1 && retryAfterSec <= 60, `Retry-After must be between 1 and 60 seconds (got ${retryAfterSec})`);
      assert.ok(res.body.error.includes('Too many requests'), 'Response error body must explain rate limit');
      assert.equal(res.body.retryAfter, retryAfterSec, 'Response JSON body must include retryAfter integer');
    }
    assert.equal(mockFetchCalls.length, 5, 'Provider calls must remain exactly 5 (zero dispatched during 429s)');
  });

  await runChallenge('RATE LIMITING', 'Per-IP Isolation: Rate limiting IP A does not throttle IP B', async () => {
    setupMockFetch();
    const ipA = '192.0.2.1';
    const ipB = '192.0.2.2';

    // Exhaust IP A
    for (let i = 1; i <= 5; i++) {
      const { req, res } = createMockReqRes({
        ip: ipA,
        body: {
          name: 'User A',
          email: 'usera@test.com',
          subject: 'Subject A',
          message: 'Valid length message from user A.',
          formLoadedAt: Date.now() - 5000,
        },
      });
      await handler(req, res);
      assert.equal(res.statusCode, 200);
    }

    // IP A 6th request: 429
    const { req: reqA6, res: resA6 } = createMockReqRes({
      ip: ipA,
      body: {
        name: 'User A',
        email: 'usera@test.com',
        subject: 'Subject A',
        message: 'Valid length message from user A.',
        formLoadedAt: Date.now() - 5000,
      },
    });
    await handler(reqA6, resA6);
    assert.equal(resA6.statusCode, 429, 'IP A must be rate limited');

    // IP B 1st request: must succeed with 200
    const { req: reqB1, res: resB1 } = createMockReqRes({
      ip: ipB,
      body: {
        name: 'User B',
        email: 'userb@test.com',
        subject: 'Subject B',
        message: 'Valid length message from user B.',
        formLoadedAt: Date.now() - 5000,
      },
    });
    await handler(reqB1, resB1);
    assert.equal(resB1.statusCode, 200, 'IP B must not be affected by IP A throttling');
  });

  await runChallenge('RATE LIMITING', 'Fuzzing defense: 5 failed validation requests trigger 429 on subsequent attempt', async () => {
    setupMockFetch(() => assert.fail('Provider should never be called'));
    const fuzzerIp = '198.51.100.77';

    // Send 5 invalid payloads (e.g. empty name)
    for (let i = 1; i <= 5; i++) {
      const { req, res } = createMockReqRes({
        ip: fuzzerIp,
        body: {
          name: '', // Invalid
          email: 'fuzzer@test.com',
          subject: 'Fuzzing attempt',
          message: 'Valid length message text.',
          formLoadedAt: Date.now() - 5000,
        },
      });
      await handler(req, res);
      assert.equal(res.statusCode, 400, `Request ${i} must return HTTP 400 validation error`);
    }

    // 6th request: even if payload is valid, it MUST be rate limited (429)
    const { req: r6, res: s6 } = createMockReqRes({
      ip: fuzzerIp,
      body: {
        name: 'Now Valid Name',
        email: 'valid@test.com',
        subject: 'Now Valid Subject',
        message: 'Valid length message text.',
        formLoadedAt: Date.now() - 5000,
      },
    });
    await handler(r6, s6);
    assert.equal(s6.statusCode, 429, 'Fuzzer must be throttled with HTTP 429 after 5 failed validation attempts');
    assert.ok(s6.headers['retry-after'], 'Must contain Retry-After header');
    assert.equal(mockFetchCalls.length, 0, 'Zero provider calls throughout fuzzing throttling');
  });

  await runChallenge('RATE LIMITING', 'X-Forwarded-For parsing: handles multi-hop proxy chains & arrays', async () => {
    setupMockFetch();

    // Multi-proxy header string
    const { req: req1, res: res1 } = createMockReqRes({
      headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178' },
      body: {
        name: 'Proxy User',
        email: 'proxy@test.com',
        subject: 'Proxy Test',
        message: 'Testing multi-proxy header parsing.',
        formLoadedAt: Date.now() - 5000,
      },
    });
    await handler(req1, res1);
    assert.equal(res1.statusCode, 200);

    // Array form of x-forwarded-for
    const { req: req2, res: res2 } = createMockReqRes({
      headers: { 'x-forwarded-for': ['198.51.100.42', '10.0.0.1'] },
      body: {
        name: 'Proxy User 2',
        email: 'proxy2@test.com',
        subject: 'Proxy Test 2',
        message: 'Testing array proxy header parsing.',
        formLoadedAt: Date.now() - 5000,
      },
    });
    await handler(req2, res2);
    assert.equal(res2.statusCode, 200);

    // Fallback to x-real-ip
    const { req: req3, res: res3 } = createMockReqRes({
      headers: { 'x-real-ip': '198.51.100.99' },
      body: {
        name: 'Proxy User 3',
        email: 'proxy3@test.com',
        subject: 'Proxy Test 3',
        message: 'Testing x-real-ip fallback.',
        formLoadedAt: Date.now() - 5000,
      },
    });
    delete req3.headers['x-forwarded-for'];
    await handler(req3, res3);
    assert.equal(res3.statusCode, 200);
  });

  // =========================================================================
  // 2. INPUT VALIDATION ADVERSARIAL CHALLENGES
  // =========================================================================

  await runChallenge('INPUT VALIDATION', 'Rejects completely empty body, null, and malformed JSON syntax', async () => {
    setupMockFetch(() => assert.fail('Should never reach provider'));

    // Empty object
    {
      const { req, res } = createMockReqRes({ ip: '10.1.1.1', body: {} });
      await handler(req, res);
      assert.equal(res.statusCode, 400);
    }

    // Malformed JSON string
    {
      const { req, res } = createMockReqRes({ ip: '10.1.1.2', rawBody: '{ name: invalid-json ' });
      await handler(req, res);
      assert.equal(res.statusCode, 400);
      assert.ok(res.body.error.includes('JSON'));
    }

    // Null body
    {
      const { req, res } = createMockReqRes({ ip: '10.1.1.3', rawBody: null });
      await handler(req, res);
      assert.equal(res.statusCode, 400);
    }
  });

  await runChallenge('INPUT VALIDATION', 'Rejects whitespace-only inputs for all required fields', async () => {
    setupMockFetch(() => assert.fail('Should never reach provider'));

    const fields = ['name', 'email', 'subject', 'message'];
    let idx = 10;
    for (const field of fields) {
      idx++;
      const payload = {
        name: 'Valid Name',
        email: 'valid@example.com',
        subject: 'Valid Subject',
        message: 'Valid length message text here.',
        [field]: '   \t  \n  ',
      };
      const { req, res } = createMockReqRes({ ip: `10.2.1.${idx}`, body: payload });
      await handler(req, res);
      assert.equal(res.statusCode, 400, `Whitespace-only ${field} must return HTTP 400`);
    }
  });

  await runChallenge('INPUT VALIDATION', 'Boundary testing on min and max field lengths', async () => {
    setupMockFetch();

    // Name: 1 char (fail), 2 chars (pass), 80 chars (pass), 81 chars (fail)
    {
      const { req: r1, res: s1 } = createMockReqRes({ ip: '10.3.1.1', body: { name: 'A', email: 'v@e.com', subject: 'Sub', message: 'Message >= 10', formLoadedAt: Date.now() - 5000 } });
      await handler(r1, s1);
      assert.equal(s1.statusCode, 400, 'Name 1 char must fail');

      const { req: r2, res: s2 } = createMockReqRes({ ip: '10.3.1.2', body: { name: 'Al', email: 'v@e.com', subject: 'Sub', message: 'Message >= 10', formLoadedAt: Date.now() - 5000 } });
      await handler(r2, s2);
      assert.equal(s2.statusCode, 200, 'Name 2 chars must pass');

      const { req: r3, res: s3 } = createMockReqRes({ ip: '10.3.1.3', body: { name: 'A'.repeat(80), email: 'v@e.com', subject: 'Sub', message: 'Message >= 10', formLoadedAt: Date.now() - 5000 } });
      await handler(r3, s3);
      assert.equal(s3.statusCode, 200, 'Name 80 chars must pass');

      const { req: r4, res: s4 } = createMockReqRes({ ip: '10.3.1.4', body: { name: 'A'.repeat(81), email: 'v@e.com', subject: 'Sub', message: 'Message >= 10', formLoadedAt: Date.now() - 5000 } });
      await handler(r4, s4);
      assert.equal(s4.statusCode, 400, 'Name 81 chars must fail');
    }

    // Subject: 2 chars (fail), 3 chars (pass), 120 chars (pass), 121 chars (fail)
    {
      const { req: r1, res: s1 } = createMockReqRes({ ip: '10.3.2.1', body: { name: 'Alex', email: 'v@e.com', subject: 'Hi', message: 'Message >= 10', formLoadedAt: Date.now() - 5000 } });
      await handler(r1, s1);
      assert.equal(s1.statusCode, 400, 'Subject 2 chars must fail');

      const { req: r2, res: s2 } = createMockReqRes({ ip: '10.3.2.2', body: { name: 'Alex', email: 'v@e.com', subject: 'Hey', message: 'Message >= 10', formLoadedAt: Date.now() - 5000 } });
      await handler(r2, s2);
      assert.equal(s2.statusCode, 200, 'Subject 3 chars must pass');

      const { req: r3, res: s3 } = createMockReqRes({ ip: '10.3.2.3', body: { name: 'Alex', email: 'v@e.com', subject: 'S'.repeat(120), message: 'Message >= 10', formLoadedAt: Date.now() - 5000 } });
      await handler(r3, s3);
      assert.equal(s3.statusCode, 200, 'Subject 120 chars must pass');

      const { req: r4, res: s4 } = createMockReqRes({ ip: '10.3.2.4', body: { name: 'Alex', email: 'v@e.com', subject: 'S'.repeat(121), message: 'Message >= 10', formLoadedAt: Date.now() - 5000 } });
      await handler(r4, s4);
      assert.equal(s4.statusCode, 400, 'Subject 121 chars must fail');
    }

    // Message: 9 chars (fail), 10 chars (pass), 2000 chars (pass), 2001 chars (fail)
    {
      const { req: r1, res: s1 } = createMockReqRes({ ip: '10.3.3.1', body: { name: 'Alex', email: 'v@e.com', subject: 'Hey', message: '123456789', formLoadedAt: Date.now() - 5000 } });
      await handler(r1, s1);
      assert.equal(s1.statusCode, 400, 'Message 9 chars must fail');

      const { req: r2, res: s2 } = createMockReqRes({ ip: '10.3.3.2', body: { name: 'Alex', email: 'v@e.com', subject: 'Hey', message: '1234567890', formLoadedAt: Date.now() - 5000 } });
      await handler(r2, s2);
      assert.equal(s2.statusCode, 200, 'Message 10 chars must pass');

      const { req: r3, res: s3 } = createMockReqRes({ ip: '10.3.3.3', body: { name: 'Alex', email: 'v@e.com', subject: 'Hey', message: 'M'.repeat(2000), formLoadedAt: Date.now() - 5000 } });
      await handler(r3, s3);
      assert.equal(s3.statusCode, 200, 'Message 2000 chars must pass');

      const { req: r4, res: s4 } = createMockReqRes({ ip: '10.3.3.4', body: { name: 'Alex', email: 'v@e.com', subject: 'Hey', message: 'M'.repeat(2001), formLoadedAt: Date.now() - 5000 } });
      await handler(r4, s4);
      assert.equal(s4.statusCode, 400, 'Message 2001 chars must fail');
    }
  });

  await runChallenge('INPUT VALIDATION', 'Oversized payload boundary (> 10,240 bytes)', async () => {
    setupMockFetch(() => assert.fail('Should never reach provider'));

    // Construct payload with byteLength strictly greater than 10240 bytes
    const hugeMessage = 'X'.repeat(10500);
    const finalSerialized = JSON.stringify({
      name: 'Tester',
      email: 'test@example.com',
      subject: 'Large Test',
      message: hugeMessage,
    });

    assert.ok(Buffer.byteLength(finalSerialized, 'utf8') > 10240, 'Must exceed 10KB');

    const { req, res } = createMockReqRes({ ip: '10.4.1.1', rawBody: finalSerialized });
    await handler(req, res);
    assert.equal(res.statusCode, 400, 'Must return 400 for payload > 10KB');
    assert.ok(res.body.error.includes('10KB'));
  });

  await runChallenge('INPUT VALIDATION', 'HTTP Methods: GET, PUT, DELETE, PATCH, HEAD return 405 with Allow: POST', async () => {
    const nonPostMethods = ['GET', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    for (const m of nonPostMethods) {
      const { req, res } = createMockReqRes({ method: m, ip: '10.5.1.1' });
      await handler(req, res);
      assert.equal(res.statusCode, 405, `Method ${m} must return 405`);
      assert.equal(res.headers['allow'], 'POST', `Method ${m} must set Allow: POST`);
      assert.equal(res.body.error, 'Method Not Allowed');
    }
  });

  // =========================================================================
  // 3. HONEYPOT DEFENSE ADVERSARIAL CHALLENGES
  // =========================================================================

  await runChallenge('HONEYPOT DEFENSE', 'Honeypot website field returns silent 200 with zero emails dispatched', async () => {
    setupMockFetch(() => assert.fail('Provider MUST NOT be contacted when honeypot is triggered'));

    const botWebsites = [
      'https://cheapbacklinks.ru',
      'http://scam-site.xyz/phish',
      'www.spamdomain.com',
      'bot_value',
    ];

    let bIdx = 0;
    for (const site of botWebsites) {
      bIdx++;
      const { req, res } = createMockReqRes({
        ip: `10.6.1.${bIdx}`,
        body: {
          name: 'Spam Engine',
          email: 'bot@spamengine.net',
          subject: 'Special Offer',
          message: 'Buy our automated backlinks today for guaranteed rank 1.',
          website: site,
          formLoadedAt: Date.now() - 5000,
        },
      });

      await handler(req, res);
      assert.equal(res.statusCode, 200, 'Must return HTTP 200');
      assert.equal(res.body.success, true, 'Must return success: true to deceive bot');
      assert.equal(res.body.message, 'Message received.');
    }
    assert.equal(mockFetchCalls.length, 0, 'Zero provider calls across all honeypot attempts');
  });

  await runChallenge('HONEYPOT DEFENSE', 'Anti-bot submission timing check (< 1.5s silent 200 drop)', async () => {
    setupMockFetch(() => assert.fail('Provider MUST NOT be called on sub-1.5s submission'));

    // Bot submitting 400ms after load
    const { req, res } = createMockReqRes({
      ip: '10.6.2.1',
      body: {
        name: 'Flash Submitter',
        email: 'flash@bot.com',
        subject: 'Fast submission',
        message: 'This payload was submitted in 400 milliseconds.',
        formLoadedAt: Date.now() - 400,
      },
    });

    await handler(req, res);
    assert.equal(res.statusCode, 200, 'Sub-1.5s submission must return HTTP 200');
    assert.equal(res.body.success, true, 'Returns success: true');
    assert.equal(mockFetchCalls.length, 0, 'Zero provider calls on speed-bot submission');
  });

  // =========================================================================
  // 4. UNCONFIGURED ENVIRONMENT ADVERSARIAL CHALLENGES
  // =========================================================================

  await runChallenge('UNCONFIGURED ENV', 'HTTP 503 returned when RESEND_API_KEY missing (NO fake demo 200)', async () => {
    delete process.env.RESEND_API_KEY;
    setupMockFetch(() => assert.fail('Cannot call provider without API key'));

    const { req, res } = createMockReqRes({
      ip: '10.7.1.1',
      body: {
        name: 'Curious Recruiter',
        email: 'recruiter@techcorp.com',
        subject: 'Staff Engineer Opportunity',
        message: 'We are very interested in your distributed systems experience.',
        formLoadedAt: Date.now() - 5000,
      },
    });

    await handler(req, res);
    assert.equal(res.statusCode, 503, 'Must return HTTP 503 when RESEND_API_KEY is not defined');
    assert.notEqual(res.statusCode, 200, 'CRITICAL: Must NEVER fabricate a fake 200 demo response');
    assert.ok(res.body.error.includes('unconfigured') || res.body.error.includes('RESEND_API_KEY'));
    assert.equal(mockFetchCalls.length, 0, 'Zero calls to provider');
  });

  await runChallenge('UNCONFIGURED ENV', 'HTTP 503 returned when RESEND_API_KEY is empty string', async () => {
    process.env.RESEND_API_KEY = '';
    setupMockFetch(() => assert.fail('Cannot call provider without API key'));

    const { req, res } = createMockReqRes({
      ip: '10.7.1.2',
      body: {
        name: 'Curious Recruiter',
        email: 'recruiter@techcorp.com',
        subject: 'Staff Engineer Opportunity',
        message: 'We are very interested in your distributed systems experience.',
        formLoadedAt: Date.now() - 5000,
      },
    });

    await handler(req, res);
    assert.equal(res.statusCode, 503, 'Must return HTTP 503 when RESEND_API_KEY is empty');
    assert.notEqual(res.statusCode, 200, 'Must NEVER return 200 on empty key');
  });

  // =========================================================================
  // 5. HEADER INJECTION & SANITIZATION CHALLENGES
  // =========================================================================

  await runChallenge('HEADER INJECTION', 'CRLF and control characters in name, subject, and company are stripped', async () => {
    process.env.RESEND_API_KEY = 're_test_empiric_key';
    setupMockFetch();

    const attackName = 'Eve Attacker\r\nBcc: victim@domain.com\x00\x1B';
    const attackSubject = 'Important Security Notice\r\nContent-Type: text/html\x00';
    const attackCompany = 'Injected Org\r\nX-Spam-Flag: YES\r\n';
    const attackMessage = 'Hello Tuan,\r\nThis has legitimate multi-line text.\r\nAnd an embedded <script>alert(1)</script> attempt.';

    const { req, res } = createMockReqRes({
      ip: '10.8.1.1',
      body: {
        name: attackName,
        email: 'eve.attacker@security.org',
        company: attackCompany,
        subject: attackSubject,
        message: attackMessage,
        formLoadedAt: Date.now() - 5000,
      },
    });

    await handler(req, res);
    assert.equal(res.statusCode, 200, 'Request should process after sanitization');
    assert.equal(mockFetchCalls.length, 1, 'Provider was called');

    const callPayload = JSON.parse(mockFetchCalls[0].options.body);

    // Assert subject is sanitized
    assert.ok(!callPayload.subject.includes('\r'), 'Subject must not contain \\r');
    assert.ok(!callPayload.subject.includes('\n'), 'Subject must not contain \\n');
    assert.ok(!callPayload.subject.includes('\x00'), 'Subject must not contain null byte');
    assert.ok(!callPayload.subject.includes('<') && !callPayload.subject.includes('>'), 'Subject must not contain < or >');

    // Assert text body has stripped control chars and < >
    assert.ok(!callPayload.text.includes('\r'), 'Text body must normalize \\r to \\n');
    assert.ok(!callPayload.text.includes('\x00'), 'Text body must strip null bytes');
    assert.ok(!callPayload.text.includes('<script>'), 'HTML script tags must be stripped');
    assert.ok(callPayload.text.includes('alert(1)'), 'Raw text content is preserved without tag delimiters');
  });

  await runChallenge('HEADER INJECTION', 'CRLF in email address is rejected at validation stage (HTTP 400)', async () => {
    process.env.RESEND_API_KEY = 're_test_empiric_key';
    setupMockFetch(() => assert.fail('Provider should never be called'));

    const maliciousEmails = [
      'attacker@evil.com\r\nBcc: victim@target.com',
      'attacker@evil.com\nTo: admin@target.com',
      'attacker\r@evil.com',
    ];

    let eIdx = 0;
    for (const evilEmail of maliciousEmails) {
      eIdx++;
      const { req, res } = createMockReqRes({
        ip: `10.8.2.${eIdx}`,
        body: {
          name: 'Evil Injector',
          email: evilEmail,
          subject: 'Header Injection Attack',
          message: 'Trying to inject SMTP envelope headers.',
          formLoadedAt: Date.now() - 5000,
        },
      });

      await handler(req, res);
      assert.equal(res.statusCode, 400, `Email with injection payload "${evilEmail}" must return HTTP 400`);
      assert.ok(res.body.error.toLowerCase().includes('email'));
    }

    assert.equal(mockFetchCalls.length, 0, 'Zero provider calls on email injection attempts');
  });

  await runChallenge('HEADER INJECTION', 'Embedded null byte \\x00 in email is stripped by sanitizeEmail before dispatch', async () => {
    process.env.RESEND_API_KEY = 're_test_empiric_key';
    setupMockFetch();

    const { req, res } = createMockReqRes({
      ip: '10.8.3.1',
      body: {
        name: 'NullByte User',
        email: 'attacker\x00@evil.com',
        subject: 'Null Byte Test',
        message: 'Valid length message for testing null byte in email.',
        formLoadedAt: Date.now() - 5000,
      },
    });

    await handler(req, res);
    assert.equal(res.statusCode, 200, 'Handled safely and returned 200');
    assert.equal(mockFetchCalls.length, 1, 'Provider was called with sanitized email');

    const callPayload = JSON.parse(mockFetchCalls[0].options.body);
    assert.equal(callPayload.reply_to, 'attacker@evil.com', 'Null byte \\x00 must be completely stripped from reply_to');
    assert.ok(!callPayload.reply_to.includes('\x00'), 'reply_to must not contain null byte');
  });

  console.log('========================================================================');
  console.log(`   ALL ${challengeTestsPassed}/${challengeTestsTotal} ADVERSARIAL CHALLENGES PASSED! (100%)       `);
  console.log('========================================================================');
} finally {
  restoreFetch();
}
