import { useEffect, useRef, useState } from "react";
import { Bell, Brain, Calendar, TrendingUp, Shield, Zap,
         CheckCircle, Star, ArrowRight, Pill, Activity,
         Sparkles, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-medical.jpg";
import Login from "../../components/Login";
import "./Landing.css";

const STATS = [
  { value: "98%",  label: "Adherence Rate",    suffix: "" },
  { value: "10K+", label: "Active Users",       suffix: "" },
  { value: "2M+",  label: "Doses Tracked",      suffix: "" },
  { value: "4.9",  label: "App Store Rating",   suffix: "★" },
];

const FEATURES = [
  {
    icon: Brain,
    gradient: "from-violet-500 to-purple-600",
    glow: "rgba(139,92,246,0.35)",
    title: "Gemini AI Assistant",
    description: "Chat naturally to log doses, check schedules, and get personalized health insights powered by Google Gemini 2.5 Flash.",
    badge: "AI-Powered",
  },
  {
    icon: Bell,
    gradient: "from-pink-500 to-rose-500",
    glow: "rgba(236,72,153,0.35)",
    title: "Smart Reminders",
    description: "Firebase push notifications delivered at exactly the right time — even when your browser is closed.",
    badge: "Real-Time",
  },
  {
    icon: TrendingUp,
    gradient: "from-blue-500 to-indigo-600",
    glow: "rgba(99,102,241,0.35)",
    title: "Adherence Analytics",
    description: "Beautiful streak tracking and adherence dashboards so you can see your health journey at a glance.",
    badge: "Insights",
  },
  {
    icon: Calendar,
    gradient: "from-emerald-500 to-teal-500",
    glow: "rgba(16,185,129,0.35)",
    title: "Google Calendar Sync",
    description: "Every medication dose automatically appears in your Google Calendar. Never double-book a dose.",
    badge: "Sync",
  },
  {
    icon: Shield,
    gradient: "from-orange-500 to-amber-500",
    glow: "rgba(249,115,22,0.35)",
    title: "Offline-First PWA",
    description: "Mark doses taken even without internet. Background Sync replays them automatically when you reconnect.",
    badge: "Offline",
  },
  {
    icon: Zap,
    gradient: "from-cyan-500 to-sky-500",
    glow: "rgba(6,182,212,0.35)",
    title: "Real-Time Updates",
    description: "Socket.IO ensures every device shows the same live state — no refresh needed, ever.",
    badge: "Live",
  },
];

const TESTIMONIALS = [
  { name: "Priya S.",     role: "Diabetes patient",      text: "I went from 60% adherence to 97% in just one month. The AI reminders are incredible.", avatar: "P" },
  { name: "Rahul M.",     role: "Caregiver",             text: "Managing my mother's 8 medications used to be stressful. MediAlert made it effortless.", avatar: "R" },
  { name: "Dr. Ananya K.", role: "Cardiologist",         text: "I recommend MediAlert to all my patients. The adherence data it provides is invaluable.", avatar: "A" },
];

// Simple counter animation hook
function useCountUp(target, duration = 1500, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    const numeric = parseFloat(target.replace(/[^0-9.]/g, ""));
    if (isNaN(numeric)) { setCount(target); return; }
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * numeric;
      setCount(target.includes(".") ? current.toFixed(1) : Math.floor(current));
      if (progress < 1) requestAnimationFrame(step);
      else setCount(target.replace(/[0-9.]+/, numeric));
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return count;
}

function StatCard({ value, label, suffix, animate }) {
  const count = useCountUp(value, 1400, animate);
  return (
    <div className="landing-stat-card">
      <div className="landing-stat-value">{count}{suffix}</div>
      <div className="landing-stat-label">{label}</div>
    </div>
  );
}

const Landing = () => {
  const navigate = useNavigate();
  const statsRef = useRef(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Sticky nav shadow on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Trigger stat counter when stats section enters viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  // Reveal-on-scroll for sections
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("landing-visible");
      }),
      { threshold: 0.1 }
    );
    document.querySelectorAll(".landing-reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-root">

      {/* ── Ambient background blobs ─────────────────────────────────────── */}
      <div className="landing-blob landing-blob-1" />
      <div className="landing-blob landing-blob-2" />
      <div className="landing-blob landing-blob-3" />

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav className={`landing-nav ${scrolled ? "landing-nav-scrolled" : ""}`}>
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <div className="landing-logo-orb">
              <Pill size={18} color="#fff" />
            </div>
            <span className="landing-logo-text">MediAlert</span>
          </div>
          <div className="landing-nav-links">
            <a href="#features" className="landing-nav-link">Features</a>
            <a href="#stats" className="landing-nav-link">Impact</a>
            <Login />
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="landing-hero">
        {/* Pill chip */}
        <div className="landing-hero-chip">
          <Sparkles size={13} className="landing-chip-icon" />
          Powered by Google Gemini 2.5 Flash
        </div>

        <h1 className="landing-hero-h1">
          Your Medications.<br />
          <span className="landing-gradient-text">Tracked by AI.</span>
        </h1>

        <p className="landing-hero-sub">
          MediAlert combines intelligent scheduling, a conversational AI assistant,
          Google Calendar sync, and offline-first reliability — so you never miss a dose, ever.
        </p>

        {/* CTA buttons */}
        <div className="landing-hero-actions">
          <div className="landing-cta-primary-wrapper">
            <Login />
          </div>
          <button className="landing-cta-ghost" onClick={() => document.getElementById("features").scrollIntoView({ behavior: "smooth" })}>
            See features <ArrowRight size={16} />
          </button>
        </div>

        {/* Trust badges */}
        <div className="landing-hero-badges">
          {["✅ Free to use", "🔒 Clerk Auth", "📴 Works Offline", "🤖 Gemini AI"].map((b) => (
            <span key={b} className="landing-hero-badge">{b}</span>
          ))}
        </div>

        {/* Hero image */}
        <div className="landing-hero-image-wrapper">
          <div className="landing-hero-image-glow" />
          <img src={heroImage} alt="MediAlert dashboard" className="landing-hero-img" />
          {/* Floating stat cards */}
          <div className="landing-float-card landing-float-card-1">
            <CheckCircle size={14} color="#10b981" />
            <span>Dose taken ✓</span>
          </div>
          <div className="landing-float-card landing-float-card-2">
            <Activity size={14} color="#8b5cf6" />
            <span>98% this week</span>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="landing-scroll-hint">
          <ChevronDown size={20} className="landing-scroll-chevron" />
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <section className="landing-stats-section landing-reveal" id="stats" ref={statsRef}>
        <div className="landing-stats-inner">
          {STATS.map((s) => (
            <StatCard key={s.label} {...s} animate={statsVisible} />
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="landing-features-section landing-reveal" id="features">
        <div className="landing-section-label">
          <Zap size={13} /> What's inside
        </div>
        <h2 className="landing-section-h2">
          Everything you need.<br />Nothing you don't.
        </h2>
        <p className="landing-section-sub">
          Six powerful features working together to keep you medication-perfect.
        </p>

        <div className="landing-features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className={`landing-feature-card landing-reveal landing-reveal-delay-${i % 3}`}>
              <div className="landing-feature-top">
                <div
                  className={`landing-feature-icon bg-gradient-to-br ${f.gradient}`}
                  style={{ boxShadow: `0 8px 20px ${f.glow}` }}
                >
                  <f.icon size={20} color="#fff" />
                </div>
                <span className="landing-feature-badge">{f.badge}</span>
              </div>
              <h3 className="landing-feature-title">{f.title}</h3>
              <p className="landing-feature-desc">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="landing-how-section landing-reveal">
        <div className="landing-section-label">
          <CheckCircle size={13} /> Simple as 1-2-3
        </div>
        <h2 className="landing-section-h2">Get started in minutes</h2>
        <div className="landing-steps">
          {[
            { step: "01", title: "Sign in", desc: "One click with Google or email via Clerk — no forms, no friction." },
            { step: "02", title: "Add medications", desc: "Enter name, dosage, frequency, and timings. Takes 30 seconds." },
            { step: "03", title: "Let AI handle it", desc: "Sanji, your AI assistant, tracks doses, sends reminders, and syncs your calendar." },
          ].map((s) => (
            <div key={s.step} className="landing-step">
              <div className="landing-step-num">{s.step}</div>
              <h3 className="landing-step-title">{s.title}</h3>
              <p className="landing-step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <section className="landing-testimonials-section landing-reveal">
        <div className="landing-section-label">
          <Star size={13} /> Real users, real results
        </div>
        <h2 className="landing-section-h2">People love MediAlert</h2>
        <div className="landing-testimonials-grid">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="landing-testimonial-card">
              <div className="landing-testimonial-stars">{"★".repeat(5)}</div>
              <p className="landing-testimonial-text">"{t.text}"</p>
              <div className="landing-testimonial-author">
                <div className="landing-testimonial-avatar">{t.avatar}</div>
                <div>
                  <div className="landing-testimonial-name">{t.name}</div>
                  <div className="landing-testimonial-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="landing-final-cta landing-reveal">
        <div className="landing-cta-blob" />
        <div className="landing-section-label" style={{ color: "rgba(255,255,255,0.8)", borderColor: "rgba(255,255,255,0.2)" }}>
          <Sparkles size={13} /> Start for free
        </div>
        <h2 className="landing-cta-h2">
          Ready to take control<br />of your health?
        </h2>
        <p className="landing-cta-sub">
          Join thousands already using MediAlert. It's free, it's smart, and it works offline.
        </p>
        <div className="landing-cta-primary-wrapper">
          <Login />
        </div>
        <p className="landing-cta-fine">No credit card · No setup · Works on any device</p>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-logo">
            <div className="landing-logo-orb">
              <Pill size={16} color="#fff" />
            </div>
            <span className="landing-logo-text">MediAlert</span>
          </div>
          <p className="landing-footer-copy">Built by Team Spartan · Webster 2025 · MIT License</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
