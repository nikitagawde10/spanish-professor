import { z } from "zod";
import { ChatGroq } from "@langchain/groq";
import { TavilySearch } from "@langchain/tavily";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createToolCallingAgent, AgentExecutor } from "langchain/agents";
import { SYSTEM_RULES } from "./system_rules";
import { ENDINGS, IRREGULARS, PERSONS, REPS } from "./grammar_rules";

// ───────────────────────────────────────────────────────────────────────────────
// Tiny helpers
// ───────────────────────────────────────────────────────────────────────────────
function conjugateSpanish(verb, tense = "present") {
  const v = (verb || "").toLowerCase().trim();
  if (!v) return { note: "No verb provided." };

  const persons = PERSONS;

  // minimal irregulars (extend as needed)
  const irregular = IRREGULARS;
  const t = (tense || "present").toLowerCase();
  if (irregular[v]?.[t]) {
    return {
      verb: v,
      tense: t,
      rows: persons.map((p, i) => [p, irregular[v][t][i]]),
    };
  }

  // regular patterns
  let stem = v,
    group = null;
  if (v.endsWith("ar")) {
    stem = v.slice(0, -2);
    group = "ar";
  } else if (v.endsWith("er")) {
    stem = v.slice(0, -2);
    group = "er";
  } else if (v.endsWith("ir")) {
    stem = v.slice(0, -2);
    group = "ir";
  } else
    return {
      note: "Only infinitives ending in -ar/-er/-ir are supported for regular patterns.",
    };

  const endings = ENDINGS;

  const set = endings[t]?.[group];
  if (!set)
    return {
      note: `Tense "${tense}" not supported. Try "present" or "preterite".`,
    };

  const forms = set.map((e) => stem + e);
  return { verb: v, tense: t, rows: persons.map((p, i) => [p, forms[i]]) };
}

// “IPA-ish” (approximate) mapping for Spanish. Not perfect; good for beginners.
function spanishToIPA(word) {
  if (!word) return { ipa: "", note: "No word provided." };
  let w = word
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  // crude grapheme mapping
  const reps = REPS;
  for (const [re, out] of reps) w = w.replace(re, out);

  // vowels
  w = w
    .replace(/a/g, "a")
    .replace(/e/g, "e")
    .replace(/i/g, "i")
    .replace(/o/g, "o")
    .replace(/u/g, "u");
  return {
    ipa: `/${w}/`,
    note: "Approximate IPA (no stress mark; ES default)",
  };
}

// ───────────────────────────────────────────────────────────────────────────────
// LangChain tools
// ───────────────────────────────────────────────────────────────────────────────
const ConjugationTool = new DynamicStructuredTool({
  name: "conjugation_table",
  description:
    "Create a Spanish conjugation table. Use for requests like 'conjugate hablar in preterite' or 'present tense of ser'. Returns Markdown table.",
  schema: z.object({
    verb: z.string().describe("Spanish infinitive, e.g., 'hablar'"),
    tense: z.enum(["present", "preterite"]).default("present"),
  }),
  func: async ({ verb, tense }) => {
    const t = conjugateSpanish(verb, tense);
    if (t.note) return JSON.stringify(t);
    const header = `| Person | ${t.verb} (${t.tense}) |\n|---|---|`;
    const rows = t.rows.map(([p, f]) => `| ${p} | **${f}** |`).join("\n");
    return `${header}\n${rows}`;
  },
});

const IPAHelperTool = new DynamicStructuredTool({
  name: "ipa_helper",
  description:
    "Return an approximate Spanish IPA transcription of a single word.",
  schema: z.object({ word: z.string().describe("Spanish word") }),
  func: async ({ word }) => {
    const { ipa, note } = spanishToIPA(word);
    return note ? `${ipa} (${note})` : ipa;
  },
});

const TavilyTool = new TavilySearch({
  apiKey: process.env.TAVILY_API_KEY, // set in env
  maxResults: 3,
});

// ───────────────────────────────────────────────────────────────────────────────
// System prompt
// ───────────────────────────────────────────────────────────────────────────────
const SYSTEM = SYSTEM_RULES;

// ───────────────────────────────────────────────────────────────────────────────
// Lazy init agent (cached across invocations)
// ───────────────────────────────────────────────────────────────────────────────
let executorPromise;

async function getExecutor() {
  if (executorPromise) return executorPromise;

  const llm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    temperature: 0.25,
    maxTokens: 900,
  });

  const tools = [ConjugationTool, IPAHelperTool, TavilyTool];

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", SYSTEM],
    ["human", "{input}"],
    ["placeholder", "{agent_scratchpad}"],
  ]);

  const agent = await createToolCallingAgent({ llm, tools, prompt });
  const executor = new AgentExecutor({ agent, tools, verbose: false });

  executorPromise = Promise.resolve(executor);
  return executor;
}

// ───────────────────────────────────────────────────────────────────────────────
// Netlify handler
// ───────────────────────────────────────────────────────────────────────────────
export default async (req) => {
  try {
    if (req.method !== "POST" && req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Use POST or GET" }), {
        status: 405,
        headers: { "content-type": "application/json" },
      });
    }

    if (!process.env.GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing GROQ_API_KEY" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
    if (!process.env.TAVILY_API_KEY) {
      // We allow missing Tavily but warn in response; agent will just not use web search.
      console.warn("TAVILY_API_KEY not set — Tavily tool may fail if called.");
    }

    // Read question from body or query
    let question = "";
    if (req.method === "GET") {
      const url = new URL(req.url);
      question = (url.searchParams.get("q") || "").trim();
    } else {
      const body = await req.json().catch(() => ({}));
      question = (body?.question || "").trim();
    }

    if (!question) {
      return new Response(JSON.stringify({ error: "Missing question" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const executor = await getExecutor();
    const result = await executor.invoke({ input: question });

    return new Response(JSON.stringify({ answer: result?.output ?? "" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err?.message || "Agent error" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
};
