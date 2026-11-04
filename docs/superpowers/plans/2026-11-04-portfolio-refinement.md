# Portfolio Refinement Implementation Plan (Corrected)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine Ngo Anh Tuan's portfolio into an authoritative, recruiter-friendly Full-Stack Software Engineer showcase by establishing visual restraint, semantic multi-accent coloring, flagship project depth, and verified content accuracy while strictly preserving the Dark Cyber × DEV.NETWORK × Neon Green identity.

**Architecture:** Transform the presentation through disciplined, non-overlapping phases: resolve content credibility and animation bugs with TDD; apply a 3-tier color hierarchy (70% dark neutral, 20% brand green, 10% semantic accents) with subtle neutral card borders; elevate the 2 verified flagship projects (Travel AI & Cinema) with architectural and challenge depth; polish sections for 5-second recruiter comprehension; verify motion/responsiveness across 7 viewports; and keep any structural component extraction strictly as an optional final phase after full stability.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, p5.js (ForceField binary atlas), Three.js (DigitalCore WebGL), CSS/SVG Galaxy, Node test runner (`node:test`, `node:assert/strict`), Vite prerendering.

**Spec:** `C:\Users\tuand\.gemini\antigravity\brain\d1d41f2f-8f15-4a2e-aa2b-13b1181d5f55\portfolio_refinement_plan.md`

## Global Constraints

- **Identity:** Preserve Dark Cyber / DEV.NETWORK identity with `#010503` base void; no light theme.
- **Color System Hierarchy:**
  - **Brand Primary Green (`#00FF87`):** Brand name, primary actions, active nav, and **Open-to-Work / Availability status beacon** (always positive green, never amber).
  - **Electric Cyan (`#22D3EE`):** AI / Data / Graph / Network systems (Travel AI, Neo4j, RAG).
  - **Cyber Violet (`#A78BFA`):** Frontend / UI / Developer tooling / DX (Gaming Mouse).
  - **Muted Amber (`#FBBF24`):** Certifications / Achievements / Milestones ONLY (Aptis ESOL B2).
  - **Red:** Errors and validation failures only.
  - **Neutrals:** 65%–75% dark neutrals; default card borders must be neutral zinc (`rgba(255, 255, 255, 0.08)`).
- **Positioning:** Position as **Full-Stack Software Engineer** with strong backend, full-stack, and AI-integrated systems capability. Do NOT position as "Senior".
- **Content Integrity:**
  - Never invent or rewrite institutional endorsements. If the current Van Lang testimonial quote is verified, retain exact text without 5-star rating; if unverified, REMOVE the section or replace with non-quoted factual `Engineering Focus`.
  - Never invent numerical metrics for About stats. Use verified data (`2+` Years Coding from CV, `B2` Aptis) and non-numerical capability labels (e.g. `Core` Full-Stack Stack) for unverified counts.
  - Never invent a LinkedIn URL. Mark `BLOCKED — requires verified LinkedIn URL` if not provided.
  - Never claim unverified production metrics, traffic, or latency.
- **Architecture Integrity:**
  - Preserve WebGL/p5 canvas coordinator lifecycle ($S_p \in [0.0, 0.05]$ hero, $[0.05, 0.15]$ crossfade, $\ge 0.15$ past hero).
  - Do NOT refactor or split `App.tsx` during visual implementation phases. Maintain `App.tsx` intact until all visual, responsive, motion, and regression tests are complete.
  - All existing tests in `tests/*.test.mjs` must pass with 100% assertions met.

## Review Focus

- **Input/Failure 1 (Delay Clamping):** ScrollReveal delays $> 180$ms were silently clamped to 180ms, collapsing stagger sequences into a simultaneous flash. (Pinned to Task 1)
- **Input/Failure 2 (Test Fixture Integrity):** Modifying card markup or project titles could inadvertently break regex/substring tests in `portfolioSocials.test.mjs` and `uiMotionVisual.test.mjs`. (Pinned to Task 1, 3, 4)
- **Input/Failure 3 (Reduced Motion on Cursor):** `CyberCursor` continues running lerp loop on `prefers-reduced-motion: reduce`. (Pinned to Task 7)
- **Input/Failure 4 (Monochromatic Saturation vs Rainbow):** Balancing colors so Neon Green dominates while secondary accents (Cyan, Violet, Amber) remain strictly restrained to 6-10%. (Pinned to Task 3)
- **Input/Failure 5 (Unverified Claims):** Preventing invented quotes, metrics, or supervisor endorsements. (Pinned to Task 2, 4)

---

### Task 1: Fix ScrollReveal Delay Clamping Bug via TDD & Clean CSS Duplications

**Files:**
- Modify: `src/hooks/useScrollReveal.tsx:28-35`
- Modify: `src/index.css:134-138,180-188`
- Create: `tests/scrollRevealTiming.test.mjs`

**Interfaces:**
- Consumes: `ScrollRevealProps { delay?: number; threshold?: number; direction?: 'up' | 'none' | 'left' | 'right'; children: React.ReactNode; className?: string }`
- Produces: Correct stagger delay up to 500ms without clamping at 180ms, with 0ms in `prefers-reduced-motion`.

- [ ] **Step 1: Write the failing test for ScrollReveal delay support**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Update `src/hooks/useScrollReveal.tsx` to expand clamp ceiling to 500ms**
- [ ] **Step 4: Clean CSS duplicates in `src/index.css` (remove dead `.font-manrope` and dead duplicate `.red-glow`)**
- [ ] **Step 5: Run tests to verify pass (`tests/scrollRevealTiming.test.mjs`, `tests/uiMotionVisual.test.mjs`)**
- [ ] **Step 6: Commit (`fix(motion): expand ScrollReveal stagger ceiling and clean dead CSS aliases`)**

---

### Task 2: Harmonize Career Positioning, Location & Verified Credibility Copy

**Files:**
- Modify: `src/App.tsx:380-410,480-515,860-879`
- Modify: `index.html:10-25`
- Test: `tests/portfolioSocials.test.mjs`
- Test: `tests/prerenderSeo.test.mjs`

**Interfaces:**
- Consumes: Verified CV data (`NgoAnhTuan_FullStack_Eng.pdf`): B.Sc. Software Engineering at Ton Duc Thang University 2021-2026, Software Developer Intern at Van Lang University IT Department 2025-2026, Aptis ESOL B2 (2024).
- Produces: Harmonized professional messaging without contradictory "graduate" vs "student" status, clean location "Ho Chi Minh City, Vietnam", and removal of consumer 5-star rating trope.

- [ ] **Step 1: Check baseline assertions in `tests/portfolioSocials.test.mjs` and `tests/prerenderSeo.test.mjs`**
- [ ] **Step 2: Update Hero status & tagline in `src/App.tsx`**
  - Keep status badge green: `"Open to full-time opportunities · Ho Chi Minh City"`.
  - Harmonize career phrasing: *"Software Engineering candidate building robust, scalable digital products — from .NET backends & Next.js interfaces to AI-integrated systems."*
  - About copy: *"I am a Software Engineering candidate at Ton Duc Thang University (Class of 2026) with practical experience in full-stack web development and AI-integrated systems..."*
  - Harmonize location across all sections to `"Ho Chi Minh City, Vietnam"`.
- [ ] **Step 3: Handle Testimonial / Engineering Focus Section**
  - Check verification: The quote *"Solid technical foundation, fast learner, and brings genuine enthusiasm to every project..."* is currently in code. If retained, remove the 5-star graphic entirely.
  - If unverified by user: Replace the banner with a factual, non-quoted **`Engineering Focus`** highlight card emphasizing: *.NET Core APIs, Next.js/React Interfaces, GraphRAG Knowledge Graphs, and Resilient Data Architectures*.
  - Strictly DO NOT fabricate new quotes or newly written supervisor endorsements.
- [ ] **Step 4: Update About Quick Stats to Defensible Labels**
  - Stat 1: `"2+"` Years Coding (verified from CV)
  - Stat 2: `"Core"` Full-Stack Stack (non-numerical capability label, replacing unverified `"5+ Tech Stacks"`)
  - Stat 3: `"B2"` English (Aptis) (verified from CV)
- [ ] **Step 5: Run tests and build to verify**
- [ ] **Step 6: Commit (`fix(content): harmonize career status, refine testimonial presentation, and update verified stats`)**

---

### Task 3: Implement Restrained Multi-Accent Cyber Color System

**Files:**
- Modify: `src/index.css:30-105`
- Modify: `tailwind.config.js:15-30`
- Modify: `src/App.tsx:640-680` (Skills section)
- Test: `tests/uiMotionVisual.test.mjs`

**Interfaces:**
- Consumes: Strict color hierarchy rules.
- Produces: CSS custom properties and utility classes:
  - `--accent-green: #00ff87` (Brand primary, active nav, primary CTAs, availability badge)
  - `--accent-cyan: #22d3ee` (AI & Data)
  - `--accent-violet: #a78bfa` (Frontend & DX)
  - `--accent-amber: #fbbf24` (Certifications & Milestones ONLY)
  - `--card-border: rgba(255, 255, 255, 0.08)` (Neutral default)
  - `--card-hover-border: rgba(0, 255, 135, 0.45)` (Green hover)

- [ ] **Step 1: Check `tests/uiMotionVisual.test.mjs` requirements**
- [ ] **Step 2: Update `tailwind.config.js` with semantic tokens**
- [ ] **Step 3: Update `src/index.css` tokens and card hover behaviors**
  - Neutral default card borders (`rgba(255, 255, 255, 0.08)`).
  - Keep `rgba(0, 255, 135, 0.12)` token for backward-compatible test assertions.
  - Soften text glow radius to eliminate blurry halos on headings.
- [ ] **Step 4: Apply Semantic Colors to Skills Categories in `src/App.tsx`**
  - Languages & Backend: Neon Green / Emerald (`text-[#00ff87]`, `text-emerald-400`)
  - AI & Database: Electric Cyan (`text-cyan-400`)
  - Frontend: Cyber Violet (`text-violet-400`)
  - DevOps & Tools: Lime / Emerald (`text-lime-400`)
- [ ] **Step 5: Run tests and build to verify**
- [ ] **Step 6: Commit (`style(color): implement semantic cyber palette and neutral default card borders`)**

---

### Task 4: Elevate Projects Section (Flagships & Verified Architecture Depth)

**Files:**
- Modify: `src/App.tsx:81-144,765-855`
- Test: `tests/portfolioSocials.test.mjs`

**Interfaces:**
- Consumes: ProjectItem interface with exact ordering and string assertions required by `portfolioSocials.test.mjs`.
- Produces: Flagship presentation for **Travel AI** and **Cinema** with architectural depth, while keeping **AI Coding Starter** and **Gaming Mouse** as secondary showcases.

- [ ] **Step 1: Verify exact `portfolioSocials.test.mjs` order and assertions**
  - `AI Coding Starter` -> `Travel AI` -> `Cinema` -> `Gaming Mouse`.
  - Exact descriptions and URLs preserved.
  - `delay={220 + i * 120}` preserved.
  - CTAs display `"View Source"` and conditional `"Live Demo"`.
- [ ] **Step 2: Enrich ProjectItem Interface with Verified Details in `src/App.tsx`**
  - Travel AI: Flagship (Cyan accent). Architecture: `Hybrid RAG + Neo4j Graph + FastAPI`. Technical focus: *Grounded question-answering combining vector retrieval with structured knowledge graph traversal.*
  - Cinema: Flagship (Emerald/Green accent). Architecture: `NestJS + Next.js + Redis + Socket.IO + PostgreSQL`. Technical focus: *Real-time seat reservation synchronization and order state management.*
  - AI Coding Starter: Developer tooling showcase (Cyan accent, 21+ tech stack presets).
  - Gaming Mouse: Frontend showcase (Violet accent, live demo at `gamingmouse.lovable.app`).
  - Strict constraint: NO fabricated performance numbers, user counts, or latency claims.
- [ ] **Step 3: Update `ProjectsSection` Component Layout in `src/App.tsx`**
  - Add architectural highlight tag strip to flagship cards.
  - Add distinct "Key Technical Challenge" callout.
  - Maintain exact tested CTA buttons and links.
- [ ] **Step 4: Run tests and build to verify**
- [ ] **Step 5: Commit (`feat(projects): elevate Travel AI and Cinema with verified architecture depth`)**

---

### Task 5: Polish Hero, Navigation & About Section Hierarchy

**Files:**
- Modify: `src/App.tsx:176-323,325-465,466-638`
- Test: `tests/portfolioSocials.test.mjs`
- Test: `tests/uiMotionVisual.test.mjs`

**Interfaces:**
- Consumes: Recruiter-first navigation and profile card structure.
- Produces:
  - Hero without redundant quick contact strip below CTAs.
  - Navbar with refined spacing and `#contact` smooth scroll for Hire Me CTA.
  - About profile card with prioritized professional channels.

- [ ] **Step 1: Check test assertions for Navbar and Profile Card**
- [ ] **Step 2: Streamline Hero Section in `src/App.tsx`**
  - Remove redundant 3-item quick contact strip below CTAs.
  - Optimize heading font sizing for 375px/390px mobile.
  - Keep primary CTAs ("View Projects" and "Download CV") clear and prominent.
- [ ] **Step 3: Refine Navbar Spacing & CTA**
  - Route "Hire Me" to `href="#contact"`.
  - Refine laptop padding (`px-5 sm:px-8`) to eliminate crowding.
- [ ] **Step 4: Organize Profile Card Links**
  - Maintain all 6 social/contact buttons to satisfy `portfolioSocials.test.mjs`.
  - Prioritize professional channels (GitHub, Email, Phone).
- [ ] **Step 5: Run tests and build to verify**
- [ ] **Step 6: Commit (`style(ux): clean hero quick contact strip, route nav CTA to contact, and refine profile card`)**

---

### Task 6: Refine Contact Form & Experience Timeline

**Files:**
- Modify: `src/components/ContactSection.tsx:125-146,360-385`
- Modify: `src/App.tsx:683-764` (Experience section)
- Test: `tests/contactApi.test.mjs`
- Test: `tests/challengerContactSecurity.test.mjs`

**Interfaces:**
- Consumes: Form validation, rate limiting, and honeypot infrastructure.
- Produces: Recruiter-friendly contact copy with no assumed response-time guarantees, and elevated internship engineering deliverables.

- [ ] **Step 1: Inspect Contact Section Test Assertions**
- [ ] **Step 2: Refine Contact Form Copy**
  - Use professional, neutral invitation: *"Have an engineering opportunity, project, or collaboration? Send me a message and let's discuss."*
  - Subtitle: *"Open to software engineering opportunities and collaborations."*
  - Maintain all inputs, validation, honeypot, and rate limiting intact.
- [ ] **Step 3: Polish Experience Timeline Hierarchy**
  - Keep Software Developer Intern (Van Lang University IT Department) as the prominent primary engineering anchor (.NET Core, Vue.js, SQL Server).
  - Present Rating Task as early foundational analytical experience.
  - Highlight Aptis ESOL B2 with subtle Amber milestone badge.
- [ ] **Step 4: Run tests and build to verify**
- [ ] **Step 5: Commit (`style(contact-exp): polish recruiter copy and elevate internship engineering deliverables`)**

---

### Task 7: Motion & Accessibility Polish (`CyberCursor` & Reduced Motion)

**Files:**
- Modify: `src/components/CyberCursor.tsx:40-90`
- Test: `tests/challengerPhase2Stress.test.mjs`
- Test: `tests/coordinatorLifecycle.test.mjs`

**Interfaces:**
- Consumes: `window.matchMedia('(prefers-reduced-motion: reduce)')`.
- Produces: Complete motion suspension when reduced motion is active.

- [ ] **Step 1: Add reduced-motion detection to `CyberCursor.tsx`**
  - If user prefers reduced motion, deactivate ring lerp loop.
  - Listen dynamically for changes.
  - Soften resting ring scale (32px -> 26px) and resting opacity (0.55 -> 0.35).
- [ ] **Step 2: Run stress and coordinator tests**
- [ ] **Step 3: Commit (`fix(a11y): add prefers-reduced-motion listener to CyberCursor and soften resting ring scale`)**

---

### Task 8: Full 7-Viewport Responsive & Cross-Browser Verification

**Files:**
- Test: `tests/challengerViewportOverflow.test.mjs`
- Test: All 10 test suites in `tests/*.test.mjs`

- [ ] **Step 1: Run viewport overflow tests across 5 viewports**
- [ ] **Step 2: Inspect compact mobile (375px and 390px) layouts**
- [ ] **Step 3: Run full 10-suite regression test suite**
- [ ] **Step 4: Run production build and verify bundle sizes**
- [ ] **Step 5: Commit verification checkpoint (`chore(qa): verify all 10 test suites pass across 7 viewports`)**

---

### Task 9: Final Independent Review & Verification (Codebase Maintainability)

**Files:**
- Verify: Full branch diff against `main`
- Skill: `superpowers:verification-before-completion`
- Skill: `superpowers:requesting-code-review`

- [ ] **Step 1: Generate full branch diff summary (`git diff main...HEAD --stat`)**
- [ ] **Step 2: Verify compliance with Strict Content Integrity Rules**
- [ ] **Step 3: Optional final phase: evaluate splitting `App.tsx` only if tests and visual behavior are 100% stable**
- [ ] **Step 4: Produce final implementation report**
