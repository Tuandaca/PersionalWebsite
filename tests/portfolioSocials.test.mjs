import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- Running Milestone M3: Social Contact Links & Portfolio Projects Tests ---');

const rootDir = process.cwd();
const contactSectionPath = path.join(rootDir, 'src', 'components', 'ContactSection.tsx');
const appTsxPath = path.join(rootDir, 'src', 'App.tsx');

const contactSection = fs.readFileSync(contactSectionPath, 'utf-8');
const appTsx = fs.readFileSync(appTsxPath, 'utf-8');

// ── TEST 1: Contact Section "CONNECT WITH ME" Header & Exact Social Links ──────
console.log('Testing Test 1: Contact Section Social Connect Links (R3)...');
assert(contactSection.includes('CONNECT WITH ME'), 'ContactSection must render "CONNECT WITH ME" header');

// Exact 4 verified URLs
assert(contactSection.includes('https://github.com/Tuandaca'), 'ContactSection must include GitHub URL');
assert(contactSection.includes('https://web.facebook.com/ngobongsu'), 'ContactSection must include Facebook URL');
assert(contactSection.includes('https://www.instagram.com/tuandaca23'), 'ContactSection must include Instagram URL');
assert(contactSection.includes('https://discord.com/users/903269942005235814'), 'ContactSection must include Discord URL');

// Preserved Element IDs
assert(contactSection.includes('id="contact-github-link"'), 'GitHub link must preserve id="contact-github-link"');
assert(contactSection.includes('id="contact-facebook-link"'), 'Facebook link must define id="contact-facebook-link"');
assert(contactSection.includes('id="contact-instagram-link"'), 'Instagram link must define id="contact-instagram-link"');
assert(contactSection.includes('id="contact-discord-link"'), 'Discord link must define id="contact-discord-link"');
assert(contactSection.includes('id="contact-email-link"'), 'Email link must preserve id="contact-email-link"');

// Security & Semantics
assert(contactSection.includes('target="_blank"'), 'Social links must open in new tab (target="_blank")');
assert(contactSection.includes('rel="noopener noreferrer"'), 'Social links must include rel="noopener noreferrer"');
assert(contactSection.includes('aria-label="GitHub Profile (Tuandaca)"'), 'GitHub link must have descriptive aria-label');
assert(contactSection.includes('aria-label="Facebook Profile (ngobongsu)"'), 'Facebook link must have descriptive aria-label');
assert(contactSection.includes('aria-label="Instagram Profile (tuandaca23)"'), 'Instagram link must have descriptive aria-label');
assert(contactSection.includes('aria-label="Discord Profile (903269942005235814)"'), 'Discord link must have descriptive aria-label');

// Circular Translucent Glass Button Styling & Micro-interactions
assert(contactSection.includes('w-12 h-12 sm:w-14 sm:h-14 rounded-full'), 'Buttons must be circular translucent buttons');
assert(contactSection.includes('hover:scale-110'), 'Buttons must have hover:scale-110');
assert(contactSection.includes('hover:-rotate-6') && contactSection.includes('hover:rotate-6'), 'Buttons must have subtle hover rotation');
assert(contactSection.includes('group-hover:translate-x-full'), 'Buttons must feature horizontal light sweep sheen');
assert(contactSection.includes('overflow-hidden'), 'Buttons must have overflow-hidden for sheen clip');

console.log('✓ Test 1 Passed: Contact section social connect links, security, and glass styling verified.');

// ── TEST 2: Project Data Architecture & Recruiter-Value Ordering ───────────────
console.log('Testing Test 2: Project Data Architecture & Recruiter Ordering (R4)...');

// ProjectItem interface with optional liveUrl
assert(appTsx.includes('interface ProjectItem'), 'App.tsx must define ProjectItem interface');
assert(appTsx.includes('liveUrl?: string'), 'ProjectItem interface must include optional liveUrl?: string');

// 4 Verified Projects in Order
const p1Index = appTsx.indexOf("title: 'AI Coding Starter'");
const p2Index = appTsx.indexOf("title: 'Travel AI — GraphRAG & Knowledge Graph Q&A'");
const p3Index = appTsx.indexOf("title: 'Cinema — Movie Booking & AI Recommendation'");
const p4Index = appTsx.indexOf("title: 'Gaming Mouse — Premium Product Landing Page'");

assert(p1Index !== -1, 'Project 1 (AI Coding Starter) must be defined');
assert(p2Index !== -1, 'Project 2 (Travel AI) must be defined');
assert(p3Index !== -1, 'Project 3 (Cinema) must be defined');
assert(p4Index !== -1, 'Project 4 (Gaming Mouse) must be defined');

assert(p1Index < p2Index, 'AI Coding Starter must precede Travel AI (recruiter-value order)');
assert(p2Index < p3Index, 'Travel AI must precede Cinema (recruiter-value order)');
assert(p3Index < p4Index, 'Cinema must precede Gaming Mouse (recruiter-value order)');

// Accurate Descriptions (No Fabricated Metrics)
assert(appTsx.includes('https://github.com/Tuandaca/AI-Coding-starter'), 'AI Coding Starter repo URL must be correct');
assert(appTsx.includes('21+ tech stack presets'), 'AI Coding Starter description must detail verified features');
assert(appTsx.includes('https://github.com/Tuandaca/DACNTT'), 'Travel AI repo URL must be preserved');
assert(appTsx.includes('https://github.com/Tuandaca/cinema'), 'Cinema repo URL must be preserved');
assert(appTsx.includes('https://github.com/Tuandaca/gamingmouse'), 'Gaming Mouse repo URL must be correct');
assert(appTsx.includes('https://gamingmouse.lovable.app/'), 'Gaming Mouse live demo URL must be correct');
assert(appTsx.includes('landing showcase'), 'Gaming Mouse must be described as a landing page showcase');

console.log('✓ Test 2 Passed: 4 projects verified in recruiter-value order with accurate descriptions.');

// ── TEST 3: ProjectsSection Actions (View Source & Conditional Live Demo) ───────
console.log('Testing Test 3: ProjectsSection Card CTAs & Conditional Live Demo...');

assert(appTsx.includes('View Source'), 'Card CTA must display "View Source"');
assert(appTsx.includes('Live Demo'), 'Card CTA must support "Live Demo"');
assert(appTsx.includes('proj.liveUrl ?'), 'Live Demo CTA must be conditionally rendered based on proj.liveUrl');
assert(appTsx.includes('delay={220 + i * 120}'), 'Card reveal delay={220 + i * 120} must be preserved');

console.log('✓ Test 3 Passed: View Source and conditional Live Demo CTAs verified.');

// ── TEST 4: Profile Card Real Portrait & 6 Glass Social Buttons ────────────────
console.log('Testing Test 4: Profile Card Real Portrait & 6 Social Glass Buttons...');

// Verify public/avatar.jpg asset
const avatarPath = path.join(rootDir, 'public', 'avatar.jpg');
assert(fs.existsSync(avatarPath), 'public/avatar.jpg must exist on disk');
const avatarStats = fs.statSync(avatarPath);
assert(avatarStats.size > 10000, 'avatar.jpg must be non-empty valid image asset (>10KB)');

// Verify Portrait rendering in App.tsx
assert(appTsx.includes('src="/avatar.jpg"'), 'App.tsx must reference /avatar.jpg portrait');
assert(appTsx.includes('alt="Ngo Anh Tuan — Portrait"'), 'Portrait image must have descriptive alt text');
assert(appTsx.includes('object-[center_20%]'), 'Portrait must center face vertically at 20%');

// Verify all 6 Profile Card Social/Contact Buttons
assert(appTsx.includes('id="about-github-link"'), 'Profile card must include id="about-github-link"');
assert(appTsx.includes('id="about-facebook-link"'), 'Profile card must include id="about-facebook-link"');
assert(appTsx.includes('id="about-instagram-link"'), 'Profile card must include id="about-instagram-link"');
assert(appTsx.includes('id="about-discord-link"'), 'Profile card must include id="about-discord-link"');
assert(appTsx.includes('id="about-email-link"'), 'Profile card must include id="about-email-link"');
assert(appTsx.includes('id="about-phone-link"'), 'Profile card must include id="about-phone-link"');

// Exact URLs
assert(appTsx.includes('https://web.facebook.com/ngobongsu'), 'Profile card must link to Facebook');
assert(appTsx.includes('https://www.instagram.com/tuandaca23'), 'Profile card must link to Instagram');
assert(appTsx.includes('https://discord.com/users/903269942005235814'), 'Profile card must link to Discord');
assert(appTsx.includes('mailto:ngoanhtuan23.it@gmail.com'), 'Profile card must link to Email');
assert(appTsx.includes('tel:+84917940833'), 'Profile card must link to Phone');

// Security & Accessibility
assert(appTsx.includes('aria-label="Facebook Profile (ngobongsu)"'), 'Facebook button must have aria-label');
assert(appTsx.includes('aria-label="Instagram Profile (tuandaca23)"'), 'Instagram button must have aria-label');
assert(appTsx.includes('aria-label="Discord Profile (903269942005235814)"'), 'Discord button must have aria-label');

console.log('✓ Test 4 Passed: Profile Card Real Portrait & 6 Glass Buttons verified.');

console.log('\nALL MILESTONE M3 PORTFOLIO & SOCIALS TESTS PASSED WITH 100% SUCCESS!');
