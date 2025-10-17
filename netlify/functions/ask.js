// netlify/functions/ask.js
import { ChatGroq } from "@langchain/groq";
import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { createToolCallingAgent, AgentExecutor } from "langchain/agents";
import { SYSTEM_RULES } from "./utils";

// --- env ---
const API_KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
if (!API_KEY) {
  throw new Error("Missing GROQ_API_KEY");
}

// --- tiny helper tools (optional) ---
// Keep them simple and deterministic. The model decides when to call them.
const numberToSpanishTool = new DynamicStructuredTool({
  name: "number_to_spanish",
  description:
    "Convert an integer 0–9999 into Spanish words and return pieces for a small table.",
  schema: z.object({ n: z.number().int().min(0).max(9999) }),
  func: async ({ n }) => {
    // Very small converter for demo; extend as needed.
    const units = [
      "cero",
      "uno",
      "dos",
      "tres",
      "cuatro",
      "cinco",
      "seis",
      "siete",
      "ocho",
      "nueve",
    ];
    const tens = [
      "",
      "diez",
      "veinte",
      "treinta",
      "cuarenta",
      "cincuenta",
      "sesenta",
      "setenta",
      "ochenta",
      "noventa",
    ];
    const teens = {
      11: "once",
      12: "doce",
      13: "trece",
      14: "catorce",
      15: "quince",
      16: "dieciséis",
      17: "diecisiete",
      18: "dieciocho",
      19: "diecinueve",
    };
    const hundreds = [
      "",
      "ciento",
      "doscientos",
      "trescientos",
      "cuatrocientos",
      "quinientos",
      "seiscientos",
      "setecientos",
      "ochocientos",
      "novecientos",
    ];

    if (n === 100)
      return JSON.stringify({
        spanish: "cien",
        parts: [{ part: "cien", meaning: "one hundred" }],
      });
    if (n < 10)
      return JSON.stringify({
        spanish: units[n],
        parts: [{ part: units[n], meaning: "unit" }],
      });
    if (n > 10 && n < 20)
      return JSON.stringify({
        spanish: teens[n],
        parts: [{ part: teens[n], meaning: "11–19" }],
      });

    const parts = [];
    let remaining = n;
    let words = [];

    // thousands
    if (remaining >= 1000) {
      const k = Math.floor(remaining / 1000);
      words.push(k === 1 ? "mil" : `${units[k]} mil`);
      parts.push({
        part: k === 1 ? "mil" : `${units[k]} mil`,
        meaning: "thousand",
      });
      remaining %= 1000;
    }
    // hundreds
    if (remaining >= 100) {
      const h = Math.floor(remaining / 100);
      words.push(hundreds[h]);
      parts.push({ part: hundreds[h], meaning: "hundreds" });
      remaining %= 100;
    }
    // tens and units
    if (remaining >= 20) {
      const t = Math.floor(remaining / 10);
      const u = remaining % 10;
      if (t === 2 && u > 0) {
        // veintiuno, veintidós...
        const w =
          u === 1
            ? "veintiún"
            : `veinti${u === 2 ? "dós" : u === 3 ? "trés" : units[u]}`;
        words.push(w.replace("uno", "un"));
        parts.push({ part: w, meaning: "twenties merged form" });
      } else {
        words.push(u ? `${tens[t]} y ${units[u]}` : tens[t]);
        parts.push({ part: tens[t], meaning: "tens" });
        if (u) parts.push({ part: units[u], meaning: "unit" });
      }
      remaining = 0;
    } else if (remaining > 0) {
      // 10, 11–19 already handled
      words.push(remaining === 10 ? "diez" : units[remaining]);
      parts.push({ part: words[words.length - 1], meaning: "unit/ten" });
      remaining = 0;
    }

    return JSON.stringify({
      spanish: words.join(" ").replaceAll("  ", " ").trim(),
      parts,
    });
  },
});

// You can register more tools here:
const tools = [numberToSpanishTool];

// --- model ---
const llm = new ChatGroq({
  apiKey: API_KEY,
  model: MODEL,
  temperature: 0.3,
  maxTokens: 800,
});

// --- SYSTEM prompt (kept short; your long pedagogy prompt also works) ---
const SYSTEM = SYSTEM_RULES;

// ---- IMPORTANT: prompt MUST include agent_scratchpad ----
const prompt = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM],
  // optional chat history placeholder (keep if you plan to pass it)
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
  // ⬇️ This is required for tool-using agents:
  new MessagesPlaceholder("agent_scratchpad"),
]);

// Build agent + executor once (module scope is cached by Netlify)
const agent = await createToolCallingAgent({
  llm,
  tools,
  prompt,
});

const executor = new AgentExecutor({
  agent,
  tools,
  // helpful for debugging:
  // returnIntermediateSteps: true,
});

// ---- Netlify handler ----
export default async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Use POST" }), {
        status: 405,
        headers: { "content-type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const question = (body?.question || "").trim();
    if (!question) {
      return new Response(JSON.stringify({ error: "Missing question" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // You can pass chat_history if you maintain it in session; empty for now.
    const res = await executor.invoke({ input: question, chat_history: [] });

    return new Response(JSON.stringify({ answer: res.output || "" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err?.message || "Agent failed" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
};
