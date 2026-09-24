import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Sparkles,
  Mic,
  MicOff,
  Send,
  X,
  Maximize2,
  Trash2,
  Volume2,
  VolumeX,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Clock,
  Activity,
} from "lucide-react";
import { askAI } from "../../api/ai";
import "./AIHealthAssistant.css";

const STARTER_MESSAGE =
  "Hello! I am your MediAlert AI assistant. Ask about your schedule, check your adherence, or tell me you took, missed, or delayed a dose and I'll update it for you.";

const CATEGORY_CARDS = [
  {
    id: "schedule",
    title: "Today's Schedule",
    desc: "Check today's medicines & dose timings",
    icon: Calendar,
    color: "#6366f1",
    bgColor: "#e0e7ff",
    prompt: "What medicines do I take today?",
  },
  {
    id: "log_taken",
    title: "Log Taken Dose",
    desc: "Mark your recent dose as completed",
    icon: CheckCircle2,
    color: "#10b981",
    bgColor: "#d1fae5",
    prompt: "I took my scheduled dose just now",
  },
  {
    id: "adherence",
    title: "Adherence Report",
    desc: "View streaks & consistency rates",
    icon: TrendingUp,
    color: "#ec4899",
    bgColor: "#fce7f3",
    prompt: "How is my adherence this week?",
  },
  {
    id: "delayed",
    title: "Missed / Delayed Dose",
    desc: "Update a missed or delayed medication",
    icon: Clock,
    color: "#f59e0b",
    bgColor: "#fef3c7",
    prompt: "I missed my morning dose",
  },
];

const SUGGESTED_PROMPTS = [
  "What do I take today?",
  "How is my adherence this week?",
  "I took my Vitamin D",
  "I missed my evening dose",
  "What are my active medications?",
];

const formatTime = () => {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const createMessage = (role, text, source = null, action = null) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  text,
  source,
  action,
  time: formatTime(),
});

// Reusable Glowing Orb Component matching the visual mockup
function GlowingOrb({ size = "medium", isListening = false, isThinking = false }) {
  return (
    <div className="ai-orb-wrapper">
      <div className={`ai-orb-sphere ${size} ${isListening ? "ai-orb-listening" : ""}`}>
        <div className="ai-orb-glow-ring" />
        <div className="ai-orb-eyes">
          <span className="ai-orb-eye" />
          <span className="ai-orb-eye" />
        </div>
      </div>
    </div>
  );
}

export default function AIHealthAssistant() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([
    createMessage("assistant", STARTER_MESSAGE, "system"),
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isFullscreen) {
      scrollToBottom();
      // Auto focus input when opening full-screen
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isFullscreen, loading]);

  // Handle ESC key to exit full-screen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Lock background body scroll while chatbot overlay is open
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  // Speech Recognition (Web Speech API)
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setQuery(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start voice recognition:", err);
      }
    }
  };

  // Text to Speech playback
  const toggleSpeak = (messageId, text) => {
    if (!window.speechSynthesis) return;

    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  };

  const dispatchAction = (action) => {
    if (!action || action.type !== "track_status_updated") return;
    window.dispatchEvent(
      new CustomEvent("medialert:assistant-action", {
        detail: action,
      })
    );
  };

  const submitQuery = async (nextQuery) => {
    const trimmed = nextQuery.trim();
    if (!trimmed || loading) {
      if (!trimmed) {
        setError("Please enter a question.");
      }
      return;
    }

    // Automatically expand to full-screen when sending
    if (!isFullscreen) {
      setIsFullscreen(true);
    }

    setLoading(true);
    setError("");
    setMessages((current) => [...current, createMessage("user", trimmed)]);
    setQuery("");

    try {
      const response = await askAI(trimmed);
      const answer =
        response?.answer ??
        response?.response ??
        "I couldn't find a response for that request.";
      const source = response?.source || null;
      const action = response?.action || null;

      setMessages((current) => [
        ...current,
        createMessage("assistant", answer, source, action),
      ]);
      dispatchAction(action);
    } catch (err) {
      console.error("AI query error:", err);
      const message = "Failed to get response from the server.";
      setError(message);
      setMessages((current) => [
        ...current,
        createMessage("assistant", message, "system"),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAsk = async (event) => {
    event.preventDefault();
    await submitQuery(query);
  };

  const clearChat = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setMessages([createMessage("assistant", STARTER_MESSAGE, "system")]);
    setError("");
  };

  return (
    <>
      {/* =========================================================================
          1. DASHBOARD SIDEBAR CARD (Docked gracefully beside schedule)
          ========================================================================= */}
      <div
        className="ai-preview-card ai-sidebar-card"
        onClick={() => setIsFullscreen(true)}
        role="button"
        tabIndex={0}
        aria-label="Open AI Health Assistant full screen"
      >
        <div className="ai-preview-header">
          <div className="ai-preview-title-row">
            <GlowingOrb size="medium" />
            <div>
              <div className="ai-preview-badge">
                <Sparkles size={13} />
                <span>MediAlert AI</span>
              </div>
              <h2 className="ai-preview-h2">Health Assistant</h2>
              <p className="ai-preview-sub">
                Ask about doses or log medications
              </p>
            </div>
          </div>

          <button
            type="button"
            className="ai-expand-trigger-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsFullscreen(true);
            }}
            title="Expand to Full Screen"
          >
            <Maximize2 size={16} />
          </button>
        </div>

        {/* Quick prompt chips on the sidebar */}
        <div className="ai-preview-chips">
          {SUGGESTED_PROMPTS.slice(0, 4).map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="ai-preview-chip"
              onClick={(e) => {
                e.stopPropagation();
                setIsFullscreen(true);
                void submitQuery(prompt);
              }}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Interactive simulated input in sidebar */}
        <div className="ai-preview-fake-input">
          <span className="ai-preview-fake-text">
            Ask or say "Took my dose"...
          </span>
          <div className="ai-preview-fake-btn">
            <Send size={15} />
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. FULL SCREEN IMMERSIVE CHATBOT VIEW (Mounted to document.body via Portal)
          ========================================================================= */}
      {isFullscreen &&
        createPortal(
          <div className="ai-fullscreen-overlay fixed inset-0 z-[99999] w-screen h-screen h-[100dvh] bg-[#f8fafc] flex flex-col overflow-hidden">
          {/* Top Navigation Bar */}
          <header className="ai-fs-header">
            <button
              type="button"
              className="ai-fs-back-btn"
              onClick={() => setIsFullscreen(false)}
              title="Return to Dashboard (Esc)"
            >
              <ArrowLeft size={18} />
              <span>Back to Dashboard</span>
            </button>

            <div className="ai-fs-branding">
              <GlowingOrb size="small" />
              <div className="ai-fs-title-col">
                <h1>MediAlert AI Assistant</h1>
                <div className="ai-fs-status-tag">
                  <span className="ai-fs-status-dot" />
                  <span>Gemini 2.5 Active</span>
                </div>
              </div>
            </div>

            <div className="ai-fs-actions">
              <button
                type="button"
                className="ai-fs-icon-btn"
                onClick={clearChat}
                title="Clear conversation"
              >
                <Trash2 size={18} />
              </button>
              <button
                type="button"
                className="ai-fs-icon-btn"
                onClick={() => setIsFullscreen(false)}
                title="Minimize (Esc)"
              >
                <X size={20} />
              </button>
            </div>
          </header>

          {/* Main Chat Scroll Body */}
          <div className="ai-fs-body">
            {/* Hero Welcome View when conversation is minimal */}
            {messages.length <= 1 && (
              <div className="ai-fs-hero">
                <div className="ai-fs-speech-bubble">Hello! 👋</div>
                <GlowingOrb size="large" />
                <h2 className="ai-fs-hero-title">Ask MediAlert Anything</h2>
                <p className="ai-fs-hero-desc">
                  I can update your daily dose status, summarize adherence, and help
                  you never miss a prescription.
                </p>

                {/* Quick Category Action Cards */}
                <div className="ai-fs-cards-grid">
                  {CATEGORY_CARDS.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <div
                        key={item.id}
                        className="ai-fs-card"
                        onClick={() => void submitQuery(item.prompt)}
                      >
                        <div
                          className="ai-fs-card-icon"
                          style={{
                            background: item.bgColor,
                            color: item.color,
                          }}
                        >
                          <IconComponent size={22} />
                        </div>
                        <div>
                          <h3 className="ai-fs-card-title">{item.title}</h3>
                          <p className="ai-fs-card-desc">{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Chat Message Stream */}
            <div className="ai-fs-messages">
              {messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <div
                    key={message.id}
                    className={`ai-msg-row ${isUser ? "user" : "assistant"}`}
                  >
                    {!isUser && <GlowingOrb size="small" />}

                    <div className="ai-msg-content-wrapper">
                      <div className="ai-msg-meta">
                        <span className="ai-msg-sender">
                          {isUser ? "You" : "MediAlert AI"}
                        </span>
                        <span className="ai-msg-time">{message.time}</span>
                        {!isUser && message.source && (
                          <span className="ai-msg-badge">
                            {message.source === "gemini"
                              ? "Gemini AI"
                              : message.source === "local_action"
                              ? "Smart Action"
                              : "MediAlert"}
                          </span>
                        )}
                      </div>

                      <div className={`ai-msg-bubble ${isUser ? "user" : "assistant"}`}>
                        <p style={{ margin: 0 }}>{message.text}</p>

                        {/* Action feedback card if track status was updated */}
                        {message.action?.type === "track_status_updated" && (
                          <div className="ai-action-success-card">
                            <CheckCircle2 size={16} />
                            <span>Medication schedule updated in database</span>
                          </div>
                        )}
                      </div>

                      {/* Text-to-speech button for assistant answers */}
                      {!isUser && (
                        <div className="ai-msg-actions">
                          <button
                            type="button"
                            className="ai-msg-tts-btn"
                            onClick={() => toggleSpeak(message.id, message.text)}
                            title={
                              speakingMessageId === message.id
                                ? "Stop audio"
                                : "Listen to answer"
                            }
                          >
                            {speakingMessageId === message.id ? (
                              <>
                                <VolumeX size={14} /> Stop
                              </>
                            ) : (
                              <>
                                <Volume2 size={14} /> Listen
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Thinking / Loading Animation */}
              {loading && (
                <div className="ai-msg-row assistant">
                  <GlowingOrb size="small" isThinking />
                  <div className="ai-typing-indicator">
                    <span className="ai-typing-dot" />
                    <span className="ai-typing-dot" />
                    <span className="ai-typing-dot" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Floating Bottom Input & Quick Prompts Bar */}
          <footer className="ai-fs-footer">
            {/* Quick chips bar */}
            <div className="ai-fs-footer-chips">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="ai-fs-footer-chip"
                  onClick={() => void submitQuery(prompt)}
                  disabled={loading}
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Capsule */}
            <form onSubmit={handleAsk} className="ai-fs-input-capsule">
              <input
                ref={inputRef}
                type="text"
                className="ai-fs-text-input"
                placeholder={
                  isListening
                    ? "Listening... Speak your dose or question now..."
                    : 'Message MediAlert or tap mic to speak...'
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
              />

              {/* Microphone Voice Button */}
              <button
                type="button"
                className={`ai-fs-mic-btn ${isListening ? "active" : ""}`}
                onClick={toggleListening}
                title={isListening ? "Stop listening" : "Speak hands-free"}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              {/* Send Button */}
              <button
                type="submit"
                className="ai-fs-send-btn"
                disabled={loading || (!query.trim() && !isListening)}
                title="Send message"
              >
                <Send size={18} />
              </button>
            </form>

            {error && (
              <p style={{ color: "#ef4444", fontSize: "0.82rem", margin: "0.3rem 0 0" }}>
                {error}
              </p>
            )}

            <div className="ai-fs-disclaimer">
              MediAlert AI helps log and track medication routines. Always consult a healthcare professional for clinical advice.
            </div>
          </footer>
        </div>,
        document.body
      )}
    </>
  );
}
