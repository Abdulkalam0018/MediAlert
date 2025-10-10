import React, { useState } from "react";
import axios from "../../api/axiosInstance";
// ...existing code...
export default function AIHealthAssistant() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAsk = async (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setError("Please enter a question.");
      return;
    }
    setLoading(true);
    setError(null);
    setResponse("");

    // Use the backend URL you specified
    const fullUrl = "http://localhost:8000/api/v1/ai/chat";
    console.log("POST ->", fullUrl);

    try {
      const res = await axios.post(fullUrl, { query: trimmed });
      const aiAnswer = res?.data?.answer ?? res?.data?.response ?? JSON.stringify(res?.data);
      setResponse(aiAnswer);
    } catch (err) {
      console.error("AI query error:", err);
      setError("Failed to get response from server.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="ai-container">
      <h2>AI Health Assistant</h2>
      <p>Ask me anything about your medications and health schedule</p>
      <form onSubmit={handleAsk}>
        <input
          type="text"
          placeholder='Try asking "What do I take today?"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Asking..." : "Ask"}
        </button>
      </form>
      {error && <p className="ai-error">{error}</p>}
      {response && <p className="ai-response">{response}</p>}
    </div>
  );
}