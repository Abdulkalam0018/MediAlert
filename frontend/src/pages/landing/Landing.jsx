import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Bell, Brain, TrendingUp, Shield, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-medical.jpg";
import "./Landing.css"; // Import the CSS
import Dashboard from "../dashboard/DashBoard";
import Login from "../../components/Login";
const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Bell,
      title: "Smart Reminders",
      description:
        "Get timely notifications via browser alerts and email. Never forget a dose again.",
    },
    {
      icon: TrendingUp,
      title: "Adherence Tracking",
      description:
        "Visual dashboards show your medication adherence trends with beautiful charts.",
    },
    {
      icon: Brain,
      title: "AI Health Assistant",
      description:
        "Ask natural questions and get instant, intelligent answers about your medications.",
    },
    {
      icon: Calendar,
      title: "Calendar Integration",
      description:
        "Automatically sync your medication schedule with Google Calendar for seamless planning.",
    },
    {
      icon: Shield,
      title: "Predictive Insights",
      description:
        "AI detects risky patterns and sends proactive nudges to improve your adherence.",
    },
    {
      icon: Zap,
      title: "Real-Time Updates",
      description:
        "Instant sync across all your devices. Your medication log is always up to date.",
    },
  ];

  return (
    <div className="index-container">
      {/* Navigation */}
      <nav className="nav-bar">
        <div className="nav-container">
          <div className="nav-logo">
            <div className="logo-icon">
              <Bell className="icon" />
            </div>
            <h1>MediAlert</h1>
          </div>
          <div className="nav-links">
            <Button
              variant="ghost"
              onClick={() => navigate("/Dashboard")}
              className="nav-link"
            >
              Features
            </Button>

            <div className="login-wrapper">
              <Login />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-gradient" />
        <div className="hero-container">
          <div className="hero-text">
            <h2>Never Miss a Dose</h2>
            <p>
              MediAlert uses smart reminders, AI predictions, and calendar sync
              to help you maintain perfect medication adherence.
            </p>
            <div className="login-wrapper">
              <Login />
            </div>
            <div className="hero-badges">
              <div>
                <span className="badge-dot" />
                Free forever plan
              </div>
            </div>
          </div>
          <div className="hero-image">
            <img src={heroImage} alt="MediAlert Dashboard" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-header">
          <h2>Everything You Need to Stay Healthy</h2>
          <p>
            Powerful features designed to make medication management effortless
            and effective.
          </p>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <Card key={index} className="feature-card">
              <div className="feature-icon">
                <feature.icon className="icon" />
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <h2>Ready to Never Miss A Dose Again?</h2>
          <p>
            Join thousands of users who've improved their medication adherence
            with MediAlert's smart tracking system.
          </p>
          <div className="login-wrapper">
            <Login />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-bottom">
          <p>Made with ❤️ for Webster 2025</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
