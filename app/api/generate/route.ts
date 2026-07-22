import { NextResponse } from "next/server";
import { z } from "zod";
import { DiagramSpecSchema } from "@/lib/schema";
import { generateDiagram } from "@/lib/llm";

export const runtime = "nodejs";

const RequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  existingGraph: DiagramSpecSchema.optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }

  const { prompt, existingGraph } = parsed.data;

  try {
    const { spec, mock } = await generateDiagram(prompt, existingGraph);
    return NextResponse.json({ spec, mock });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown generation error";
    // 422 = the model responded but we couldn't get valid output from it.
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
