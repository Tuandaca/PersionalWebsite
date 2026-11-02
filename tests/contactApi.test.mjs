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

console.log('===============================================================');
console.log('   CONTACT API (POST /api/contact) COMPREHENSIVE TEST SUITE    ');
console.log('===============================================================');

// Mock request and response builder
function createMockReqRes({
  method = 'POST',
  body = {},
  headers = {},
  ip = '127.0.0.1',
} = {}) {
  const req = {
    method,
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
      ...headers,
    },
    body,
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
let mockFetchResponse = null;

function setupMockFetch(responder) {
  mockFetchCalls = [];
  globalThis.fetch = async (url, options) => {
    mockFetchCalls.push({ url, options });
    if (typeof responder === 'function') {
      return responder(url, options);
    }
    return mockFetchResponse;
  };
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

let passedTests = 0;
let totalTests = 0;

async function runTest(name, fn) {
  totalTests++;
  console.log(`\n[Test ${totalTests}] ${name}`);
  try {
    _resetRateLimits();
    await fn();
    passedTests++;
    console.log(`  ✔ Passed: ${name}`);
  } catch (err) {
    console.error(`  ❌ FAILED: ${name}`);
    console.error(err);
    throw err;
  }
}

try {
  // ── TEST 1: Valid submission (HTTP 200/202 accepted by provider) ───────────
  await runTest('Status 200/202: Valid submission accepted by Resend provider', async () => {
    process.env.RESEND_API_KEY = 're_test_mock_valid_key';
    process.env.CONTACT_FROM_EMAIL = 'Portfolio <test@dev.network>';
    process.env.CONTACT_TO_EMAIL = 'ngoanhtuan23.it@gmail.com';

    setupMockFetch(() => ({
      ok: true,
      status: 200,
      json: async () => ({ id: 'resend_msg_001' }),
      text: async () => JSON.stringify({ id: 'resend_msg_001' }),
    }));

    const { req, res } = createMockReqRes({
      ip: '10.0.0.1',
      body: {
        name: 'Elena Rostova',
        email: 'elena@cybercore.io',
        company: 'CyberCore Inc',
        subject: 'Architecture Discussion',
        message: 'Hello Tuan, let us discuss building the next generation distributed system.',
        formLoadedAt: Date.now() - 5000,
      },
    });

    await handler(req, res);

    assert.equal(res.statusCode, 200, 'Should return HTTP 200 on successful Resend dispatch');
    assert.equal(res.body.success, true, 'Should indicate success: true');
    assert.equal(res.body.id, 'resend_msg_001', 'Should return provider message ID');
    assert.equal(mockFetchCalls.length, 1, 'Should call Resend API exactly once');

    const call = mockFetchCalls[0];
    assert.equal(call.url, 'https://api.resend.com/emails', 'Must call Resend emails endpoint');
    assert.equal(call.options.headers['Authorization'], 'Bearer re_test_mock_valid_key');

    const sentBody = JSON.parse(call.options.body);
    assert.equal(sentBody.from, 'Portfolio <test@dev.network>');
    assert.deepEqual(sentBody.to, ['ngoanhtuan23.it@gmail.com']);
    assert.equal(sentBody.reply_to, 'elena@cybercore.io');
    assert.ok(sentBody.subject.includes('Architecture Discussion — Elena Rostova'));
    assert.ok(sentBody.text.includes('CyberCore Inc'));
  });

  // ── TEST 2: Missing fields (HTTP 400 Bad Request) ─────────────────────────
  await runTest('Status 400: Rejects missing required fields', async () => {
    process.env.RESEND_API_KEY = 're_test_mock_valid_key';
    setupMockFetch(() => assert.fail('Resend API should not be called on validation error'));

    // 2a: Missing name
    {
      const { req, res } = createMockReqRes({
        ip: '10.0.0.2',
        body: {
          email: 'test@example.com',
          subject: 'Valid Subject',
          message: 'Valid length message here.',
        },
      });
      await handler(req, res);
      assert.equal(res.statusCode, 400, 'Missing name must return HTTP 400');
      assert.ok(res.body.error.toLowerCase().includes('name'));
    }

    // 2b: Missing email
    {
      const { req, res } = createMockReqRes({
        ip: '10.0.0.2',
        body: {
          name: 'Valid Name',
          subject: 'Valid Subject',
          message: 'Valid length message here.',
        },
      });
      await handler(req, res);
      assert.equal(res.statusCode, 400, 'Missing email must return HTTP 400');
      assert.ok(res.body.error.toLowerCase().includes('email'));
    }

    // 2c: Missing subject
    {
      const { req, res } = createMockReqRes({
        ip: '10.0.0.2',
        body: {
          name: 'Valid Name',
          email: 'test@example.com',
          message: 'Valid length message here.',
        },
      });
      await handler(req, res);
      assert.equal(res.statusCode, 400, 'Missing subject must return HTTP 400');
      assert.ok(res.body.error.toLowerCase().includes('subject'));
    }

    // 2d: Missing message
    {
      const { req, res } = createMockReqRes({
        ip: '10.0.0.2',
        body: {
          name: 'Valid Name',
          email: 'test@example.com',
          subject: 'Valid Subject',
        },
      });
      await handler(req, res);
      assert.equal(res.statusCode, 400, 'Missing message must return HTTP 400');
      assert.ok(res.body.error.toLowerCase().includes('message'));
    }

    assert.equal(mockFetchCalls.length, 0, 'No calls should be made to provider on missing fields');
  });

  // ── TEST 3: Invalid email format (HTTP 400 Bad Request) ───────────────────
  await runTest('Status 400: Rejects invalid email formats', async () => {
    process.env.RESEND_API_KEY = 're_test_mock_valid_key';
    setupMockFetch(() => assert.fail('Resend API should not be called'));

    const badEmails = ['plainaddress', 'missing@domain', '@no-local.com', 'spaces in@mail.com'];
    for (const badEmail of badEmails) {
      const { req, res } = createMockReqRes({
        ip: '10.0.0.3',
        body: {
          name: 'Alex Mercer',
          email: badEmail,
          subject: 'Engineering Opportunity',
          message: 'This is a message with sufficient character length.',
        },
      });
      await handler(req, res);
      assert.equal(res.statusCode, 400, `Bad email "${badEmail}" should return HTTP 400`);
      assert.ok(res.body.error.toLowerCase().includes('email'));
    }

    assert.equal(mockFetchCalls.length, 0, 'Zero provider calls on invalid emails');
  });

  // ── TEST 4: Oversized payload > 10KB (HTTP 400 Bad Request) ───────────────
  await runTest('Status 400: Rejects oversized payload > 10KB', async () => {
    process.env.RESEND_API_KEY = 're_test_mock_valid_key';
    setupMockFetch(() => assert.fail('Resend API should not be called on oversized payload'));

    // Create 11KB body
    const hugeMessage = 'X'.repeat(11 * 1024);
    const { req, res } = createMockReqRes({
      ip: '10.0.0.4',
      body: {
        name: 'Huge Sender',
        email: 'huge@sender.com',
        subject: 'Huge Subject',
        message: hugeMessage,
      },
    });

    await handler(req, res);

    assert.equal(res.statusCode, 400, 'Payload > 10KB must return HTTP 400');
    assert.ok(res.body.error.includes('10KB'), 'Error message must mention 10KB limit');
    assert.equal(mockFetchCalls.length, 0, 'Zero provider calls on oversized payload');
  });

  // ── TEST 5: Honeypot check (HTTP 200 silent drop, 0 emails dispatched) ─────
  await runTest('Status 200: Honeypot trap triggers silent 200 and 0 emails dispatched', async () => {
    process.env.RESEND_API_KEY = 're_test_mock_valid_key';
    setupMockFetch(() => assert.fail('Honeypot MUST NOT trigger Resend API calls!'));

    const { req, res } = createMockReqRes({
      ip: '10.0.0.5',
      body: {
        name: 'Spam Bot 3000',
        email: 'bot@spamnet.ru',
        subject: 'Cheap SEO backlinks',
        message: 'Buy high quality backlinks for your website ranking.',
        website: 'https://spambot-target.xyz', // HONEYPOT FILLED
      },
    });

    await handler(req, res);

    assert.equal(res.statusCode, 200, 'Honeypot should silently return HTTP 200');
    assert.equal(res.body.success, true, 'Honeypot returns success: true to mislead spambot');
    assert.equal(mockFetchCalls.length, 0, 'CRITICAL: Exactly ZERO emails must be dispatched to provider');
  });

  // ── TEST 6: Rate limit exceeded (HTTP 429 Too Many Requests) ──────────────
  await runTest('Status 429: In-memory sliding-window rate limiter with Retry-After header', async () => {
    process.env.RESEND_API_KEY = 're_test_mock_valid_key';
    setupMockFetch(() => ({
      ok: true,
      status: 200,
      json: async () => ({ id: 'resend_ok' }),
    }));

    const testIp = '198.51.100.99';

    // Send 5 permitted requests
    for (let i = 1; i <= 5; i++) {
      const { req, res } = createMockReqRes({
        ip: testIp,
        body: {
          name: `User ${i}`,
          email: `user${i}@example.com`,
          subject: `Request ${i}`,
          message: 'Valid length message for rate testing.',
          formLoadedAt: Date.now() - 5000,
        },
      });
      await handler(req, res);
      assert.equal(res.statusCode, 200, `Request ${i} within limit should return 200`);
    }

    assert.equal(mockFetchCalls.length, 5, '5 successful requests dispatched to provider');

    // 6th request from same IP within the window must be rate limited
    const { req: req6, res: res6 } = createMockReqRes({
      ip: testIp,
      body: {
        name: 'User 6',
        email: 'user6@example.com',
        subject: 'Request 6 (Exceeded)',
        message: 'This message should be rejected due to rate limiting.',
        formLoadedAt: Date.now() - 5000,
      },
    });

    await handler(req6, res6);

    assert.equal(res6.statusCode, 429, '6th request must return HTTP 429 Too Many Requests');
    assert.ok(res6.headers['retry-after'], 'Response must include Retry-After header');
    assert.ok(parseInt(res6.headers['retry-after'], 10) > 0, 'Retry-After must be > 0 seconds');
    assert.ok(res6.body.error.toLowerCase().includes('too many requests'), 'Error must specify rate limit');
    assert.equal(mockFetchCalls.length, 5, 'Rate-limited request must NOT dispatch an email');
  });

  // ── TEST 7: Service unconfigured (HTTP 503 Service Unavailable) ───────────
  await runTest('Status 503: Service unconfigured when RESEND_API_KEY is missing (no fake demo 200)', async () => {
    // Delete API key to simulate unconfigured environment
    delete process.env.RESEND_API_KEY;
    setupMockFetch(() => assert.fail('Cannot call provider without API key'));

    const { req, res } = createMockReqRes({
      ip: '10.0.0.7',
      body: {
        name: 'Marcus Brody',
        email: 'marcus@university.edu',
        subject: 'Collaboration Inquiry',
        message: 'Looking forward to discussing high performance architectures.',
        formLoadedAt: Date.now() - 5000,
      },
    });

    await handler(req, res);

    assert.equal(res.statusCode, 503, 'Missing RESEND_API_KEY must return HTTP 503 Service Unavailable');
    assert.notEqual(res.statusCode, 200, 'MUST NOT fabricate a fake demo 200 response');
    assert.ok(res.body.error.includes('unconfigured') || res.body.error.includes('RESEND_API_KEY'));
    assert.equal(mockFetchCalls.length, 0, 'Zero calls to provider when unconfigured');
  });

  // ── TEST 8: Provider failure (HTTP 502 Bad Gateway) ────────────────────────
  await runTest('Status 502: Provider or server failure handled with HTTP 502 Bad Gateway', async () => {
    process.env.RESEND_API_KEY = 're_test_mock_valid_key';

    // Simulate Resend 500 outage
    setupMockFetch(() => ({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error at Resend Infrastructure',
    }));

    const { req, res } = createMockReqRes({
      ip: '10.0.0.8',
      body: {
        name: 'Jordan Belfort',
        email: 'jordan@wallstreet.com',
        subject: 'Enterprise Opportunity',
        message: 'Valid length message for testing upstream provider error handling.',
        formLoadedAt: Date.now() - 5000,
      },
    });

    await handler(req, res);

    assert.equal(res.statusCode, 502, 'Upstream provider failure must return HTTP 502 Bad Gateway');
    assert.ok(res.body.error.toLowerCase().includes('provider'), 'Error message must reflect provider failure');
    assert.equal(mockFetchCalls.length, 1, 'Provider was called and failed');
  });

  // ── TEST 9: Security - CRLF Injection Sanitization ────────────────────────
  await runTest('Security: Strips CRLF characters from headers, email, and subject lines', async () => {
    process.env.RESEND_API_KEY = 're_test_mock_valid_key';

    setupMockFetch(() => ({
      ok: true,
      status: 200,
      json: async () => ({ id: 'crlf_safe_msg' }),
    }));

    const { req, res } = createMockReqRes({
      ip: '10.0.0.9',
      body: {
        name: 'Evil Attacker\r\nBcc: victim@target.com',
        email: 'attacker@evil.com',
        company: 'Injected\r\nHeader: Attack',
        subject: 'Normal Subject\r\nInjected-Header: evil-payload',
        message: 'This is a legitimate message body with\r\nnewlines that should be preserved as normal line breaks.',
        formLoadedAt: Date.now() - 5000,
      },
    });

    await handler(req, res);

    assert.equal(res.statusCode, 200, 'Should sanitize and process successfully');
    assert.equal(mockFetchCalls.length, 1, 'Provider was called');

    const callBody = JSON.parse(mockFetchCalls[0].options.body);

    // Subject must not contain raw CRLF
    assert.equal(callBody.subject.includes('\r'), false, 'Subject must not contain \\r');
    assert.equal(callBody.subject.includes('\n'), false, 'Subject must not contain \\n');

    // Reply-to email must not contain raw CRLF or spaces
    assert.equal(callBody.reply_to.includes('\r'), false, 'reply_to must not contain \\r');
    assert.equal(callBody.reply_to.includes('\n'), false, 'reply_to must not contain \\n');
    assert.equal(callBody.reply_to.includes(' '), false, 'reply_to must not contain spaces');

    // Text body should have normalized newlines without control characters
    assert.equal(callBody.text.includes('\r'), false, 'Text body should normalize \\r');
  });

  // ── TEST 10: Method Not Allowed (HTTP 405) ────────────────────────────────
  await runTest('Status 405: Rejects non-POST methods with Allow header', async () => {
    const { req, res } = createMockReqRes({
      method: 'GET',
      ip: '10.0.0.10',
    });

    await handler(req, res);

    assert.equal(res.statusCode, 405, 'GET request must return HTTP 405 Method Not Allowed');
    assert.equal(res.headers['allow'], 'POST', 'Must include Allow: POST header');
    assert.equal(res.body.error, 'Method Not Allowed');
  });

  console.log('\n===============================================================');
  console.log(`   ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY! (100%)       `);
  console.log('===============================================================');
} finally {
  restoreFetch();
}
