import React, { useState } from "react";

export default function AIHealthAssistant() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");

  const handleAsk = (e) => {
    e.preventDefault();
    setResponse(`(AI Placeholder) You asked: "${query}"`);
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
        <button type="submit">Ask</button>
      </form>
      {response && <p className="ai-response">{response}</p>}
    </div>
  );
}
