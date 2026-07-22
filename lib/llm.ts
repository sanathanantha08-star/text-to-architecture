import {
  DiagramSpecSchema,
  formatZodError,
  type DiagramSpec,
} from "./schema";
import { SAMPLE_SPEC } from "./sampleGraph";

// Cohere v2 chat API (OpenAI-style messages, supports forced JSON output).
const COHERE_URL = "https://api.cohere.com/v2/chat";

const ALLOW_LIST = [
  "cloudfront",
  "alb",
  "nlb",
  "ec2",
  "ecs",
  "eks",
  "lambda",
  "s3",
  "rds",
  "dynamodb",
  "apigateway",
  "sqs",
  "sns",
  "vpc",
  "subnet",
  "bedrock",
  "cognito",
  "cloudwatch",
  "iam",
  "route53",
  "generic",
];

export const SYSTEM_PROMPT = `You are a senior AWS cloud solutions architect. You convert a natural-language description of a system into a STRICT JSON object describing an AWS architecture diagram, and you output NOTHING else.

OUTPUT RULES (critical):
- Output raw JSON only. No prose, no explanation, no markdown code fences.
- The JSON MUST match exactly this TypeScript shape:
  {
    "title": string,
    "nodes": Array<{
      "id": string,            // short, unique, lowercase, e.g. "alb", "ec2-web"
      "service": string,       // one of the allowed service keys below
      "label": string,         // human display name, e.g. "Order Processing Lambda"
      "parentId"?: string,     // id of the container this node lives inside
      "isContainer"?: boolean  // true for VPC/subnet/AZ grouping boxes
    }>,
    "edges": Array<{
      "id": string,            // unique, e.g. "e-alb-ec2"
      "source": string,        // node id
      "target": string,        // node id
      "label"?: string,        // e.g. "HTTPS", "invokes", "reads/writes"
      "animated"?: boolean
    }>
  }
- Do NOT include x/y coordinates. Automatic layout handles positioning.

ALLOWED service keys (use these; fall back to "generic" only if nothing fits):
${ALLOW_LIST.join(", ")}

MODELLING RULES:
- Use isContainer:true for grouping boxes (service "vpc" or "subnet"). Put resources inside them via parentId, matching how real AWS reference architectures are drawn.
- Compute (ec2, ecs, eks, lambda) and load balancers (alb, nlb) that live in a network typically go INSIDE the vpc (as children of the vpc or of a subnet).
- Edge/global services are drawn OUTSIDE the VPC: cloudfront, route53, apigateway, cognito, iam.
- S3, DynamoDB, SQS, SNS and other regional managed services are conventionally drawn OUTSIDE the VPC.
- Infer sensible directed edges even if the user didn't spell them all out, following typical request flow: client -> cloudfront/route53 -> alb/apigateway -> compute -> data store. Label edges with the protocol or action (e.g. "HTTPS", "routes to", "invokes", "reads/writes").
- Prefer real AWS service names in labels.
- Keep ids stable and unique. Every edge source/target must reference an existing node id. Every parentId must reference an existing container node.`;

function buildUserContent(prompt: string, existingGraph?: DiagramSpec): string {
  if (existingGraph) {
    return `This is an EDIT to an existing diagram. Here is the current diagram JSON:

${JSON.stringify(existingGraph, null, 2)}

Apply this change and return the FULL updated diagram JSON (not a diff), preserving unrelated nodes/edges and their ids where possible:

"${prompt}"`;
  }
  return `Create the AWS architecture diagram for this system as JSON:

"${prompt}"`;
}

function stripFences(raw: string): string {
  let text = raw.trim();
  // Remove a leading ```json / ``` fence and trailing ``` if present.
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  // If there is stray prose, grab the outermost {...} block.
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    text = text.slice(first, last + 1);
  }
  return text.trim();
}

export interface GenerateResult {
  spec: DiagramSpec;
  mock: boolean;
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function callCohere(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.COHERE_API_KEY;
  const model = process.env.COHERE_MODEL || "command-r-plus-08-2024";
  if (!apiKey) throw new Error("NO_API_KEY");

  const res = await fetch(COHERE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      // Force a single JSON object so we never have to fish it out of prose.
      response_format: { type: "json_object" },
      messages,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Cohere request failed (${res.status}): ${body.slice(0, 500)}`);
  }

  const json = (await res.json()) as {
    message?: { content?: Array<{ type?: string; text?: string }> | string };
  };

  const content = json.message?.content;
  let text = "";
  if (Array.isArray(content)) {
    text = content
      .filter((c) => c?.type === "text" && typeof c.text === "string")
      .map((c) => c.text)
      .join("");
  } else if (typeof content === "string") {
    text = content;
  }

  if (!text) throw new Error("Cohere returned an empty response");
  return text;
}

/**
 * MOCK-mode fallback used when COHERE_API_KEY is not set, so the whole app is
 * usable offline. For a fresh prompt it returns the sample architecture; for an
 * edit it appends a generic node so the iterate flow is visibly wired up.
 */
function mockSpec(prompt: string, existingGraph?: DiagramSpec): DiagramSpec {
  if (existingGraph) {
    const n = existingGraph.nodes.length + 1;
    const newId = `mock-${n}`;
    const anchor = existingGraph.nodes.find((node) => !node.isContainer);
    return {
      ...existingGraph,
      nodes: [
        ...existingGraph.nodes,
        {
          id: newId,
          service: "generic",
          label: prompt.slice(0, 40) || "New Component",
        },
      ],
      edges: anchor
        ? [
            ...existingGraph.edges,
            {
              id: `e-${anchor.id}-${newId}`,
              source: anchor.id,
              target: newId,
              label: "added",
            },
          ]
        : existingGraph.edges,
    };
  }
  return { ...SAMPLE_SPEC, title: prompt.slice(0, 60) || SAMPLE_SPEC.title };
}

/**
 * Generates and validates a DiagramSpec. On a zod validation failure against a
 * real model response, re-prompts the model exactly once with the validation
 * error before giving up.
 */
export async function generateDiagram(
  prompt: string,
  existingGraph?: DiagramSpec,
): Promise<GenerateResult> {
  if (!process.env.COHERE_API_KEY) {
    return { spec: mockSpec(prompt, existingGraph), mock: true };
  }

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: buildUserContent(prompt, existingGraph) },
  ];

  const firstRaw = await callCohere(messages);
  const firstParsed = tryParse(firstRaw);

  if (firstParsed.ok) {
    return { spec: firstParsed.spec, mock: false };
  }

  // Retry once, telling the model exactly what was wrong.
  const retryMessages: ChatMessage[] = [
    ...messages,
    { role: "assistant", content: firstRaw },
    {
      role: "user",
      content: `Your previous response was not valid. ${firstParsed.reason}
Return the corrected diagram as raw JSON only, matching the required shape exactly.`,
    },
  ];

  const secondRaw = await callCohere(retryMessages);
  const secondParsed = tryParse(secondRaw);
  if (secondParsed.ok) {
    return { spec: secondParsed.spec, mock: false };
  }

  throw new Error(
    `The model returned an invalid diagram twice. Last error:\n${secondParsed.reason}`,
  );
}

type ParseOutcome =
  | { ok: true; spec: DiagramSpec }
  | { ok: false; reason: string };

function tryParse(raw: string): ParseOutcome {
  const cleaned = stripFences(raw);
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned);
  } catch (err) {
    return {
      ok: false,
      reason: `The response was not valid JSON (${
        err instanceof Error ? err.message : "parse error"
      }).`,
    };
  }

  const result = DiagramSpecSchema.safeParse(parsedJson);
  if (!result.success) {
    return {
      ok: false,
      reason: `The JSON failed schema validation:\n${formatZodError(result.error)}`,
    };
  }
  return { ok: true, spec: result.data };
}
