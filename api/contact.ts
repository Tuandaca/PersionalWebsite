/**
 * Vercel Serverless Function: /api/contact
 * Handles contact form submissions with server-side validation, anti-spam protections,
 * IP sliding-window rate limiting, CRLF injection sanitization, and verified email delivery via Resend API.
 */

// In-memory IP sliding-window rate limiter
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 60-second window
const RATE_LIMIT_MAX_REQUESTS = 5; // Maximum 5 submissions per window per IP
const MAX_PAYLOAD_BYTES = 10 * 1024; // 10KB payload limit

/**
 * Resets the in-memory rate limit store (used in test suites).
 */
export function _resetRateLimits(): void {
  rateLimitMap.clear();
}

/**
 * Extracts client IP address from standard request headers.
 */
function getClientIp(req: any): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.headers?.['x-real-ip'] || req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Checks sliding-window rate limit for a client IP.
 */
function checkRateLimit(ip: string): { limited: boolean; retryAfter: number } {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const existing = rateLimitMap.get(ip) || [];
  const activeTimestamps = existing.filter(t => t > windowStart);

  if (activeTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldestInWindow = activeTimestamps[0];
    const retryAfter = Math.max(1, Math.ceil((oldestInWindow + RATE_LIMIT_WINDOW_MS - now) / 1000));
    rateLimitMap.set(ip, activeTimestamps);
    return { limited: true, retryAfter };
  }

  activeTimestamps.push(now);
  rateLimitMap.set(ip, activeTimestamps);
  return { limited: false, retryAfter: 0 };
}

/**
 * Sanitizes single-line inputs to prevent CRLF injection in email headers/subject.
 */
function sanitizeSingleLine(input: string): string {
  return input
    .replace(/[\r\n\x00-\x1F\x7F]/g, ' ')
    .replace(/[<>]/g, '')
    .trim();
}

/**
 * Sanitizes email address to prevent CRLF injection and remove invalid whitespace.
 */
function sanitizeEmail(email: string): string {
  return email
    .replace(/[\r\n\x00-\x1F\x7F\s]/g, '')
    .toLowerCase();
}

/**
 * Sanitizes multi-line plain text message safely, stripping control characters.
 */
function sanitizeMessage(message: string): string {
  return message
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[<>]/g, '')
    .trim();
}

export default async function handler(req: any, res: any) {
  // 1. Enforce POST HTTP method (405)
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 2. IP sliding-window rate limiter (429)
    const clientIp = getClientIp(req);
    const { limited, retryAfter } = checkRateLimit(clientIp);
    if (limited) {
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter,
      });
    }

    // 3. Payload size check <= 10KB (400)
    let payloadSize = 0;
    if (req.headers && req.headers['content-length']) {
      payloadSize = parseInt(String(req.headers['content-length']), 10) || 0;
    }

    let parsedBody: any;
    if (typeof req.body === 'string') {
      const byteLen = Buffer.byteLength(req.body, 'utf8');
      payloadSize = Math.max(payloadSize, byteLen);
      if (payloadSize > MAX_PAYLOAD_BYTES) {
        return res.status(400).json({ error: 'Payload exceeds maximum limit of 10KB.' });
      }
      try {
        parsedBody = JSON.parse(req.body);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON payload.' });
      }
    } else if (req.body && typeof req.body === 'object') {
      const serialized = JSON.stringify(req.body);
      payloadSize = Math.max(payloadSize, Buffer.byteLength(serialized, 'utf8'));
      if (payloadSize > MAX_PAYLOAD_BYTES) {
        return res.status(400).json({ error: 'Payload exceeds maximum limit of 10KB.' });
      }
      parsedBody = req.body;
    } else {
      parsedBody = {};
    }

    if (payloadSize > MAX_PAYLOAD_BYTES) {
      return res.status(400).json({ error: 'Payload exceeds maximum limit of 10KB.' });
    }

    const { name, email, subject, message, company, website, formLoadedAt } = parsedBody;

    // 4. Honeypot check: website field populated by spam bots (silent 200, 0 emails dispatched)
    if (website && typeof website === 'string' && website.trim().length > 0) {
      return res.status(200).json({ success: true, message: 'Message received.' });
    }

    // Anti-bot completion timing check: form completed in less than 1.5s
    if (typeof formLoadedAt === 'number' && formLoadedAt > 0) {
      const elapsed = Date.now() - formLoadedAt;
      if (elapsed > 0 && elapsed < 1500) {
        return res.status(200).json({ success: true, message: 'Message received.' });
      }
    }

    // 5. Server-side validation (400)
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
      return res.status(400).json({ error: 'Name must be between 2 and 80 characters.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim()) || email.trim().length > 120) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (!subject || typeof subject !== 'string' || subject.trim().length < 3 || subject.trim().length > 120) {
      return res.status(400).json({ error: 'Subject must be between 3 and 120 characters.' });
    }

    if (!message || typeof message !== 'string' || message.trim().length < 10 || message.trim().length > 2000) {
      return res.status(400).json({ error: 'Message must be between 10 and 2000 characters.' });
    }

    // 6. Service configuration verification: RESEND_API_KEY check (503)
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'Contact service is unconfigured. RESEND_API_KEY is missing.',
      });
    }

    // 7. Input sanitization (CRLF header injection prevention)
    const cleanName = sanitizeSingleLine(name);
    const cleanEmail = sanitizeEmail(email);
    const cleanSubject = sanitizeSingleLine(subject);
    const cleanCompany = company ? sanitizeSingleLine(String(company)) : 'N/A';
    const cleanMessage = sanitizeMessage(message);

    // 8. Configure delivery headers and recipients
    const fromEmail = process.env.CONTACT_FROM_EMAIL || 'Portfolio Contact <onboarding@resend.dev>';
    const toEmail = process.env.CONTACT_TO_EMAIL || 'ngoanhtuan23.it@gmail.com';

    const textContent = [
      `Name: ${cleanName}`,
      `Email: ${cleanEmail}`,
      `Company: ${cleanCompany}`,
      `Subject: ${cleanSubject}`,
      '',
      'Message:',
      cleanMessage,
    ].join('\n');

    // 9. Dispatch email via Resend API
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: cleanEmail,
        subject: `[Portfolio Contact] ${cleanSubject} — ${cleanName}`,
        text: textContent,
      }),
    });

    if (!resendRes.ok) {
      const errDetails = await resendRes.text().catch(() => '');
      console.error('Resend delivery failure:', resendRes.status, errDetails);
      return res.status(502).json({
        error: 'Failed to deliver email through provider.',
        providerStatus: resendRes.status,
      });
    }

    const resendData = await resendRes.json().catch(() => ({}));
    return res.status(200).json({
      success: true,
      id: resendData.id || 'delivered',
    });
  } catch (err: any) {
    console.error('Contact API unexpected error:', err);
    return res.status(500).json({
      error: 'Internal server error processing contact message.',
    });
  }
}
