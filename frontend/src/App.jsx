import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";
export default function App() {
  // --- state ---
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- theme (light / dark) ---
  const [mode, setMode] = useState(() => {
    const saved =
      typeof window !== "undefined" ? localStorage.getItem("theme-mode") : null;
    if (saved) return saved;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: light)").matches
    ) {
      return "light";
    }
    return "dark";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("theme-mode", mode);
      document.documentElement.setAttribute("data-theme", mode);
    }
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
          <span className="logo">📘</span>
          <span className="brand-text">Spanish Professor</span>
        </div>
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setMode((m) => (m === "dark" ? "light" : "dark"))}
          aria-label="Toggle theme"
        >
          {mode === "dark" ? "☀️" : "🌙"}
        </button>
      </header>

      <main className="shell">
        <div className="hero">
          <h1 className="title">Learn Spanish the friendly way</h1>
          <p className="subtitle">
            Beginner Spanish explained in English. Ask about words, grammar, or
            pronunciation.
          </p>
        </div>

        {/* examples */}
        <div className="chips-wrap">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              className="chip"
              onClick={() => setQuery(ex)}
            >
              {ex}
            </button>
          ))}
        </div>

        {/* search */}
        <div className="search-container">
          <div className="search-box">
            <span className="search-icon">💬</span>
            <input
              type="text"
              placeholder='Ask something like: "What does guapo mean?"'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !loading && query.trim() && onSubmit(e)
              }
            />
          </div>
          <button
            className="ask-btn"
            onClick={onSubmit}
            disabled={loading || !query.trim()}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Thinking…
              </>
            ) : (
              <>
                <span className="sparkle">✨</span> Ask
              </>
            )}
          </button>
        </div>

        {/* error */}
        {error && (
          <div className="alert error">
            <span className="alert-icon">⚠️</span>
            <div className="alert-content">
              <strong>Error</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* loading skeleton */}
        {loading && (
          <div className="card skeleton-card">
            <div className="skeleton-header">
              <div className="sk sk-badge"></div>
              <div className="sk sk-title"></div>
            </div>
            <div className="divider"></div>
            <div className="sk sk-line"></div>
            <div className="sk sk-line"></div>
            <div className="sk sk-line short"></div>
          </div>
        )}

        {/* answer */}
        {!loading && answer && (
          <section className="card">
            <div className="card-header">
              <div className="card-badge">📚</div>
              <h2>Answer</h2>
            </div>
            <div className="divider"></div>
            <div className="answer-content markdown-body answer">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {answer}
              </ReactMarkdown>
            </div>
          </section>
        )}

        {/* empty state */}
        {!loading && !answer && !error && (
          <div className="empty-state">
            <div className="empty-icon">💭</div>
            <p className="hint">
              Type your question above or click an example to get started!
            </p>
          </div>
        )}

        <footer className="footer">
          <small>Powered by Groq · LLaMA 3</small>
        </footer>
      </main>
    </div>
  );
}
