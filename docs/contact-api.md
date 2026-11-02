# Contact API Specification & Production Delivery Guide

This document specifies the architecture, security mechanisms, environment variables, DNS verification procedures, and automated testing for the `POST /api/contact` serverless endpoint on DEV.NETWORK (`d:\Projects\tuandacadev`).

---

## 1. Overview & Architecture

The contact system uses a Vercel Serverless Function (`api/contact.ts`) backed by the **Resend API** to deliver messages directly to the portfolio owner without running external server daemons or exposing private credentials.

```
[Browser / Client]
       │
       ▼ (HTTPS POST /api/contact)
[Vercel Serverless Function: api/contact.ts]
   ├── 1. Method Check (POST only -> 405)
   ├── 2. Sliding-Window IP Rate Limiter (Max 5/min -> 429 + Retry-After)
   ├── 3. Payload Size Ceiling (<= 10KB -> 400)
   ├── 4. Anti-Bot Honeypot (`website` populated -> silent 200, 0 emails)
   ├── 5. Input Validation (name, email, subject, message -> 400)
   ├── 6. Service Configuration Check (`RESEND_API_KEY` -> 503)
   ├── 7. Header & CRLF Sanitization (strip \r, \n, control chars, < >)
   └── 8. Upstream Delivery via Resend (200 on success, 502 on provider failure)
       │
       ▼ (HTTPS POST api.resend.com/emails)
[Resend Email Provider] ──> [Inbox: CONTACT_TO_EMAIL]
```

---

## 2. API Endpoint Specification

### `POST /api/contact`

- **Content-Type:** `application/json`
- **Max Payload Size:** `10 KB` (10,240 bytes)

#### Request Body Schema

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `name` | `string` | **Yes** | 2 – 80 chars | Submitter's full name |
| `email` | `string` | **Yes** | Standard email regex, max 120 chars | Submitter's email address (set as `reply_to`) |
| `subject` | `string` | **Yes** | 3 – 120 chars | Message subject or purpose |
| `message` | `string` | **Yes** | 10 – 2000 chars | Main inquiry message |
| `company` | `string` | No | Max 100 chars | Optional organization or company name |
| `website` | `string` | No (Trap) | Must be empty | **Honeypot trap.** If filled by a bot, silently returns 200 with zero emails dispatched. |
| `formLoadedAt` | `number` | No (Trap) | Epoch ms | Mount timestamp. If submitted in < 1.5 seconds, treated as automated bot script. |

#### Example Request Payload

```json
{
  "name": "Alex Mercer",
  "email": "alex@example.com",
  "company": "Acme Technologies",
  "subject": "Full-Stack Engineering Role",
  "message": "Hi Tuan, I reviewed your DEV.NETWORK portfolio and would love to discuss a senior engineering opportunity on our team.",
  "website": "",
  "formLoadedAt": 1730544800000
}
```

---

## 3. HTTP Status Codes & Responses

The endpoint produces distinct, standard-compliant HTTP status codes:

| HTTP Status | Meaning | Condition | Example Response Body |
|---|---|---|---|
| **200 OK** | Accepted / Delivered | Valid submission successfully dispatched through Resend, or silently absorbed by honeypot | `{"success": true, "id": "msg_01J..."}` |
| **400 Bad Request** | Invalid Input | Missing required field, invalid email format, or payload > 10KB | `{"error": "Please enter a valid email address."}` |
| **405 Method Not Allowed** | Unsupported Method | Request is not `POST` | `{"error": "Method Not Allowed"}` *(sets `Allow: POST`)* |
| **429 Too Many Requests** | Rate Limit Exceeded | Client IP exceeded 5 requests within the 60-second sliding window | `{"error": "Too many requests. Please try again later.", "retryAfter": 42}` *(sets `Retry-After: 42`)* |
| **500 Internal Error** | Server Exception | Unexpected server-side runtime failure | `{"error": "Internal server error processing contact message."}` |
| **502 Bad Gateway** | Upstream Provider Failure | Resend API returned an error (e.g. 500 outage, invalid payload rejected by provider) | `{"error": "Failed to deliver email through provider.", "providerStatus": 500}` |
| **503 Service Unavailable** | Service Unconfigured | `RESEND_API_KEY` is not configured in environment (never returns fake demo 200) | `{"error": "Contact service is unconfigured. RESEND_API_KEY is missing."}` |

---

## 4. Security & Anti-Abuse Defenses

1. **In-Memory Sliding-Window Rate Limiting:**
   Tracks client requests by IP (`x-forwarded-for` / `x-real-ip`). Limits clients to **5 requests per 60 seconds**. Rejections include the standard `Retry-After: <seconds>` HTTP header.
2. **Invisible Honeypot (`website` field):**
   Rendered in DOM with `aria-hidden="true"`, hidden via CSS (`display: none` / `hidden`), and tabIndex `-1`. Legitimate humans never fill it; automated scrapers and bots auto-populate it. When populated, the endpoint returns HTTP 200 immediately and halts execution—**0 emails are dispatched to Resend**.
3. **Form Completion Timing:**
   Monitors submission duration against `formLoadedAt`. Human interaction takes several seconds; submissions occurring under 1.5 seconds are silently absorbed.
4. **CRLF Header Injection Prevention:**
   All single-line fields (`name`, `email`, `company`, `subject`) are strictly sanitized using regex to strip Carriage Return (`\r`), Line Feed (`\n`), and ASCII control characters (`\x00-\x1F\x7F`). This prevents attackers from injecting additional headers (`Bcc:`, `Cc:`, `To:`) or hijacking the SMTP envelope.
5. **Payload Length & Memory Protection:**
   The function inspects `content-length` and body byte sizes, rejecting payloads larger than **10 KB** with HTTP 400 before parsing deep structures.
6. **Secret Isolation:**
   Zero private keys are committed to Git or exposed with `VITE_` prefixes. Secrets are read exclusively within the secure Vercel Node.js runtime.

---

## 5. Environment Variables Configuration

The following variables must be configured in Vercel Project Settings (`Settings -> Environment Variables`) or in your local `.env.local` file:

| Variable Name | Environment | Required | Default / Example Value | Description |
|---|---|---|---|---|
| `RESEND_API_KEY` | Production, Preview | **Yes** | `re_123456789abcdef...` | Secret API key generated from your Resend Dashboard. **NEVER prefix with `VITE_`**. |
| `CONTACT_FROM_EMAIL` | Production, Preview | Recommended | `Portfolio Contact <contact@dev.network>` | Verified sender email address. For sandbox testing, use `Portfolio Contact <onboarding@resend.dev>`. |
| `CONTACT_TO_EMAIL` | Production, Preview | Recommended | `ngoanhtuan23.it@gmail.com` | Destination inbox where portfolio inquiries should be delivered. |

### Adding Variables via Vercel CLI

```bash
# Add Resend API key to production environment
vercel env add RESEND_API_KEY production

# Add custom sender address
vercel env add CONTACT_FROM_EMAIL production

# Add recipient address
vercel env add CONTACT_TO_EMAIL production
```

---

## 6. DNS Verification for Custom Domains (SPF, DKIM, DMARC, MX)

When sending email through Resend using a custom domain (e.g., `@dev.network`), you must verify ownership and configure DNS records to ensure 100% inbox deliverability and prevent emails from landing in Spam.

### Step 1: Add Domain in Resend Dashboard
1. Log in to [Resend Dashboard](https://resend.com/domains).
2. Click **Add Domain** and enter your root domain (e.g. `dev.network` or subdomain `mail.dev.network`).
3. Resend will display the DNS records required for your specific domain.

### Step 2: Configure DNS Records in Domain Registrar / Cloudflare

Add the following records at your DNS host (Cloudflare, Namecheap, GoDaddy, Vercel DNS):

#### 1. SPF (Sender Policy Framework)
Authorizes Resend's mail servers to send email on behalf of your domain.
- **Type:** `TXT`
- **Name / Host:** `@` (or subdomain e.g. `mail`)
- **TTL:** `Auto` or `3600`
- **Value:**
  ```text
  v=spf1 include:resend.com ~all
  ```
  *(Note: If you already have an existing SPF record for Google Workspace or Microsoft 365, merge it: `v=spf1 include:_spf.google.com include:resend.com ~all`)*

#### 2. DKIM (DomainKeys Identified Mail)
Provides cryptographic proof that the email was not forged or altered in transit.
Resend provides unique DKIM keys per domain:
- **Type:** `TXT` (or `CNAME` depending on Resend setup)
- **Name / Host:** `resend._domainkey` (or provided slug)
- **TTL:** `Auto` or `3600`
- **Value:** *(Exact public key provided in Resend dashboard, e.g., `p=MIGfMA0GCSqGSIb3...`)*

#### 3. DMARC (Domain-based Message Authentication, Reporting, and Conformance)
Specifies policy enforcement for messages that fail SPF or DKIM checks.
- **Type:** `TXT`
- **Name / Host:** `_dmarc`
- **TTL:** `Auto` or `3600`
- **Value:**
  ```text
  v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@dev.network; pct=100; adkim=r; aspf=r
  ```
  - `p=quarantine`: Delivers failing messages to the spam folder rather than immediate rejection.
  - `rua`: Aggregate report destination.
  - `pct=100`: Applies policy to 100% of emails.

#### 4. MX Record (Optional - For Inbound Routing / Bounces)
If using Resend to handle return paths or inbound routing:
- **Type:** `MX`
- **Name / Host:** `bounces` (or subdomain designated by Resend)
- **Priority:** `10`
- **Value:** `feedback-smtp.resend.com`

### Step 3: Verify DNS Propagation
Verify that records have propagated globally:

```bash
# Check SPF
dig TXT dev.network +short

# Check DKIM
dig TXT resend._domainkey.dev.network +short

# Check DMARC
dig TXT _dmarc.dev.network +short
```

Once propagated, click **Verify Records** in Resend. The status will transition from `Pending` to `Verified`.

---

## 7. Automated Testing & Verification

The contact system includes automated test suites that verify the entire state machine without sending billable emails or requiring live API credentials.

### Running Unit & Status Code Tests

The automated test suite in `tests/contactApi.test.mjs` verifies all 8 HTTP status codes, sliding-window rate limiting, CRLF injection sanitization, and honeypot defenses against mocked Resend provider responses:

```bash
node tests/contactApi.test.mjs
```

Or with explicit type stripping:

```bash
node --experimental-strip-types tests/contactApi.test.mjs
```

#### Test Suite Coverage:
- ✔ **Test 1:** HTTP 200/202: Valid submission accepted by Resend provider
- ✔ **Test 2:** HTTP 400: Rejection of missing required fields (name, email, subject, message)
- ✔ **Test 3:** HTTP 400: Rejection of invalid email formats
- ✔ **Test 4:** HTTP 400: Rejection of oversized payloads (> 10KB)
- ✔ **Test 5:** HTTP 200: Honeypot silent drop (0 provider requests dispatched)
- ✔ **Test 6:** HTTP 429: Rate limit exceeded (sliding window per-IP with `Retry-After`)
- ✔ **Test 7:** HTTP 503: Service unconfigured when `RESEND_API_KEY` missing (no fake demo 200)
- ✔ **Test 8:** HTTP 502: Provider failure (handling upstream 500 error cleanly)
- ✔ **Test 9:** Security: CRLF injection sanitization for header and subject lines
- ✔ **Test 10:** HTTP 405: Rejection of non-POST methods with `Allow: POST` header

### Running End-to-End Browser Audit

To test form interactions in headless Chrome with DOM assertions:

```bash
node scripts/testContactForm.mjs
```
