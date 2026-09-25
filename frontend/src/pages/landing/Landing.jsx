import { useEffect, useState } from "react";
import { Brain, Calendar, TrendingUp, Shield, Zap,
         CheckCircle, ArrowRight, Pill, Activity,
         Sparkles, ChevronDown } from "lucide-react";
import heroImage from "@/assets/hero-medical.jpg";
import Login from "../../components/Login";
import "./Landing.css";

const FEATURES = [
  {
    icon: Brain,
    glow: "rgba(139,92,246,0.35)",
    iconBg: "linear-gradient(135deg,#8b5cf6,#7c3aed)",
    title: "Gemini AI Assistant",
    description: "Chat naturally to log doses, check schedules, and get personalized health insights.",
    badge: "AI-Powered",
  },
  {
    icon: TrendingUp,
    glow: "rgba(99,102,241,0.35)",
    iconBg: "linear-gradient(135deg,#6366f1,#4f46e5)",
    title: "Adherence Analytics",
    description: "Streak tracking and adherence dashboards so you always know where you stand.",
    badge: "Insights",
  },
  {
    icon: Calendar,
    glow: "rgba(16,185,129,0.35)",
    iconBg: "linear-gradient(135deg,#10b981,#059669)",
    title: "Google Calendar Sync",
    description: "Every dose automatically syncs to Google Calendar. Zero manual entry.",
    badge: "Sync",
  },
  {
    icon: Shield,
    glow: "rgba(249,115,22,0.35)",
    iconBg: "linear-gradient(135deg,#f97316,#ea580c)",
    title: "Offline-First PWA",
    description: "Mark doses without internet. Background Sync replays them when you reconnect.",
    badge: "Offline",
  },
  {
    icon: Zap,
    glow: "rgba(6,182,212,0.35)",
    iconBg: "linear-gradient(135deg,#06b6d4,#0284c7)",
    title: "Real-Time Updates",
    description: "Socket.IO keeps every device in sync — no refresh, ever.",
    badge: "Live",
  },
  {
    icon: CheckCircle,
    glow: "rgba(236,72,153,0.35)",
    iconBg: "linear-gradient(135deg,#ec4899,#be185d)",
    title: "Smart Reminders",
    description: "Firebase push notifications at the right time — even when the browser is closed.",
    badge: "Real-Time",
  },
];

const Landing = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("landing-visible");
      }),
      { threshold: 0.08 }
    );
    document.querySelectorAll(".landing-reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-root">
      <div className="landing-blob landing-blob-1" />
      <div className="landing-blob landing-blob-2" />

      {/* ── Nav ── */}
      <nav className={`landing-nav ${scrolled ? "landing-nav-scrolled" : ""}`}>
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <div className="landing-logo-orb"><Pill size={17} color="#fff" /></div>
            <span className="landing-logo-text">MediAlert</span>
          </div>
          <div className="landing-nav-links">
            <a href="#features" className="landing-nav-link">Features</a>
            <Login />
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero-chip">
          <Sparkles size={13} className="landing-chip-icon" />
          Powered by Google Gemini 2.5 Flash
        </div>

        <h1 className="landing-hero-h1">
          Your Medications.<br />
          <span className="landing-gradient-text">Tracked by AI.</span>
        </h1>

        <p className="landing-hero-sub">
          Intelligent scheduling, an AI health assistant, Google Calendar sync,
          and offline-first reliability — so you never miss a dose.
        </p>

        <div className="landing-hero-actions">
          <div className="landing-cta-primary-wrapper"><Login /></div>
          <button
            className="landing-cta-ghost"
            onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
          >
            See features <ArrowRight size={15} />
          </button>
        </div>

        <div className="landing-hero-badges">
          {["✅ Free", "🔒 Secure Auth", "📴 Works Offline", "🤖 Gemini AI"].map((b) => (
            <span key={b} className="landing-hero-badge">{b}</span>
          ))}
        </div>

        <div className="landing-hero-image-wrapper">
          <div className="landing-hero-image-glow" />
          <img src={heroImage} alt="MediAlert dashboard" className="landing-hero-img" />
          <div className="landing-float-card landing-float-card-1">
            <CheckCircle size={13} color="#10b981" />
            <span>Dose taken ✓</span>
          </div>
          <div className="landing-float-card landing-float-card-2">
            <Activity size={13} color="#8b5cf6" />
            <span>98% this week</span>
          </div>
        </div>

        <div className="landing-scroll-hint">
          <ChevronDown size={20} />
        </div>
      </section>

      {/* ── Features ── */}
      <section className="landing-features-section landing-reveal" id="features">
        <div className="landing-section-label"><Zap size={13} /> What's inside</div>
        <h2 className="landing-section-h2">Everything you need. Nothing you don't.</h2>
        <div className="landing-features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className={`landing-feature-card landing-reveal landing-reveal-delay-${i % 3}`}>
              <div className="landing-feature-top">
                <div
                  className="landing-feature-icon"
                  style={{ background: f.iconBg, boxShadow: `0 8px 20px ${f.glow}` }}
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

      {/* ── CTA ── */}
      <section className="landing-final-cta landing-reveal">
        <div className="landing-cta-blob" />
        <div className="landing-section-label" style={{ color: "rgba(255,255,255,0.85)", borderColor: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.12)" }}>
          <Sparkles size={13} /> Start for free
        </div>
        <h2 className="landing-cta-h2">Ready to take control<br />of your health?</h2>
        <p className="landing-cta-sub">Free, smart, and works offline. No credit card needed.</p>
        <div className="landing-cta-primary-wrapper"><Login /></div>
        <p className="landing-cta-fine">No setup · Works on any device · Offline-first</p>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-logo">
            <div className="landing-logo-orb"><Pill size={15} color="#fff" /></div>
            <span className="landing-logo-text">MediAlert</span>
          </div>
          <p className="landing-footer-copy">Built by Team Spartan · Webster 2025 · MIT License</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
