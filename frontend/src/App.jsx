import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./index.css";

export default function App() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setAnswer("");

    try {
      const resp = await fetch("/.netlify/functions/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });

      const ct = resp.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const text = await resp.text();
        throw new Error(text || `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      if (!resp.ok)
        throw new Error(data?.error || data?.detail || "Request failed");
      setAnswer(data.answer || "");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <header>
        <h1>Spanish Professor</h1>
        <p className="subtitle">
          Beginner Spanish explained in English. Ask about words, grammar, or
          pronunciation.
          <br />
          <em>Examples:</em> “What does guapo mean?”, “How to pronounce Ñ?”,
          “What comes after nosotros?”
        </p>
      </header>

      <form className="search" onSubmit={onSubmit}>
        <input
          type="text"
          placeholder='Ask something like: "What does guapo mean?"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Thinking…" : "Ask"}
        </button>
      </form>

      {error && <div className="error">⚠️ {error}</div>}

      <section className="answer">
        {loading && <div className="skeleton" />}
        {!loading && answer && (
          <>
            <h2>Answer</h2>
            <div className="card markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {answer}
              </ReactMarkdown>
            </div>
          </>
        )}
      </section>

      <footer>
        <small>Powered by Groq · LLaMA 3</small>
      </footer>
    </div>
  );
}
