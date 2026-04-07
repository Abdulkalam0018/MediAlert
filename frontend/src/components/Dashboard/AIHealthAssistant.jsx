import { useState } from "react";
import { askAI } from "../../api/ai";

const STARTER_MESSAGE =
  "Ask about today's schedule, your adherence, or tell me you took, missed, or delayed a dose and I'll update it.";

const SUGGESTED_PROMPTS = [
  "What do I take today?",
  "How is my adherence this week?",
  "I took my Vitamin D",
  "I missed my evening dose",
];

const createMessage = (role, text, source = null) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  text,
  source,
});

export default function AIHealthAssistant() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([
    createMessage("assistant", STARTER_MESSAGE, "system"),
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

      setMessages((current) => [
        ...current,
        { ...createMessage("assistant", answer), source },
      ]);
      dispatchAction(response?.action);
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

  return (
    <div className="ai-container">
      <div className="ai-header">
        <h2>AI Health Assistant</h2>
        <p className="ai-subtitle">
          Ask about your schedule, progress, or log a dose in plain language.
        </p>
      </div>

      <div className="ai-suggestions">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="ai-chip"
            onClick={() => {
              void submitQuery(prompt);
            }}
            disabled={loading}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="ai-chat-log" aria-live="polite">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`ai-bubble ${message.role === "user" ? "user" : "assistant"}`}
          >
            <span className="ai-role">
              {message.role === "user" ? "You" : "Assistant"}
            </span>
            {message.role === "assistant" && message.source ? (
              <span className={`ai-source ai-source-${message.source}`}>
                {message.source === "gemini"
                  ? "Gemini"
                  : message.source === "local_fallback"
                    ? "Local fallback"
                    : message.source === "system"
                      ? "System"
                    : "Local action"}
              </span>
            ) : null}
            <p>{message.text}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleAsk} className="ai-form">
        <div className="ai-input-row">
          <input
            type="text"
            placeholder='Try "I took my calcium tablet at 9am"'
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Working..." : "Send"}
          </button>
        </div>
        {error && <p className="ai-error">{error}</p>}
      </form>
    </div>
  );
}
