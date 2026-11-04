import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { FallbackBackground } from './components/DevNetwork/FallbackBackground';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ContactSection } from './components/ContactSection';
import { useScrollStoryteller } from './hooks/useScrollStoryteller';
import { useCanvasCoordinator } from './hooks/useCanvasCoordinator';
import { useAdaptiveQuality } from './hooks/useAdaptiveQuality';
import { ScrollReveal } from './hooks/useScrollReveal';
import { CyberCursor } from './components/CyberCursor';
import { GalaxyBackground } from './components/GalaxyBackground';
import {
  Github, Mail, Phone, MapPin, ExternalLink, ArrowRight,
  Code2, Database, Cpu, Layers, Star, Terminal,
  Briefcase, GraduationCap, Menu, X, Download,
  Globe, Server, Brain, ChevronRight, Award
} from 'lucide-react';

// Safe code-splitting: Lazy load heavy 3D (Three.js ~535 kB) and physics canvas (p5.js ~1065 kB)
const DevNetworkCanvas = lazy(() =>
  import('./components/DevNetwork/DevNetworkCanvas').then(m => ({ default: m.DevNetworkCanvas }))
);

const ForceFieldBackground = lazy(() =>
  import('./Component').then(m => ({ default: m.ForceFieldBackground }))
);

// Preload DevNetworkCanvas during idle time before section transitions occur
const preloadDevNetwork = () => {
  import('./components/DevNetwork/DevNetworkCanvas');
};

// ── DATA ──────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'About',      href: '#about'      },
  { label: 'Skills',     href: '#skills'      },
  { label: 'Experience', href: '#experience'  },
  { label: 'Projects',   href: '#projects'    },
  { label: 'Contact',    href: '#contact'     },
];

const SKILLS: { category: string; icon: React.ReactNode; color: string; items: string[] }[] = [
  {
    category: 'Languages',
    icon: <Code2 className="w-5 h-5" />,
    color: 'text-[#00ff87]',
    items: ['C#', 'Python', 'JavaScript', 'TypeScript'],
  },
  {
    category: 'Backend',
    icon: <Server className="w-5 h-5" />,
    color: 'text-cyan-400',
    items: ['.NET / ASP.NET Core', 'Node.js', 'NestJS', 'FastAPI', 'RESTful API'],
  },
  {
    category: 'Frontend',
    icon: <Globe className="w-5 h-5" />,
    color: 'text-emerald-400',
    items: ['Next.js', 'React', 'Vue.js', 'Tailwind CSS'],
  },
  {
    category: 'Database',
    icon: <Database className="w-5 h-5" />,
    color: 'text-teal-300',
    items: ['SQL Server', 'PostgreSQL', 'Prisma', 'Neo4j'],
  },
  {
    category: 'AI & ML',
    icon: <Brain className="w-5 h-5" />,
    color: 'text-[#00ff87]',
    items: ['RAG', 'LLM Integration', 'Knowledge Graphs', 'Vector Search'],
  },
  {
    category: 'DevOps & Tools',
    icon: <Cpu className="w-5 h-5" />,
    color: 'text-lime-400',
    items: ['Git', 'Docker', 'Redis', 'Socket.IO'],
  },
];

interface ProjectItem {
  title: string;
  badge: string;
  description: string;
  tech: string[];
  github: string;
  liveUrl?: string;
  featured: boolean;
  icon: React.ReactNode;
  accent: string;
  border: string;
}

const PROJECTS: ProjectItem[] = [
  {
    title: 'AI Coding Starter',
    badge: 'AI Developer Tooling',
    description:
      'Interactive Project Creator & CLI automation suite with 21+ tech stack presets, contextual prompt systems, and cross-platform setup workflows.',
    tech: ['Node.js', 'TypeScript', 'CLI', 'AI Tooling', 'Automation'],
    github: 'https://github.com/Tuandaca/AI-Coding-starter',
    featured: true,
    icon: <Terminal className="w-6 h-6" />,
    accent: 'text-cyan-400',
    border: 'rgba(6,182,212,0.4)',
  },
  {
    title: 'Travel AI — GraphRAG & Knowledge Graph Q&A',
    badge: 'Academic Capstone',
    description:
      'Intelligent Q&A system for Ho Chi Minh City tourism leveraging Retrieval-Augmented Generation with Knowledge Graphs for context-rich, grounded query resolution.',
    tech: ['Python', 'FastAPI', 'RAG', 'Neo4j', 'LLM'],
    github: 'https://github.com/Tuandaca/DACNTT',
    featured: true,
    icon: <Brain className="w-6 h-6" />,
    accent: 'text-[#00ff87]',
    border: 'rgba(0,255,135,0.4)',
  },
  {
    title: 'Cinema — Movie Booking & AI Recommendation',
    badge: 'Full-Stack Platform',
    description:
      'End-to-end cinema management platform with real-time seat reservation, order tracking, and online checkout — powered by AI/LLM recommendations.',
    tech: ['Next.js', 'TypeScript', 'NestJS', 'PostgreSQL', 'Prisma', 'Redis', 'Socket.IO'],
    github: 'https://github.com/Tuandaca/cinema',
    featured: true,
    icon: <Layers className="w-6 h-6" />,
    accent: 'text-emerald-400',
    border: 'rgba(52,211,153,0.35)',
  },
  {
    title: 'Gaming Mouse — Premium Product Landing Page',
    badge: 'Frontend / Product Experience',
    description:
      'High-performance gaming mouse product landing showcase with interactive specs, responsive 3D-inspired visuals, and ergonomic feature breakdown.',
    tech: ['React 18', 'TypeScript', 'Vite', 'Tailwind CSS', 'shadcn/ui', 'Radix UI', 'React Router'],
    github: 'https://github.com/Tuandaca/gamingmouse',
    liveUrl: 'https://gamingmouse.lovable.app/',
    featured: true,
    icon: <Globe className="w-6 h-6" />,
    accent: 'text-violet-400',
    border: 'rgba(168,85,247,0.35)',
  },
];

const EXPERIENCES = [
  {
    role: 'Software Developer Intern',
    company: 'Van Lang University — IT Department',
    location: 'Ho Chi Minh City',
    period: '2025 – 2026',
    bullets: [
      'Developed an internal web portal enabling students to look up academic information and resolve academic affairs.',
      'Analyzed business requirements and designed system artifacts: Use Case, Class, and Sequence Diagrams.',
      'Built backend RESTful APIs with ASP.NET Core, responsive UI with Vue.js, and managed SQL Server schemas.',
    ],
    tech: ['ASP.NET Core', 'Vue.js', 'SQL Server'],
    icon: <Briefcase className="w-4 h-4" />,
  },
  {
    role: 'Web Data Evaluator (Freelance)',
    company: 'Rating Task',
    location: 'Remote',
    period: '2021 – 2022',
    bullets: [
      'Evaluated web page quality, relevance, and search intent alignment per detailed standardized guidelines.',
      'Analyzed digital content for accuracy, authority, and trustworthiness.',
    ],
    tech: ['Data Analysis', 'SEO Quality'],
    icon: <Star className="w-4 h-4" />,
  },
];

// ── COMPONENTS ────────────────────────────────────────────────────────────────

const Navbar = React.memo(function Navbar({ menuOpen, setMenuOpen }: { menuOpen: boolean; setMenuOpen: (v: boolean) => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');

  useEffect(() => {
    const sectionIds = ['about', 'skills', 'experience', 'projects', 'contact'];
    let sections: { id: string; top: number; bottom: number }[] = [];
    const measureSections = () => {
      sections = sectionIds.flatMap((id) => {
        const el = document.getElementById(id);
        return el ? [{ id, top: el.offsetTop, bottom: el.offsetTop + el.offsetHeight }] : [];
      });
      handler();
    };
    const handler = () => {
      setScrolled(window.scrollY > 20);

      // Section tracking for liquid glow capsule
      const scrollPos = window.scrollY + 220;
      let current = '';
      for (const section of sections) {
        if (scrollPos >= section.top && scrollPos < section.bottom) {
          current = `#${section.id}`;
          break;
        }
      }
      setActiveSection(current);
    };

    window.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', measureSections, { passive: true });
    const layoutObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(measureSections)
      : null;
    layoutObserver?.observe(document.body);
    measureSections();
    return () => {
      window.removeEventListener('scroll', handler);
      window.removeEventListener('resize', measureSections);
      layoutObserver?.disconnect();
    };
  }, []);

  return (
    <header className="fixed top-0 left-0 w-full z-50 pt-5 px-4 sm:px-6">
      <nav
        className={`max-w-6xl mx-auto flex items-center justify-between px-6 sm:px-8 py-3.5 sm:py-4 rounded-full relative overflow-hidden liquid-glass-nav ${scrolled ? 'is-scrolled' : ''}`}
      >
        {/* Specular sheen highlight along top rim */}
        <div className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#00ff87]/50 to-transparent pointer-events-none" />

        {/* Developer Logo */}
        <a href="#" className="flex items-center gap-3.5 group" id="nav-logo">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-[#022a14] via-zinc-950 to-black border border-[#00ff87]/50 shadow-[0_0_20px_rgba(0,255,135,0.3)] group-hover:border-[#00ff87] group-hover:shadow-[0_0_30px_rgba(0,255,135,0.6)] group-hover:scale-105 transition-all duration-300">
            <Terminal className="w-5 h-5 text-[#00ff87] group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex flex-col">
            <span className="font-space font-bold text-xl sm:text-2xl tracking-tight text-white group-hover:text-[#00ff87] transition-colors leading-tight">
              Ngo Anh Tuan
            </span>
            <span className="font-mono text-xs text-[#00ff87] tracking-wider flex items-center gap-1 font-semibold leading-none mt-1">
              <span className="text-zinc-500">&lt;</span>
              <span>fullstack.dev</span>
              <span className="text-zinc-500">/&gt;</span>
              <span className="inline-block w-1.5 h-3 bg-[#00ff87] animate-pulse ml-0.5" />
            </span>
          </div>
        </a>

        {/* Desktop links - liquid glow capsule */}
        <div className="hidden lg:flex items-center gap-2">
          {NAV_LINKS.map((l) => {
            const isActive = activeSection === l.href;
            return (
              <a
                key={l.href}
                href={l.href}
                id={`nav-${l.label.toLowerCase()}-link`}
                className={`relative text-base font-semibold transition-all duration-200 tracking-wide py-1.5 px-4 rounded-full ${
                  isActive
                    ? 'liquid-nav-link-active font-bold'
                    : 'text-zinc-300 hover:text-[#00ff87] hover:bg-white/5'
                }`}
              >
                {l.label}
              </a>
            );
          })}
        </div>

        {/* CTA */}
        <div className="hidden sm:flex items-center gap-3">
                    <a
            href="mailto:ngoanhtuan23.it@gmail.com"
            id="nav-hire-btn"
            className="nav-cta relative group inline-flex items-center gap-2.5 overflow-hidden rounded-full bg-white/5 px-7 py-3 transition-all active:scale-95 hover:bg-white/10"
          >
            <span className="absolute inset-[-100%] group-hover:animate-[spin_3s_linear_infinite] group-focus-visible:animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_75%,#00ff87_100%)] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" />
            <span className="absolute inset-[1px] rounded-full bg-black" />
            <span className="relative z-10 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#00ff87]">
              Hire Me <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          id="nav-mobile-toggle"
          aria-label="Toggle navigation menu"
          className="lg:hidden p-2.5 rounded-xl border border-white/20 text-zinc-200 hover:text-[#00ff87] hover:border-[#00ff87]/50 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden mt-3 mx-4 liquid-glass-nav rounded-3xl p-7 shadow-2xl animate-fade-in relative overflow-hidden">
          <div className="absolute inset-x-6 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#00ff87]/50 to-transparent pointer-events-none" />
          {NAV_LINKS.map((l) => {
            const isActive = activeSection === l.href;
            return (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className={`block py-3.5 px-4 text-xl font-bold rounded-xl transition-all border-b border-white/5 last:border-0 ${
                  isActive
                    ? 'text-[#00ff87] bg-[#00ff87]/10'
                    : 'text-zinc-100 hover:text-[#00ff87]'
                }`}
              >
                {l.label}
              </a>
            );
          })}
                    <a
            href="mailto:ngoanhtuan23.it@gmail.com"
            className="mt-6 flex items-center justify-center gap-2.5 w-full py-4 rounded-full bg-[#00ff87] text-black text-base font-bold shadow-[0_0_25px_rgba(0,255,135,0.4)]"
          >
            Hire Me <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      )}
    </header>
  );
});

const HeroSection = React.memo(function HeroSection({
  isP5Active = true,
  p5Opacity = 1.0,
  qualityPreset,
  visualsReady = false,
}: {
  isP5Active?: boolean;
  p5Opacity?: number;
  qualityPreset?: any;
  visualsReady?: boolean;
}) {
  return (
    <section id="hero" className="relative z-10 min-h-screen flex flex-col items-center justify-center pt-28 pb-20 px-6 overflow-hidden">
      {/* ForceField Canvas with dynamic lifecycle mutual exclusion and crossfade */}
      <div
        className="canvas-overlay"
        aria-hidden="true"
        role="presentation"
        style={{
          opacity: p5Opacity * 0.65,
          pointerEvents: visualsReady && isP5Active && p5Opacity > 0.05 ? 'auto' : 'none',
          transition: 'opacity 0.15s ease-out',
        }}
      >
        {visualsReady && <Suspense fallback={null}>
          <ForceFieldBackground
            isActive={isP5Active}
            opacity={p5Opacity}
            hue={135}
            saturation={95}
            spacing={22}
            minStroke={1.5}
            maxStroke={5}
            forceStrength={18}
            magnifierRadius={175}
            friction={0.86}
            restoreSpeed={0.14}
            magnifierInertia={0.96}
            qualityPreset={qualityPreset}
          />
        </Suspense>}
      </div>

      {/* Darkening gradient over the canvas to ensure text legibility */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/60 via-black/45 to-black/85 pointer-events-none" />

      {/* Content */}
      <div className="relative z-[2] text-center max-w-4xl mx-auto content-shield">
        {/* Status badge */}
        <div
          className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-black/60 border border-[#00ff87]/30 backdrop-blur-md mb-8 animate-fade-up shadow-[0_0_20px_rgba(0,255,135,0.15)] pointer-events-none select-none"
          style={{ animationDelay: '0.1s' }}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff87] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00ff87] shadow-[0_0_8px_#00ff87]" />
          </span>
          <span className="text-sm font-semibold text-emerald-200 tracking-wide font-space">
            Open to full-time opportunities · Ho Chi Minh City, Vietnam
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-[#00ff87]" />
        </div>

        {/* Name & Title */}
        <h1
          className="font-space text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[1.05] mb-6 animate-fade-up"
          style={{ animationDelay: '0.2s' }}
        >
          <span className="block text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/60">
            Ngo Anh Tuan
          </span>
          <span className="block text-[#00ff87] green-glow text-4xl sm:text-5xl md:text-6xl font-extrabold mt-3">
            Full-Stack Engineer
          </span>
        </h1>

        <p
          className="text-xl sm:text-2xl text-zinc-200 max-w-3xl mx-auto mb-10 leading-relaxed font-normal animate-fade-up"
          style={{ animationDelay: '0.3s' }}
        >
          Software Engineering candidate building robust, scalable digital products —
          from <span className="text-white font-semibold underline decoration-[#00ff87]/50 underline-offset-4">.NET backends</span> &amp;{' '}
          <span className="text-white font-semibold underline decoration-[#00ff87]/50 underline-offset-4">Next.js interfaces</span> to{' '}
          <span className="text-white font-semibold underline decoration-[#00ff87]/50 underline-offset-4">AI-integrated systems</span>.
        </p>

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-5 animate-fade-up"
          style={{ animationDelay: '0.4s' }}
        >
          <a
            href="#projects"
            id="hero-projects-btn"
            className="shiny-cta group px-9 py-4"
          >
            <span className="relative z-10 flex items-center gap-2.5 text-white font-bold text-base group-hover:text-[#00ff87] transition-colors">
              View Projects
              <ArrowRight className="w-4 h-4 text-[#00ff87] group-hover:translate-x-1 transition-transform" />
            </span>
          </a>
          <a
            href="NgoAnhTuan_FullStack_Eng.pdf"
            download
            id="hero-resume-btn"
            className="group px-9 py-4 rounded-full bg-zinc-950/80 border border-zinc-700 text-zinc-100 font-bold text-base hover:text-white hover:bg-zinc-900 hover:border-[#00ff87]/60 transition-all flex items-center gap-2.5 backdrop-blur-md shadow-lg"
          >
            <Download className="w-4 h-4 text-[#00ff87]" />
            Download CV
          </a>
        </div>

        {/* Quick contact strip */}
        <div
          className="mt-14 flex flex-wrap items-center justify-center gap-8 text-base text-zinc-300 font-medium animate-fade-up"
          style={{ animationDelay: '0.55s' }}
        >
          <a href="mailto:ngoanhtuan23.it@gmail.com" className="flex items-center gap-2 hover:text-[#00ff87] transition-colors">
            <Mail className="w-4 h-4 text-[#00ff87]" />
            ngoanhtuan23.it@gmail.com
          </a>
          <a href="https://github.com/Tuandaca" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-[#00ff87] transition-colors">
            <Github className="w-4 h-4 text-[#00ff87]" />
            github.com/Tuandaca
          </a>
          <span className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#00ff87]" />
            Ho Chi Minh City, Vietnam
          </span>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[2] flex flex-col items-center gap-2 text-zinc-400 text-xs animate-fade-in pointer-events-none select-none" style={{ animationDelay: '1s' }}>
        <span className="font-mono tracking-widest uppercase text-[#00ff87]/80">scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-[#00ff87]/80 to-transparent" />
      </div>
    </section>
  );
});

const AboutSection = React.memo(function AboutSection() {
  return (
    <section id="about" className="relative z-10 py-28 px-6 border-t border-white/10 scroll-mt-24 sm:scroll-mt-28">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          {/* Left: Text */}
          <div className="content-shield">
            <ScrollReveal delay={0}>
              <p className="text-sm font-bold text-[#00ff87] uppercase tracking-widest mb-3 font-space">
                About Me
              </p>
            </ScrollReveal>
            <ScrollReveal delay={80}>
              <h2 className="font-space text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-7 text-white">
                Turning ideas into{' '}
                <span className="text-[#00ff87] green-glow">production-grade</span> software.
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={160}>
              <p className="text-zinc-200 text-lg leading-relaxed mb-6 font-normal">
                I am a Software Engineering candidate at{' '}
                <span className="text-white font-semibold">Ton Duc Thang University</span> (Class of 2026) with practical
                experience in full-stack web development and AI-integrated systems through university infrastructure work
                and academic capstone research.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={220}>
              <p className="text-zinc-200 text-lg leading-relaxed mb-8 font-normal">
                My core expertise lies in <span className="text-white font-semibold">backend architecture</span>,{' '}
                <span className="text-white font-semibold">RESTful API design</span>, and{' '}
                <span className="text-white font-semibold">database modeling</span> — while staying comfortable across the full
                stack from database to UI. I'm eager to contribute to teams shipping impactful digital products at scale.
              </p>
            </ScrollReveal>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-5">
              {[
                { val: '2+', label: 'Years Coding' },
                { val: 'Core', label: 'Full-Stack Stack' },
                { val: 'B2', label: 'English (Aptis)' },
              ].map((s, i) => (
                <ScrollReveal key={s.label} delay={300 + i * 80}>
                  <div className="text-center p-5 border border-[#00ff87]/20 rounded-2xl bg-black/40 shadow-[0_0_20px_rgba(0,255,135,0.06)]">
                    <div className="text-3xl md:text-4xl font-black font-space text-[#00ff87]">{s.val}</div>
                    <div className="text-sm text-zinc-300 mt-1 font-medium">{s.label}</div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>

          {/* Right: Avatar / Profile Card */}
          <div className="flex justify-center">
            <ScrollReveal delay={200} direction="right">
              <div className="relative w-full max-w-[340px] sm:max-w-[360px]">
                {/* Glow ring */}
                <div className="absolute -inset-1 rounded-3xl bg-[#00ff87]/10 blur-xl pointer-events-none" />
                {/* Profile Card */}
                <div className="relative w-full rounded-3xl border border-[#00ff87]/30 bg-gradient-to-br from-zinc-950/95 via-black/95 to-zinc-950/95 backdrop-blur-sm flex flex-col items-center justify-center shadow-2xl overflow-hidden p-6 sm:p-8">
                  {/* Portrait with subtle neon-green border/glow */}
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full p-[2px] bg-gradient-to-b from-[#00ff87]/60 via-[#00ff87]/20 to-transparent shadow-[0_0_24px_rgba(0,255,135,0.25)] mb-4">
                    <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900 border border-[#00ff87]/40 relative">
                      <img
                        src="/avatar.jpg"
                        alt="Ngo Anh Tuan — Portrait"
                        className="w-full h-full object-cover object-[center_20%] select-none transition-transform duration-500 hover:scale-105"
                        loading="lazy"
                        decoding="async"
                        width={128}
                        height={128}
                      />
                    </div>
                  </div>

                  <p className="font-space font-bold text-white text-2xl tracking-tight">Ngo Anh Tuan</p>
                  <p className="text-zinc-300 text-base mt-1 font-medium">Full-Stack Engineer</p>
                  <p className="text-xs text-zinc-400 mt-2 flex items-center gap-1 font-mono">
                    <MapPin className="w-3.5 h-3.5 text-[#00ff87]" /> Ho Chi Minh City, Vietnam
                  </p>

                  {/* 6 Glass Social & Contact Buttons (Responsive 3x2 Grid) */}
                  <div className="grid grid-cols-3 gap-3 sm:gap-3.5 mt-6 w-full max-w-[240px] place-items-center">
                    {/* GitHub */}
                    <a
                      href="https://github.com/Tuandaca"
                      target="_blank"
                      rel="noopener noreferrer"
                      id="about-github-link"
                      aria-label="GitHub Profile (Tuandaca)"
                      className="group relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/[0.04] backdrop-blur-md border border-white/10 text-zinc-300 transition-all duration-300 ease-out overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87] focus-visible:ring-offset-2 focus-visible:ring-offset-[#010503] active:scale-95 hover:scale-110 hover:-rotate-6 hover:text-white hover:border-[#00ff87]/60 hover:bg-[#00ff87]/10 hover:shadow-[0_0_24px_rgba(0,255,135,0.35)]"
                    >
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-25deg]" />
                      <svg className="w-5 h-5 fill-current transition-colors" viewBox="0 0 24 24" aria-hidden="true">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                      </svg>
                    </a>

                    {/* Facebook */}
                    <a
                      href="https://web.facebook.com/ngobongsu"
                      target="_blank"
                      rel="noopener noreferrer"
                      id="about-facebook-link"
                      aria-label="Facebook Profile (ngobongsu)"
                      className="group relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/[0.04] backdrop-blur-md border border-white/10 text-zinc-300 transition-all duration-300 ease-out overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87] focus-visible:ring-offset-2 focus-visible:ring-offset-[#010503] active:scale-95 hover:scale-110 hover:rotate-6 hover:text-[#1877F2] hover:border-[#1877F2]/60 hover:bg-[#1877F2]/10 hover:shadow-[0_0_24px_rgba(24,119,242,0.35)]"
                    >
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-25deg]" />
                      <svg className="w-5 h-5 fill-current transition-colors" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </a>

                    {/* Instagram */}
                    <a
                      href="https://www.instagram.com/tuandaca23"
                      target="_blank"
                      rel="noopener noreferrer"
                      id="about-instagram-link"
                      aria-label="Instagram Profile (tuandaca23)"
                      className="group relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/[0.04] backdrop-blur-md border border-white/10 text-zinc-300 transition-all duration-300 ease-out overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87] focus-visible:ring-offset-2 focus-visible:ring-offset-[#010503] active:scale-95 hover:scale-110 hover:-rotate-6 hover:text-[#E4405F] hover:border-[#E4405F]/60 hover:bg-[#E4405F]/10 hover:shadow-[0_0_24px_rgba(228,64,95,0.35)]"
                    >
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-25deg]" />
                      <svg className="w-5 h-5 fill-none stroke-current stroke-2 transition-colors" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" strokeWidth="2.5" />
                      </svg>
                    </a>

                    {/* Discord */}
                    <a
                      href="https://discord.com/users/903269942005235814"
                      target="_blank"
                      rel="noopener noreferrer"
                      id="about-discord-link"
                      aria-label="Discord Profile (903269942005235814)"
                      className="group relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/[0.04] backdrop-blur-md border border-white/10 text-zinc-300 transition-all duration-300 ease-out overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87] focus-visible:ring-offset-2 focus-visible:ring-offset-[#010503] active:scale-95 hover:scale-110 hover:rotate-6 hover:text-[#5865F2] hover:border-[#5865F2]/60 hover:bg-[#5865F2]/10 hover:shadow-[0_0_24px_rgba(88,101,242,0.35)]"
                    >
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-25deg]" />
                      <svg className="w-5 h-5 fill-current transition-colors" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                      </svg>
                    </a>

                    {/* Email */}
                    <a
                      href="mailto:ngoanhtuan23.it@gmail.com"
                      id="about-email-link"
                      aria-label="Email Ngo Anh Tuan (ngoanhtuan23.it@gmail.com)"
                      className="group relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/[0.04] backdrop-blur-md border border-white/10 text-zinc-300 transition-all duration-300 ease-out overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87] focus-visible:ring-offset-2 focus-visible:ring-offset-[#010503] active:scale-95 hover:scale-110 hover:-rotate-6 hover:text-white hover:border-[#00ff87]/60 hover:bg-[#00ff87]/10 hover:shadow-[0_0_24px_rgba(0,255,135,0.35)]"
                    >
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-25deg]" />
                      <Mail className="w-5 h-5 transition-colors" />
                    </a>

                    {/* Phone */}
                    <a
                      href="tel:+84917940833"
                      id="about-phone-link"
                      aria-label="Call Ngo Anh Tuan (+84 917 940 833)"
                      className="group relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/[0.04] backdrop-blur-md border border-white/10 text-zinc-300 transition-all duration-300 ease-out overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87] focus-visible:ring-offset-2 focus-visible:ring-offset-[#010503] active:scale-95 hover:scale-110 hover:rotate-6 hover:text-white hover:border-[#00ff87]/60 hover:bg-[#00ff87]/10 hover:shadow-[0_0_24px_rgba(0,255,135,0.35)]"
                    >
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-25deg]" />
                      <Phone className="w-5 h-5 transition-colors" />
                    </a>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
});

const SkillsSection = React.memo(function SkillsSection() {
  return (
    <section id="skills" className="relative z-10 py-28 px-6 border-t border-white/10 bg-gradient-to-b from-zinc-950/40 via-black to-zinc-950/20 scroll-mt-24 sm:scroll-mt-28">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 content-shield">
          <ScrollReveal delay={0}>
            <p className="text-sm font-bold text-[#00ff87] uppercase tracking-widest mb-3 font-space">Tech Stack</p>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <h2 className="font-space text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white">
              Tools I Build{' '}
              <span className="text-[#00ff87] green-glow">With</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={160}>
            <p className="text-zinc-200 text-lg md:text-xl mt-4 max-w-xl mx-auto leading-relaxed">
              A curated stack for building performant, production-ready software from backend to browser.
            </p>
          </ScrollReveal>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SKILLS.map((s, i) => (
            <ScrollReveal key={s.category} delay={220 + i * 60}>
              <div className="bento-card p-7 h-full">
                <div className={`inline-flex p-3.5 rounded-xl bg-white/5 border border-white/10 ${s.color} mb-5`}>
                  {s.icon}
                </div>
                <h3 className="font-space font-bold text-white text-xl mb-4">{s.category}</h3>
                <div className="flex flex-wrap gap-2.5">
                  {s.items.map((item) => (
                    <span key={item} className="skill-pill">{item}</span>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
});

const ExperienceSection = React.memo(function ExperienceSection() {
  return (
    <section id="experience" className="relative z-10 py-28 px-6 border-t border-white/10 scroll-mt-24 sm:scroll-mt-28">
      <div className="max-w-4xl mx-auto">
        <div className="mb-16 content-shield">
          <ScrollReveal delay={0}>
            <p className="text-sm font-bold text-[#00ff87] uppercase tracking-widest mb-3 font-space">Journey</p>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <h2 className="font-space text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white">
              Work &amp; <span className="text-[#00ff87] green-glow">Education</span>
            </h2>
          </ScrollReveal>
        </div>

        {/* Education card */}
        <ScrollReveal delay={140}>
          <div className="bento-card p-7 mb-8 flex items-start gap-5">
            <div className="shrink-0 p-3.5 rounded-xl bg-[#00ff87]/10 border border-[#00ff87]/30 text-[#00ff87]">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-space font-bold text-white text-xl">B.Sc. Software Engineering</h3>
                  <p className="text-zinc-200 text-base mt-1">Ton Duc Thang University, Ho Chi Minh City</p>
                </div>
                <span className="text-sm font-mono text-[#00ff87] shrink-0 pt-1 font-semibold">2021 – 2026</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="skill-pill"><Award className="w-3.5 h-3.5 text-[#00ff87]" /> Aptis ESOL B2 (2024)</span>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Work experience */}
        <div className="relative pl-7 space-y-8">
          <div className="timeline-line" />
          {EXPERIENCES.map((exp, i) => (
            <div key={i} className="relative">
              {/* Dot */}
              <div className="absolute -left-[35px] top-6 w-4 h-4 rounded-full bg-[#00ff87] border-2 border-black ring-4 ring-[#00ff87]/25 shadow-[0_0_12px_#00ff87]" />
              <ScrollReveal delay={220 + i * 120}>
                <div className="bento-card p-7">
                  <div className="flex items-start justify-between flex-wrap gap-2 mb-4">
                    <div className="flex items-start gap-3.5">
                      <div className="shrink-0 p-2.5 rounded-lg bg-white/5 border border-white/10 text-[#00ff87] mt-0.5">
                        {exp.icon}
                      </div>
                      <div>
                        <h3 className="font-space font-bold text-white text-lg sm:text-xl">{exp.role}</h3>
                        <p className="text-zinc-300 text-base mt-0.5 font-medium">
                          {exp.company}
                          <span className="mx-2 text-zinc-600">·</span>
                          {exp.location}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-mono text-[#00ff87] shrink-0 pt-1 font-semibold">{exp.period}</span>
                  </div>
                  <ul className="space-y-3 mb-5">
                    {exp.bullets.map((b, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-base text-zinc-200 leading-relaxed">
                        <ChevronRight className="w-4 h-4 text-[#00ff87] shrink-0 mt-1" />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-2.5">
                    {exp.tech.map((t) => (
                      <span key={t} className="skill-pill">{t}</span>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

const ProjectsSection = React.memo(function ProjectsSection() {
  return (
    <section id="projects" className="relative z-10 py-28 px-6 border-t border-white/10 bg-gradient-to-b from-black via-zinc-950/40 to-black scroll-mt-24 sm:scroll-mt-28">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 content-shield">
          <ScrollReveal delay={0}>
            <p className="text-sm font-bold text-[#00ff87] uppercase tracking-widest mb-3 font-space">Portfolio</p>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <h2 className="font-space text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white">
              Things I've <span className="text-[#00ff87] green-glow">Built</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={160}>
            <p className="text-zinc-200 text-lg md:text-xl mt-4 max-w-xl mx-auto leading-relaxed">
              Projects ranging from AI-powered research systems to full-stack SaaS platforms.
            </p>
          </ScrollReveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {PROJECTS.map((proj, i) => (
            <ScrollReveal key={i} delay={220 + i * 120} className="h-full">
              <div
                className="bento-card p-8 flex flex-col h-full"
                style={{ borderColor: proj.featured ? proj.border : undefined }}
              >
                <div className="flex items-start justify-between mb-5 gap-3">
                  <div className={`p-3.5 rounded-xl bg-white/5 border border-white/10 ${proj.accent}`}>
                    {proj.icon}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-[#00ff87]/30 bg-[#00ff87]/10 text-[#00ff87]">
                    {proj.badge}
                  </span>
                </div>

                <h3 className="font-space font-bold text-white text-2xl mb-3 leading-snug">{proj.title}</h3>
                <p className="text-zinc-200 text-base leading-relaxed flex-1 mb-6">{proj.description}</p>

                <div className="flex flex-wrap gap-2.5 mb-6">
                  {proj.tech.map((t) => (
                    <span key={t} className="skill-pill text-xs">{t}</span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-white/10">
                  <a
                    href={proj.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    id={`proj-github-${i}`}
                    className="flex items-center gap-2 text-sm sm:text-base text-zinc-300 hover:text-[#00ff87] transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87] rounded-lg px-2 py-1 -ml-2"
                  >
                    <Github className="w-5 h-5" />
                    View Source
                  </a>
                  {proj.liveUrl ? (
                    <a
                      href={proj.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      id={`proj-ext-${i}`}
                      className={`flex items-center gap-1.5 text-sm sm:text-base font-semibold ${proj.accent} hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87] rounded-lg px-2 py-1 -mr-2`}
                    >
                      Live Demo <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : null}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* GitHub CTA */}
        <ScrollReveal delay={360}>
          <div className="mt-12 text-center">
            <a
              href="https://github.com/Tuandaca"
              target="_blank"
              rel="noopener noreferrer"
              id="all-projects-btn"
              className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full border border-[#00ff87]/30 bg-white/5 hover:bg-[#00ff87]/10 hover:border-[#00ff87] text-base text-zinc-200 hover:text-white transition-all font-semibold shadow-sm"
            >
              <Github className="w-5 h-5 text-[#00ff87]" /> See all repositories on GitHub
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
});

const EngineeringFocusBanner = React.memo(function EngineeringFocusBanner() {
  const pillars = [
    {
      title: 'Robust Backend Systems',
      tech: '.NET / ASP.NET Core · Node.js / NestJS · RESTful APIs',
      description: 'Scalable service architectures, modular domain logic, and high-performance RESTful APIs.',
      icon: <Server className="w-5 h-5 text-cyan-400" />,
      accent: 'border-cyan-500/30 bg-cyan-500/5',
      badgeColor: 'text-cyan-400',
    },
    {
      title: 'Real-Time & Event Architecture',
      tech: 'Redis · Socket.IO · PostgreSQL Concurrency',
      description: 'Low-latency state synchronization, pub/sub messaging pipelines, and reliable transaction isolation.',
      icon: <Layers className="w-5 h-5 text-emerald-400" />,
      accent: 'border-emerald-500/30 bg-emerald-500/5',
      badgeColor: 'text-emerald-400',
    },
    {
      title: 'Grounded AI & Knowledge Graphs',
      tech: 'GraphRAG · Neo4j · Vector Retrieval · FastAPI',
      description: 'Hallucination-resistant retrieval augmenting LLMs with entity-relation graphs and vector search.',
      icon: <Brain className="w-5 h-5 text-[#00ff87]" />,
      accent: 'border-[#00ff87]/30 bg-[#00ff87]/5',
      badgeColor: 'text-[#00ff87]',
    },
    {
      title: 'Type-Safe Frontend',
      tech: 'Next.js · React · TypeScript · Tailwind CSS',
      description: 'Production-grade component architectures with strict static typing and accessible design systems.',
      icon: <Globe className="w-5 h-5 text-teal-300" />,
      accent: 'border-teal-500/30 bg-teal-500/5',
      badgeColor: 'text-teal-300',
    },
  ];

  return (
    <div className="w-full relative z-10 bg-gradient-to-r from-emerald-950/40 via-black to-emerald-950/40 border-y border-[#00ff87]/20 py-20 px-6 shadow-[0_0_50px_rgba(0,255,135,0.06)]">
      <div className="max-w-6xl mx-auto content-shield">
        <ScrollReveal delay={0}>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-[#00ff87]/30 text-[#00ff87] text-xs font-mono font-semibold uppercase tracking-wider mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff87] animate-pulse" />
              CORE ARCHITECTURE &amp; SYSTEMS FOCUS
            </div>
            <h2 className="font-space text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
              Engineering <span className="text-[#00ff87] green-glow">Capabilities</span>
            </h2>
            <p className="text-zinc-300 text-base sm:text-lg mt-3 max-w-2xl mx-auto">
              Production-focused technical capabilities grounded in verified project implementations and academic research.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((pillar, i) => (
            <ScrollReveal key={pillar.title} delay={100 + i * 80} className="h-full">
              <div className="bento-card p-6 flex flex-col h-full hover:border-[#00ff87]/40 transition-colors">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border mb-4 ${pillar.accent}`}>
                  {pillar.icon}
                </div>
                <h3 className="font-space font-bold text-lg text-white mb-1.5 leading-snug">
                  {pillar.title}
                </h3>
                <p className={`text-xs font-mono font-semibold mb-3 ${pillar.badgeColor}`}>
                  {pillar.tech}
                </p>
                <p className="text-sm text-zinc-300 leading-relaxed flex-1">
                  {pillar.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </div>
  );
});


const Footer = React.memo(function Footer() {
  return (
    <footer className="relative z-10 bg-black/90 border-t border-zinc-900 py-8 px-6 overflow-hidden transition-colors duration-300">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between text-zinc-400 text-xs md:text-sm tracking-wider gap-4">
        <p>
          &copy; {new Date().getFullYear()} Ngo Anh Tuan — Full-Stack Software Engineer
        </p>
        <div className="flex items-center gap-2 text-zinc-400">
          <span>Built with</span>
          <span className="text-[#00ff87]">♥</span>
          <span>using React, TypeScript, Three.js &amp; p5.js</span>
        </div>
        <div className="flex gap-6">
          <a
            href="https://github.com/Tuandaca"
            target="_blank"
            rel="noreferrer"
            id="footer-github-link"
            className="hover:text-[#00ff87] transition-colors font-medium"
          >
            GitHub
          </a>
          <a
            href="mailto:ngoanhtuan23.it@gmail.com"
            id="footer-email-link"
            className="hover:text-[#00ff87] transition-colors font-medium"
          >
            Email
          </a>
        </div>
      </div>
    </footer>
  );
});

// ── APP ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [visualsReady, setVisualsReady] = useState(false);
  useEffect(() => setVisualsReady(true), []);
  const { scrollProgress, targetTransform } = useScrollStoryteller();
  const adaptiveQuality = useAdaptiveQuality();

  // Coordinate lifecycle, mutual exclusion, and crossfade between p5 and Three.js
  const coordinator = useCanvasCoordinator({
    scrollProgress,
    targetWebglOpacity: targetTransform.opacity,
  });

  const effectiveTransform = useMemo(() => ({
    ...targetTransform,
    opacity: coordinator.webglOpacity,
  }), [targetTransform, coordinator.webglOpacity]);

  useEffect(() => {
    // Idle preloading for DevNetworkCanvas (Three.js chunk) before section transitions occur
    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        const id = (window as any).requestIdleCallback(preloadDevNetwork);
        return () => (window as any).cancelIdleCallback(id);
      } else {
        const id = setTimeout(preloadDevNetwork, 1500);
        return () => clearTimeout(id);
      }
    }
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#010503] text-white overflow-x-hidden selection:bg-[#00ff87] selection:text-black">
      {/* Custom Cyber Cursor (active on fine pointer / desktop only) */}
      {visualsReady && <CyberCursor />}

      {visualsReady && <GalaxyBackground tier={adaptiveQuality.tier} />}

      {/* DEV.NETWORK WebGL Procedural Background Layer */}
      {visualsReady && <ErrorBoundary fallback={<FallbackBackground className="fixed inset-0 pointer-events-none z-0" />}>
        <Suspense fallback={<FallbackBackground className="fixed inset-0 pointer-events-none z-0" />}>
          <DevNetworkCanvas
            className="fixed inset-0 pointer-events-none z-0"
            scrollProgress={scrollProgress}
            targetTransform={effectiveTransform}
            isActive={coordinator.isWebglActive}
            opacity={coordinator.webglOpacity}
            qualityPreset={adaptiveQuality.preset}
            onFrame={adaptiveQuality.recordFrame}
          />
        </Suspense>
      </ErrorBoundary>}

      {/* Top blur overlay */}
      <div className="gradient-blur" />

      {/* Navigation */}
      <Navbar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      {/* Page Sections */}
      <main className="relative z-10">
        <HeroSection
          isP5Active={coordinator.isP5Active}
          p5Opacity={coordinator.p5Opacity}
          qualityPreset={adaptiveQuality.preset}
          visualsReady={visualsReady}
        />
        <AboutSection />
        <SkillsSection />
        <ExperienceSection />
        <ProjectsSection />
        <EngineeringFocusBanner />
        <ContactSection id="contact" />
      </main>

      <Footer />
    </div>
  );
}
