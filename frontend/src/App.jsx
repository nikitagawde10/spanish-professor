import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./app.css";

export default function App() {
  // --- state ---
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- theme (light / dark) ---
  const prefersLight =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: light)").matches;

  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem("theme-mode");
    return saved || (prefersLight ? "light" : "dark");
  });

  useEffect(() => {
    localStorage.setItem("theme-mode", mode);
    document.documentElement.setAttribute("data-theme", mode);
  }, [mode]);

  // --- examples ---
  const examples = useMemo(
    () => [
      'What does "guapo" mean?',
      "How to pronounce Ñ?",
      "What comes after nosotros?",
      "Break down the word arquitecto",
      "Give 3 sentences using este/esta",
    ],
    []
  );

  // --- submit ---
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
    <div className="app">
      {/* top bar */}
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden>
            📘
          </span>
          <span className="brand-text">Spanish Professor</span>
        </div>
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setMode((m) => (m === "dark" ? "light" : "dark"))}
          aria-label="Toggle theme"
          title="Toggle light/dark"
        >
          {mode === "dark" ? "🌞" : "🌙"}
        </button>
      </header>

      <main className="shell">
        <h1 className="title">Learn Spanish the friendly way</h1>
        <p className="subtitle">
          Beginner Spanish explained in English. Ask about words, grammar, or
          pronunciation.
        </p>

        {/* examples */}
        <div className="chips-wrap" role="list">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              className="chip"
              onClick={() => setQuery(ex)}
              role="listitem"
            >
              {ex}
            </button>
          ))}
        </div>

        {/* search */}
        <form className="search" onSubmit={onSubmit}>
          <div className="search-box">
            <span className="search-icon" aria-hidden>
              💬
            </span>
            <input
              type="text"
              placeholder='Ask something like: "What does guapo mean?"'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Ask a Spanish question"
            />
          </div>
          <button
            className="ask-btn"
            type="submit"
            disabled={loading || !query.trim()}
          >
            {loading ? (
              "Thinking…"
            ) : (
              <>
                <span aria-hidden>✨</span> Ask
              </>
            )}
          </button>
        </form>

        {/* error */}
        {error && (
          <div className="alert error" role="alert">
            ⚠️ {error}
          </div>
        )}

        {/* loading skeleton */}
        {loading && (
          <div className="card">
            <div className="sk sk-title" />
            <div className="divider" />
            <div className="sk sk-line" />
            <div className="sk sk-line" />
            <div className="sk sk-line short" />
          </div>
        )}

        {/* answer */}
        {!loading && answer && (
          <section className="card">
            <div className="card-head">
              <div className="card-badge">📚</div>
              <h2>Answer</h2>
            </div>
            <div className="divider" />
            <div className="markdown-body answer">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {answer}
              </ReactMarkdown>
            </div>
          </section>
        )}

        {/* empty state */}
        {!loading && !answer && !error && (
          <p className="hint">
            Type your question above or click an example to get started!
          </p>
        )}

        <footer className="footer">
          <small>Powered by Groq · LLaMA 3</small>
        </footer>
      </main>
    </div>
  );
}
