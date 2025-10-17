import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { SYSTEM_RULES } from "./utils";

const MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const API_KEY = process.env.GROQ_API_KEY;
const API_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM = SYSTEM_RULES;

function categorize(q) {
  const s = q.toLowerCase().trim();
  if (
    /pronoun|nosotr|vosotr|pronouns?|subject|conjugat|tense|ser|estar/.test(s)
  )
    return "[GRAMMAR]";
  if (/pronounce|how to pronounce|pronunciación|ñ|ll|rr|vowel|sound/.test(s))
    return "[PRONUNCIATION]";
  if (/^\d+$/.test(s) || /\bnumber\b|\bsay\b.*\d/.test(s)) return "[NUMBER]";
  if (/break down|etymol|origin|morpholog|prefix|suffix/.test(s))
    return "[WORD LOOKUP]";
  if (s.split(/\s+/).length === 1) return "[WORD LOOKUP]";
  return "[GENERAL]";
}

function augmentQuestion(q) {
  const tag = categorize(q);
  switch (tag) {
    case "[GRAMMAR]":
      return `${tag} Explain clearly for beginners and include tidy tables.\nQuestion: ${q}`;
    case "[PRONUNCIATION]":
      return `${tag} Include mouth/tongue steps and a minimal pairs table.\nQuestion: ${q}`;
    case "[NUMBER]":
      return `${tag} Break number into parts with a table and show how to say it.\nQuestion: ${q}`;
    case "[WORD LOOKUP]":
      return `${tag} Analyze the single word thoroughly with sections and a small facts table.\nWord: ${q}`;
    default:
      return q;
  }
}

export default async (req) => {
  try {
    if (!API_KEY) {
      return new Response(JSON.stringify({ error: "Missing GROQ_API_KEY" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    // GET / POST support
    let question = "";
    if (req.method === "GET") {
      const url = new URL(req.url);
      question = (url.searchParams.get("q") || "").trim();
    } else if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      question = (body?.question || "").trim();
    }

    if (!question) {
      return new Response(JSON.stringify({ error: "Missing question" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const payload = {
      model: MODEL,
      stream: false,
      temperature: 0.3,
      max_tokens: 900, // enough for tables + examples
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: augmentQuestion(question) },
      ],
    };

    const r = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: `Groq error: ${r.status}`, detail: errText }),
        { status: 502, headers: { "content-type": "application/json" } }
      );
    }

    const data = await r.json();
    const answer =
      data?.choices?.[0]?.message?.content?.trim() || "Sorry, no answer.";

    return new Response(JSON.stringify({ answer }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: "Server error",
        detail: String(e?.message || e),
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
};
