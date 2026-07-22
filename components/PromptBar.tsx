"use client";

import { useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { useDiagramStore } from "@/lib/store";
import { EXAMPLE_PROMPTS } from "@/lib/sampleGraph";

export default function PromptBar() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nodes = useDiagramStore((s) => s.nodes);
  const setSpec = useDiagramStore((s) => s.setSpec);
  const getSpec = useDiagramStore((s) => s.getSpec);
  const pushHistory = useDiagramStore((s) => s.pushHistory);
  const { fitView } = useReactFlow();

  const hasGraph = nodes.length > 0;

  async function generate(text: string) {
    const value = text.trim();
    if (!value || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: value,
          existingGraph: hasGraph ? getSpec() : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Generation failed.");
        return;
      }
      setSpec(json.spec);
      pushHistory(value, Boolean(json.mock));
      setPrompt("");
      // Let the store commit + layout settle, then frame the diagram.
      setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 60);
    } catch {
      setError("Network error — is the dev server running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-b border-slate-800 bg-slate-950/80 px-4 py-3">
      <div className="flex items-start gap-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") generate(prompt);
          }}
          rows={2}
          placeholder={
            hasGraph
              ? "Describe an edit, e.g. “add a Redis cache between the ALB and EC2”…"
              : "Describe your AWS architecture in plain English…"
          }
          className="archgen-scroll min-h-[52px] flex-1 resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
        />
        <button
          onClick={() => generate(prompt)}
          disabled={loading || !prompt.trim()}
          className="h-[52px] shrink-0 rounded-lg bg-sky-600 px-5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Generating…" : hasGraph ? "Apply Edit" : "Generate"}
        </button>
      </div>

      {!hasGraph && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="mr-1 text-[11px] text-slate-500">Try:</span>
          {EXAMPLE_PROMPTS.map((ex, i) => (
            <button
              key={i}
              onClick={() => {
                setPrompt(ex);
                generate(ex);
              }}
              className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 hover:border-sky-500 hover:text-sky-300"
            >
              {ex.length > 52 ? ex.slice(0, 52) + "…" : ex}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-2 rounded bg-rose-950/60 px-2 py-1 text-xs text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
