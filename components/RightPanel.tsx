"use client";

import { useState } from "react";
import { toPng, toSvg } from "html-to-image";
import {
  getNodesBounds,
  getViewportForBounds,
  useReactFlow,
} from "@xyflow/react";
import { useDiagramStore } from "@/lib/store";
import { specToMermaid } from "@/lib/mermaid";

const EXPORT_BG = "#0b0f19";

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export default function RightPanel() {
  const history = useDiagramStore((s) => s.history);
  const nodes = useDiagramStore((s) => s.nodes);
  const title = useDiagramStore((s) => s.title);
  const getSpec = useDiagramStore((s) => s.getSpec);
  const reset = useDiagramStore((s) => s.reset);
  const { getNodes } = useReactFlow();

  const [flash, setFlash] = useState<string | null>(null);
  const hasGraph = nodes.length > 0;

  const notify = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 1600);
  };

  const captureOptions = () => {
    const rfNodes = getNodes();
    const bounds = getNodesBounds(rfNodes);
    const pad = 80;
    const width = Math.min(Math.max(Math.ceil(bounds.width) + pad * 2, 640), 4096);
    const height = Math.min(Math.max(Math.ceil(bounds.height) + pad * 2, 480), 4096);
    const viewport = getViewportForBounds(bounds, width, height, 0.5, 2, 0.12);
    const el = document.querySelector<HTMLElement>(".react-flow__viewport");
    return { el, width, height, viewport };
  };

  const exportPng = async () => {
    const { el, width, height, viewport } = captureOptions();
    if (!el) return;
    const dataUrl = await toPng(el, {
      backgroundColor: EXPORT_BG,
      width,
      height,
      style: {
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    });
    triggerDownload(dataUrl, `${slug(title)}.png`);
  };

  const exportSvg = async () => {
    const { el, width, height, viewport } = captureOptions();
    if (!el) return;
    const dataUrl = await toSvg(el, {
      backgroundColor: EXPORT_BG,
      width,
      height,
      style: {
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    });
    triggerDownload(dataUrl, `${slug(title)}.svg`);
  };

  const copyJson = async () => {
    await navigator.clipboard.writeText(JSON.stringify(getSpec(), null, 2));
    notify("Copied JSON");
  };

  const copyMermaid = async () => {
    await navigator.clipboard.writeText(specToMermaid(getSpec()));
    notify("Copied Mermaid");
  };

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-slate-800 bg-slate-950/60">
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Prompt History
        </h2>
      </div>

      <div className="archgen-scroll flex-1 overflow-y-auto px-3 py-3">
        {history.length === 0 ? (
          <p className="px-1 text-xs text-slate-500">
            Your prompts and follow-up edits will appear here.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {history.map((h, i) => (
              <li
                key={h.id}
                className="rounded-md border border-slate-800 bg-slate-900/70 px-2.5 py-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-500">
                    {i === 0 ? "PROMPT" : `EDIT ${i}`}
                  </span>
                  {h.mock && (
                    <span className="rounded bg-amber-900/60 px-1 text-[9px] font-semibold text-amber-300">
                      MOCK
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-300">{h.prompt}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="border-t border-slate-800 px-3 py-3">
        <div className="grid grid-cols-2 gap-2">
          <ExportButton onClick={exportPng} disabled={!hasGraph}>
            Export PNG
          </ExportButton>
          <ExportButton onClick={exportSvg} disabled={!hasGraph}>
            Export SVG
          </ExportButton>
          <ExportButton onClick={copyJson} disabled={!hasGraph}>
            Copy JSON
          </ExportButton>
          <ExportButton onClick={copyMermaid} disabled={!hasGraph}>
            Copy Mermaid
          </ExportButton>
        </div>
        <button
          onClick={() => {
            if (confirm("Clear the canvas and history?")) reset();
          }}
          disabled={!hasGraph}
          className="mt-2 w-full rounded-md border border-rose-900 bg-rose-950/40 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-950/70 disabled:opacity-40"
        >
          Reset Canvas
        </button>
        {flash && (
          <p className="mt-2 text-center text-[11px] text-emerald-400">{flash}</p>
        )}
      </div>
    </aside>
  );
}

function ExportButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-slate-700 bg-slate-900 py-1.5 text-xs font-medium text-slate-200 hover:border-sky-500 hover:text-sky-300 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function slug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "architecture"
  );
}
