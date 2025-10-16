import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const API_KEY = process.env.GROQ_API_KEY;

const SYSTEM = `You are a Spanish tutor for BEGINNERS who are native English speakers.
Always explain in ENGLISH. Keep answers concise and structured with bullets/tables when useful.
For single-word queries, include: meaning + part of speech; pronunciation; morphology; brief etymology; 2 short example sentences.
End with a 1-line "Try it:" prompt.`;

// If it's a single word, request a full analysis
function augmentQuestion(q) {
  const wordLike = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ-]+$/.test((q || "").trim());
  return wordLike
    ? `[WORD LOOKUP] Define and analyze the Spanish word: ${q.trim()}`
    : q;
}

const llm = new ChatGroq({
  apiKey: API_KEY,
  model: MODEL,
  temperature: 0.3,
  maxTokens: 220,
});

const prompt = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM],
  ["user", "{question}"],
]);

const chain = prompt.pipe(llm);

export async function handler(event) {
  if (!API_KEY) return { statusCode: 500, body: "Missing GROQ_API_KEY" };

  let question = "";
  if (event.httpMethod === "GET") {
    const url = new URL(event.rawUrl);
    question = (url.searchParams.get("q") || "").trim();
  } else if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      question = (body.question || "").trim();
    } catch {
      return { statusCode: 400, body: "Invalid JSON body" };
    }
  } else {
    return { statusCode: 405, body: "Method not allowed" };
  }

  if (!question) return { statusCode: 400, body: "Missing question" };

  try {
    const res = await chain.invoke({ question: augmentQuestion(question) });
    const answer = typeof res === "string" ? res : res?.content ?? "";
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answer }),
    };
  } catch (e) {
    return { statusCode: 502, body: String(e) };
  }
}
