import React, { useState } from 'react';
import { ScrollReveal } from '../hooks/useScrollReveal';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';

export interface ContactSectionProps {
  id?: string;
  className?: string;
}

interface FormData {
  name: string;
  email: string;
  company: string;
  subject: string;
  message: string;
  website: string; // Honeypot field for bot trapping
}

export function buildContactPayload(formData: FormData, formLoadedAt: number) {
  return {
    ...formData,
    subject: formData.subject.trim() || 'Portfolio Inquiry',
    formLoadedAt,
  };
}

type SubmissionStatus = 'idle' | 'submitting' | 'success' | 'error';

export const ContactSection: React.FC<ContactSectionProps> = React.memo(({
  id = 'contact',
  className = '',
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: '',
    website: '',
  });

  const [formLoadedAt] = useState<number>(() => Date.now());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<SubmissionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters';
    } else if (formData.name.trim().length > 80) {
      errs.name = 'Name cannot exceed 80 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      errs.email = 'Please provide a valid email address';
    }

    if (formData.subject.trim() && formData.subject.trim().length < 3) {
      errs.subject = 'Subject must be at least 3 characters';
    } else if (formData.subject.trim().length > 120) {
      errs.subject = 'Subject cannot exceed 120 characters';
    }

    if (!formData.message.trim() || formData.message.trim().length < 10) {
      errs.message = 'Message must be at least 10 characters';
    } else if (formData.message.trim().length > 2000) {
      errs.message = 'Message cannot exceed 2000 characters';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildContactPayload(formData, formLoadedAt)),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        setStatus('success');
        setFormData({
          name: '',
          email: '',
          company: '',
          subject: '',
          message: '',
          website: '',
        });
      } else {
        setStatus('error');
        setErrorMessage(
          data.error || 'Failed to deliver message via contact API. Please reach out directly.'
        );
      }
    } catch {
      setStatus('error');
      setErrorMessage('Network error occurred. Please contact me directly via email.');
    }
  };

  return (
    <section
      id={id}
      className={`relative z-10 pt-28 pb-16 px-4 sm:px-6 border-t border-white/10 scroll-mt-24 sm:scroll-mt-28 overflow-hidden ${className}`.trim()}
    >
      {/* Soft emerald radial glow behind contact form */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,135,0.035),transparent_60%)] pointer-events-none" />

      <div className="max-w-4xl mx-auto content-shield relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <ScrollReveal delay={0}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-[#00ff87]/30 text-[#00ff87] text-xs font-mono font-semibold uppercase tracking-wider mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff87] animate-pulse" />
              OPEN TO OPPORTUNITIES
            </div>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <h2 className="font-space text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white mb-4">
              Have an engineering opportunity, project, or collaboration?
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={160}>
            <p className="text-zinc-300 text-lg md:text-xl leading-relaxed">
              Send me a message and let's discuss. Open to software engineering opportunities and collaborations.
            </p>
          </ScrollReveal>
        </div>

        {/* Contact Form Card */}
        <ScrollReveal delay={240}>
          <div className="bento-card relative rounded-2xl p-6 sm:p-10 border border-[#00ff87]/25 shadow-2xl">
            {status === 'success' ? (
              <div
                className="py-12 px-4 text-center flex flex-col items-center justify-center animate-fade-up"
                role="status"
                aria-live="polite"
              >
                <div className="w-16 h-16 rounded-full bg-[#00ff87]/10 border border-[#00ff87]/40 flex items-center justify-center text-[#00ff87] mb-6 shadow-[0_0_24px_rgba(0,255,135,0.3)]">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-space text-2xl sm:text-3xl font-bold text-white mb-3">
                  Message Sent Successfully!
                </h3>
                <p className="text-zinc-300 max-w-md mx-auto text-base mb-8 leading-relaxed">
                  Thank you for reaching out. Your message has been received.
                </p>
                <button
                  type="button"
                  onClick={() => setStatus('idle')}
                  className="px-7 py-3 rounded-full border border-[#00ff87]/40 bg-white/5 hover:bg-[#00ff87]/15 text-[#00ff87] hover:text-white font-space text-sm font-bold tracking-wide transition-all"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form id="contact-form" onSubmit={handleSubmit} noValidate className="space-y-6">
                {/* Honeypot field for spam bots */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="website-field">Website</label>
                  <input
                    id="website-field"
                    type="text"
                    name="website"
                    value={formData.website}
                    onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                {/* Name & Email Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block font-space text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2"
                    >
                      Your Name <span className="text-[#00ff87]">*</span>
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      placeholder="e.g. Alex Mercer"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, name: e.target.value }));
                        if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                      }}
                      className={`w-full px-4 py-3.5 rounded-xl bg-black/60 border ${
                        errors.name
                          ? 'border-red-500/80 focus:border-red-500'
                          : 'border-white/10 focus:border-[#00ff87]'
                      } text-white placeholder-zinc-500 text-sm font-normal focus:outline-none focus:ring-1 ${
                        errors.name ? 'focus:ring-red-500' : 'focus:ring-[#00ff87]'
                      } transition-all`}
                    />
                    {errors.name && (
                      <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1 font-mono" role="alert">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="contact-email"
                      className="block font-space text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2"
                    >
                      Your Email <span className="text-[#00ff87]">*</span>
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      placeholder="alex@example.com"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, email: e.target.value }));
                        if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                      }}
                      className={`w-full px-4 py-3.5 rounded-xl bg-black/60 border ${
                        errors.email
                          ? 'border-red-500/80 focus:border-red-500'
                          : 'border-white/10 focus:border-[#00ff87]'
                      } text-white placeholder-zinc-500 text-sm font-normal focus:outline-none focus:ring-1 ${
                        errors.email ? 'focus:ring-red-500' : 'focus:ring-[#00ff87]'
                      } transition-all`}
                    />
                    {errors.email && (
                      <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1 font-mono" role="alert">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {errors.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Company & Subject Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="contact-company"
                      className="block font-space text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2"
                    >
                      Company / Organization <span className="text-zinc-600 text-[10px]">(Optional)</span>
                    </label>
                    <input
                      id="contact-company"
                      type="text"
                      placeholder="e.g. Acme Tech"
                      value={formData.company}
                      onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))}
                      className="w-full px-4 py-3.5 rounded-xl bg-black/60 border border-white/10 text-white placeholder-zinc-500 text-sm font-normal focus:outline-none focus:border-[#00ff87] focus:ring-1 focus:ring-[#00ff87] transition-all"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-subject"
                      className="block font-space text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2"
                    >
                      Subject / Purpose <span className="text-zinc-500 normal-case tracking-normal">(Optional)</span>
                    </label>
                    <input
                      id="contact-subject"
                      type="text"
                      placeholder="e.g. Full-Stack Engineering Role"
                      value={formData.subject}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, subject: e.target.value }));
                        if (errors.subject) setErrors((prev) => ({ ...prev, subject: '' }));
                      }}
                      className={`w-full px-4 py-3.5 rounded-xl bg-black/60 border ${
                        errors.subject
                          ? 'border-red-500/80 focus:border-red-500'
                          : 'border-white/10 focus:border-[#00ff87]'
                      } text-white placeholder-zinc-500 text-sm font-normal focus:outline-none focus:ring-1 ${
                        errors.subject ? 'focus:ring-red-500' : 'focus:ring-[#00ff87]'
                      } transition-all`}
                    />
                    {errors.subject && (
                      <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1 font-mono" role="alert">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {errors.subject}
                      </p>
                    )}
                  </div>
                </div>

                {/* Message Field */}
                <div>
                  <label
                    htmlFor="contact-message"
                    className="block font-space text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2"
                  >
                    Your Message <span className="text-[#00ff87]">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    rows={5}
                    placeholder="Tell me about your project, timeline, or engineering opportunity..."
                    value={formData.message}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, message: e.target.value }));
                      if (errors.message) setErrors((prev) => ({ ...prev, message: '' }));
                    }}
                    className={`w-full px-4 py-3.5 rounded-xl bg-black/60 border ${
                      errors.message
                        ? 'border-red-500/80 focus:border-red-500'
                        : 'border-white/10 focus:border-[#00ff87]'
                    } text-white placeholder-zinc-500 text-sm font-normal focus:outline-none focus:ring-1 ${
                      errors.message ? 'focus:ring-red-500' : 'focus:ring-[#00ff87]'
                    } transition-all resize-none`}
                  />
                  {errors.message && (
                    <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1 font-mono" role="alert">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {errors.message}
                    </p>
                  )}
                </div>

                {/* Error Banner with Direct Fallback Link */}
                {status === 'error' && (
                  <div
                    className="p-4 rounded-xl border border-red-500/40 bg-red-950/40 text-red-200 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-up"
                    role="alert"
                  >
                    <div className="flex items-center gap-2.5">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                    <a
                      href={`mailto:ngoanhtuan23.it@gmail.com?subject=${encodeURIComponent(
                        formData.subject || 'Portfolio Inquiry'
                      )}&body=${encodeURIComponent(formData.message || '')}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#00ff87] underline hover:text-white transition-colors"
                    >
                      Send via Email Client &rarr;
                    </a>
                  </div>
                )}

                {/* Submit Row */}
                <div className="flex flex-col sm:flex-row items-center justify-between pt-2 gap-4">
                  <p className="text-xs text-zinc-400 font-mono">
                    All fields marked with <span className="text-[#00ff87]">*</span> are required.
                  </p>

                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    id="contact-submit-btn"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-9 py-4 rounded-full font-space font-bold text-sm tracking-wide text-black bg-[#00ff87] hover:bg-[#8bfbd0] active:scale-95 transition-all shadow-[0_0_24px_rgba(0,255,135,0.35)] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {status === 'submitting' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <span>SEND MESSAGE</span>
                        <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </ScrollReveal>

        {/* Social Connect: "CONNECT WITH ME" */}
        <ScrollReveal delay={280}>
          <div className="mt-14 text-center">
            <p className="text-xs font-mono font-semibold text-[#00ff87] uppercase tracking-widest mb-6">
              CONNECT WITH ME
            </p>
            <div className="flex items-center justify-center gap-4 sm:gap-6">
              {/* GitHub */}
              <a
                href="https://github.com/Tuandaca"
                target="_blank"
                rel="noopener noreferrer"
                id="contact-github-link"
                aria-label="GitHub Profile (Tuandaca)"
                className="group relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/[0.04] backdrop-blur-md border border-white/10 text-zinc-300 transition-all duration-300 ease-out overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87] focus-visible:ring-offset-2 focus-visible:ring-offset-[#010503] active:scale-95 hover:scale-110 hover:-rotate-6 hover:text-white hover:border-[#00ff87]/60 hover:bg-[#00ff87]/10 hover:shadow-[0_0_24px_rgba(0,255,135,0.35)]"
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-25deg]" />
                <svg className="w-5 h-5 sm:w-6 sm:h-6 fill-current transition-colors" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>

              {/* Facebook */}
              <a
                href="https://web.facebook.com/ngobongsu"
                target="_blank"
                rel="noopener noreferrer"
                id="contact-facebook-link"
                aria-label="Facebook Profile (ngobongsu)"
                className="group relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/[0.04] backdrop-blur-md border border-white/10 text-zinc-300 transition-all duration-300 ease-out overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87] focus-visible:ring-offset-2 focus-visible:ring-offset-[#010503] active:scale-95 hover:scale-110 hover:rotate-6 hover:text-[#1877F2] hover:border-[#1877F2]/60 hover:bg-[#1877F2]/10 hover:shadow-[0_0_24px_rgba(24,119,242,0.35)]"
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-25deg]" />
                <svg className="w-5 h-5 sm:w-6 sm:h-6 fill-current transition-colors" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="https://www.instagram.com/tuandaca23"
                target="_blank"
                rel="noopener noreferrer"
                id="contact-instagram-link"
                aria-label="Instagram Profile (tuandaca23)"
                className="group relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/[0.04] backdrop-blur-md border border-white/10 text-zinc-300 transition-all duration-300 ease-out overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87] focus-visible:ring-offset-2 focus-visible:ring-offset-[#010503] active:scale-95 hover:scale-110 hover:-rotate-6 hover:text-[#E4405F] hover:border-[#E4405F]/60 hover:bg-[#E4405F]/10 hover:shadow-[0_0_24px_rgba(228,64,95,0.35)]"
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-25deg]" />
                <svg className="w-5 h-5 sm:w-6 sm:h-6 fill-none stroke-current stroke-2 transition-colors" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
                id="contact-discord-link"
                aria-label="Discord Profile (903269942005235814)"
                className="group relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/[0.04] backdrop-blur-md border border-white/10 text-zinc-300 transition-all duration-300 ease-out overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87] focus-visible:ring-offset-2 focus-visible:ring-offset-[#010503] active:scale-95 hover:scale-110 hover:rotate-6 hover:text-[#5865F2] hover:border-[#5865F2]/60 hover:bg-[#5865F2]/10 hover:shadow-[0_0_24px_rgba(88,101,242,0.35)]"
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-25deg]" />
                <svg className="w-5 h-5 sm:w-6 sm:h-6 fill-current transition-colors" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>
            </div>
          </div>
        </ScrollReveal>

        {/* Direct Contact Info Row (Preserves contact-email-link and contact-phone-link for automated tests) */}
        <ScrollReveal delay={340}>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 mt-10 pt-6 border-t border-white/5 text-sm text-zinc-300 font-medium">
            <a
              href="mailto:ngoanhtuan23.it@gmail.com"
              id="contact-email-link"
              className="flex items-center gap-2 hover:text-[#00ff87] transition-colors"
            >
              <Mail className="w-4 h-4 text-[#00ff87]" /> ngoanhtuan23.it@gmail.com
            </a>
            <span className="text-zinc-700 hidden sm:inline">·</span>
            <a
              href="tel:+84917940833"
              id="contact-phone-link"
              className="flex items-center gap-2 hover:text-[#00ff87] transition-colors"
            >
              <Phone className="w-4 h-4 text-[#00ff87]" /> +84 917 940 833
            </a>
            <span className="text-zinc-700 hidden sm:inline">·</span>
            <span className="flex items-center gap-2 text-zinc-400">
              <MapPin className="w-4 h-4 text-[#00ff87]" /> Ho Chi Minh City, Vietnam
            </span>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
});

ContactSection.displayName = 'ContactSection';

export default ContactSection;
