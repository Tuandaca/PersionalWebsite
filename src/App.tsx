import React, { useState, useEffect } from 'react';
import { ForceFieldBackground } from './Component';
import {
  Github, Mail, Phone, MapPin, ExternalLink, ArrowRight,
  Code2, Database, Cpu, Layers, Star, Terminal,
  Briefcase, GraduationCap, User, Menu, X, Download,
  Globe, Server, Brain, ChevronRight, Award
} from 'lucide-react';

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

const PROJECTS = [
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
    badge: 'Personal Project',
    description:
      'End-to-end cinema management platform with real-time seat reservation, order tracking, and online checkout — powered by AI/LLM recommendations.',
    tech: ['Next.js', 'TypeScript', 'NestJS', 'PostgreSQL', 'Prisma', 'Redis', 'Socket.IO'],
    github: 'https://github.com/Tuandaca/cinema',
    featured: true,
    icon: <Layers className="w-6 h-6" />,
    accent: 'text-emerald-400',
    border: 'rgba(52,211,153,0.35)',
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

function Navbar({ menuOpen, setMenuOpen }: { menuOpen: boolean; setMenuOpen: (v: boolean) => void }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header className="fixed top-0 left-0 w-full z-50 pt-5 px-4 sm:px-6">
      <nav
        className={`max-w-6xl mx-auto flex items-center justify-between px-6 sm:px-8 py-3.5 sm:py-4 rounded-full transition-all duration-300 ${
          scrolled
            ? 'bg-black/90 backdrop-blur-2xl border border-[#00ff87]/30 shadow-[0_12px_40px_rgba(0,0,0,0.85)]'
            : 'bg-black/50 backdrop-blur-md border border-white/10'
        }`}
      >
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

        {/* Desktop links - larger, bolder, clearer */}
        <div className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              id={`nav-${l.label.toLowerCase()}-link`}
              className="text-lg font-semibold text-zinc-200 hover:text-[#00ff87] transition-colors tracking-wide py-1.5 px-3 rounded-lg hover:bg-white/5"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden sm:flex items-center gap-3">
          <a
            href="mailto:ngoanhtuan23.it@gmail.com"
            id="nav-hire-btn"
            className="nav-cta relative group inline-flex items-center gap-2.5 overflow-hidden rounded-full bg-white/5 px-7 py-3 transition-all active:scale-95 hover:bg-white/10"
          >
            <span className="absolute inset-[-100%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_75%,#00ff87_100%)] opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="absolute inset-[1px] rounded-full bg-black" />
            <span className="relative z-10 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#00ff87]">
              Hire Me <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          id="nav-mobile-toggle"
          className="lg:hidden p-2.5 rounded-xl border border-white/20 text-zinc-200 hover:text-[#00ff87] hover:border-[#00ff87]/50 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden mt-3 mx-4 bg-black/95 backdrop-blur-2xl border border-[#00ff87]/30 rounded-3xl p-7 shadow-2xl animate-fade-in">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="block py-4 text-xl font-bold text-zinc-100 hover:text-[#00ff87] border-b border-white/10 last:border-0"
            >
              {l.label}
            </a>
          ))}
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
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-28 pb-20 px-6 overflow-hidden">
      {/* ForceField Canvas */}
      <div className="canvas-overlay">
        <ForceFieldBackground
          hue={135}
          saturation={95}
          spacing={11}
          minStroke={1.5}
          maxStroke={5}
          forceStrength={15}
          magnifierRadius={180}
          friction={0.91}
          restoreSpeed={0.045}
        />
      </div>

      {/* Darkening gradient over the canvas to ensure text legibility */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/60 via-black/45 to-black/85 pointer-events-none" />

      {/* Content */}
      <div className="relative z-[2] text-center max-w-4xl mx-auto">
        {/* Status badge */}
        <div
          className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-black/60 border border-[#00ff87]/30 backdrop-blur-md mb-8 animate-fade-up shadow-[0_0_20px_rgba(0,255,135,0.15)]"
          style={{ animationDelay: '0.1s' }}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff87] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00ff87] shadow-[0_0_8px_#00ff87]" />
          </span>
          <span className="text-sm font-semibold text-emerald-200 tracking-wide font-space">
            Open to full-time opportunities · Ho Chi Minh City
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
          Software Engineering graduate building robust, scalable digital products —
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
            Tan Hung, District 7, HCM City
          </span>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[2] flex flex-col items-center gap-2 text-zinc-400 text-xs animate-fade-in" style={{ animationDelay: '1s' }}>
        <span className="font-mono tracking-widest uppercase text-[#00ff87]/80">scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-[#00ff87]/80 to-transparent" />
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section id="about" className="py-28 px-6 border-t border-white/10">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          {/* Left: Text */}
          <div>
            <p className="text-sm font-bold text-[#00ff87] uppercase tracking-widest mb-3 font-space">
              About Me
            </p>
            <h2 className="font-space text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-7 text-white">
              Turning ideas into{' '}
              <span className="text-[#00ff87] green-glow">production-grade</span> software.
            </h2>
            <p className="text-zinc-200 text-lg leading-relaxed mb-6 font-normal">
              I'm a Software Engineering student at{' '}
              <span className="text-white font-semibold">Ton Duc Thang University</span> (graduating 2026) with hands-on
              experience in full-stack web development and AI-integrated systems — both through academic research and
              real-world internship work.
            </p>
            <p className="text-zinc-200 text-lg leading-relaxed mb-8 font-normal">
              My core expertise lies in <span className="text-white font-semibold">backend architecture</span>,{' '}
              <span className="text-white font-semibold">RESTful API design</span>, and{' '}
              <span className="text-white font-semibold">database modeling</span> — while staying comfortable across the full
              stack from database to UI. I'm eager to contribute to teams shipping impactful digital products at scale.
            </p>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-5">
              {[
                { val: '2+', label: 'Years Coding' },
                { val: '5+', label: 'Tech Stacks' },
                { val: 'B2', label: 'English (Aptis)' },
              ].map((s) => (
                <div key={s.label} className="text-center p-5 border border-[#00ff87]/20 rounded-2xl bg-black/40 shadow-[0_0_20px_rgba(0,255,135,0.06)]">
                  <div className="text-3xl md:text-4xl font-black font-space text-[#00ff87]">{s.val}</div>
                  <div className="text-sm text-zinc-300 mt-1 font-medium">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Avatar / Card */}
          <div className="flex justify-center">
            <div className="relative w-80 h-80">
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-full bg-[#00ff87]/20 blur-3xl animate-[pulse-glow_4s_ease-in-out_infinite]" />
              {/* Avatar placeholder */}
              <div className="relative w-full h-full rounded-3xl border border-[#00ff87]/40 bg-gradient-to-br from-zinc-950 to-black flex flex-col items-center justify-center shadow-2xl overflow-hidden p-6">
                <div className="w-28 h-28 rounded-full border-2 border-[#00ff87]/60 bg-zinc-900 flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(0,255,135,0.2)]">
                  <User className="w-14 h-14 text-[#00ff87]" />
                </div>
                <p className="font-space font-bold text-white text-2xl">Ngo Anh Tuan</p>
                <p className="text-zinc-300 text-base mt-1 font-medium">Full-Stack Engineer</p>
                <div className="flex gap-4 mt-6">
                  <a href="https://github.com/Tuandaca" target="_blank" rel="noreferrer" id="about-github-link"
                    className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#00ff87] hover:text-[#00ff87] transition-all">
                    <Github className="w-5 h-5" />
                  </a>
                  <a href="mailto:ngoanhtuan23.it@gmail.com" id="about-email-link"
                    className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#00ff87] hover:text-[#00ff87] transition-all">
                    <Mail className="w-5 h-5" />
                  </a>
                  <a href="tel:+84917940833" id="about-phone-link"
                    className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#00ff87] hover:text-[#00ff87] transition-all">
                    <Phone className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SkillsSection() {
  return (
    <section id="skills" className="py-28 px-6 border-t border-white/10 bg-gradient-to-b from-zinc-950/40 via-black to-zinc-950/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-bold text-[#00ff87] uppercase tracking-widest mb-3 font-space">Tech Stack</p>
          <h2 className="font-space text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white">
            Tools I Build{' '}
            <span className="text-[#00ff87] green-glow">With</span>
          </h2>
          <p className="text-zinc-200 text-lg md:text-xl mt-4 max-w-xl mx-auto leading-relaxed">
            A curated stack for building performant, production-ready software from backend to browser.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SKILLS.map((s, i) => (
            <div
              key={s.category}
              className="bento-card p-7"
              style={{ animationDelay: `${i * 0.07}s` }}
            >
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
          ))}
        </div>
      </div>
    </section>
  );
}

function ExperienceSection() {
  return (
    <section id="experience" className="py-28 px-6 border-t border-white/10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-16">
          <p className="text-sm font-bold text-[#00ff87] uppercase tracking-widest mb-3 font-space">Journey</p>
          <h2 className="font-space text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white">
            Work &amp; <span className="text-[#00ff87] green-glow">Education</span>
          </h2>
        </div>

        {/* Education card */}
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

        {/* Work experience */}
        <div className="relative pl-7 space-y-8">
          <div className="timeline-line" />
          {EXPERIENCES.map((exp, i) => (
            <div key={i} className="relative">
              {/* Dot */}
              <div className="absolute -left-[35px] top-6 w-4 h-4 rounded-full bg-[#00ff87] border-2 border-black ring-4 ring-[#00ff87]/25 shadow-[0_0_12px_#00ff87]" />
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
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectsSection() {
  return (
    <section id="projects" className="py-28 px-6 border-t border-white/10 bg-gradient-to-b from-black via-zinc-950/40 to-black">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-bold text-[#00ff87] uppercase tracking-widest mb-3 font-space">Portfolio</p>
          <h2 className="font-space text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white">
            Things I've <span className="text-[#00ff87] green-glow">Built</span>
          </h2>
          <p className="text-zinc-200 text-lg md:text-xl mt-4 max-w-xl mx-auto leading-relaxed">
            Projects ranging from AI-powered research systems to full-stack SaaS platforms.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {PROJECTS.map((proj, i) => (
            <div
              key={i}
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
                  rel="noreferrer"
                  id={`proj-github-${i}`}
                  className="flex items-center gap-2 text-base text-zinc-300 hover:text-[#00ff87] transition-colors font-medium"
                >
                  <Github className="w-5 h-5" />
                  View on GitHub
                </a>
                <a
                  href={proj.github}
                  target="_blank"
                  rel="noreferrer"
                  id={`proj-ext-${i}`}
                  className={`flex items-center gap-1.5 text-base font-semibold ${proj.accent} hover:opacity-80 transition-opacity`}
                >
                  Open <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* GitHub CTA */}
        <div className="mt-12 text-center">
          <a
            href="https://github.com/Tuandaca"
            target="_blank"
            rel="noreferrer"
            id="all-projects-btn"
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full border border-[#00ff87]/30 bg-white/5 hover:bg-[#00ff87]/10 hover:border-[#00ff87] text-base text-zinc-200 hover:text-white transition-all font-semibold"
          >
            <Github className="w-5 h-5 text-[#00ff87]" /> See all repositories on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

function TestimonialBanner() {
  return (
    <div className="w-full bg-gradient-to-r from-emerald-950/80 via-black to-emerald-950/80 border-y border-[#00ff87]/30 py-20 px-6 shadow-[0_0_50px_rgba(0,255,135,0.08)]">
      <div className="max-w-4xl mx-auto text-center">
        <div className="flex justify-center gap-1.5 text-[#00ff87] mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="w-6 h-6 fill-[#00ff87] text-[#00ff87]" />
          ))}
        </div>
        <blockquote className="font-space text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-snug">
          "Solid technical foundation, fast learner, and brings genuine enthusiasm to every project. A great addition to any engineering team."
        </blockquote>
        <p className="mt-7 text-[#00ff87] text-base sm:text-lg font-semibold font-space tracking-wide">
          — Internship Supervisor, Van Lang University IT Department
        </p>
      </div>
    </div>
  );
}

function ContactSection() {
  return (
    <section id="contact" className="py-28 px-6 border-t border-white/10 bg-zinc-950/50">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-sm font-bold text-[#00ff87] uppercase tracking-widest mb-4 font-space">Get In Touch</p>
        <h2 className="font-space text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter mb-7 text-white">
          Ready to <span className="text-[#00ff87] green-glow">Work?</span>
        </h2>
        <p className="text-zinc-200 text-xl md:text-2xl mb-12 leading-relaxed">
          I'm actively looking for full-time software engineering roles. Drop me an email and let's talk.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
          <a
            href="mailto:ngoanhtuan23.it@gmail.com"
            id="contact-email-btn"
            className="shiny-cta group px-9 py-4 flex items-center gap-2.5"
          >
            <span className="relative z-10 flex items-center gap-2.5 text-white font-bold text-base group-hover:text-[#00ff87] transition-colors">
              <Mail className="w-5 h-5 text-[#00ff87]" />
              ngoanhtuan23.it@gmail.com
              <ArrowRight className="w-4 h-4 text-[#00ff87] group-hover:translate-x-1 transition-transform" />
            </span>
          </a>
          <a
            href="tel:+84917940833"
            id="contact-phone-btn"
            className="flex items-center gap-2.5 px-9 py-4 rounded-full border border-[#00ff87]/30 bg-black/60 hover:bg-[#00ff87]/10 hover:border-[#00ff87] text-[#00ff87] hover:text-white transition-all font-bold text-base shadow-lg"
          >
            <Phone className="w-5 h-5 text-[#00ff87]" />
            +84 917 940 833
          </a>
        </div>

        {/* Social row */}
        <div className="flex flex-wrap items-center justify-center gap-8 mt-12">
          <a href="https://github.com/Tuandaca" target="_blank" rel="noreferrer" id="contact-github-link"
            className="flex items-center gap-2 text-base text-zinc-300 hover:text-[#00ff87] transition-colors font-medium">
            <Github className="w-5 h-5 text-[#00ff87]" /> GitHub
          </a>
          <span className="text-zinc-700">·</span>
          <span className="flex items-center gap-2 text-base text-zinc-300 font-medium">
            <MapPin className="w-5 h-5 text-[#00ff87]" /> Tan Hung, District 7, Ho Chi Minh City
          </span>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-black border-t border-zinc-900 pt-16 pb-10 overflow-hidden relative">
      {/* Big text watermark */}
      <div className="flex justify-center py-8 opacity-[0.05] pointer-events-none select-none">
        <h2 className="text-[13vw] leading-none font-black font-space tracking-tighter text-stroke">
          NGO ANH TUAN
        </h2>
      </div>

      {/* Bottom bar */}
      <div className="max-w-7xl mx-auto px-6 border-t border-zinc-900 pt-8 flex flex-col md:flex-row items-center justify-between text-zinc-400 text-xs md:text-sm tracking-wider gap-4">
        <p>
          &copy; {new Date().getFullYear()} Ngo Anh Tuan — Full-Stack Software Engineer
        </p>
        <div className="flex items-center gap-2 text-zinc-400">
          <span>Built with</span>
          <span className="text-[#00ff87]">♥</span>
          <span>using React, Vite &amp; p5.js</span>
        </div>
        <div className="flex gap-6">
          <a href="https://github.com/Tuandaca" target="_blank" rel="noreferrer" id="footer-github-link"
            className="hover:text-[#00ff87] transition-colors font-medium">GitHub</a>
          <a href="mailto:ngoanhtuan23.it@gmail.com" id="footer-email-link"
            className="hover:text-[#00ff87] transition-colors font-medium">Email</a>
        </div>
      </div>
    </footer>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-[#020704] text-white overflow-x-hidden selection:bg-[#00ff87] selection:text-black">
      {/* Global ambient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#021b0e] via-[#020b06] to-black" />
        <div className="absolute top-0 left-0 w-[1px] h-[1px] bg-transparent stars-1 animate-[animStar_50s_linear_infinite]" />
        <div className="absolute top-0 left-0 w-[2px] h-[2px] bg-transparent stars-2 animate-[animStar_80s_linear_infinite]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[850px] bg-emerald-500/8 rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,135,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,135,0.03)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(circle_at_center,black_40%,transparent_80%)]" />
      </div>

      {/* Top blur overlay */}
      <div className="gradient-blur" />

      {/* Navigation */}
      <Navbar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      {/* Page Sections */}
      <main className="relative z-10">
        <HeroSection />
        <AboutSection />
        <SkillsSection />
        <ExperienceSection />
        <ProjectsSection />
        <TestimonialBanner />
        <ContactSection />
      </main>

      <Footer />
    </div>
  );
}
