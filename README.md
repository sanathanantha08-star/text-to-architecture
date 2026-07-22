# ArchGen — AI AWS Architecture Studio

Describe a system in plain English and get a **fully editable** AWS architecture
diagram. A prompt goes to an **LLM**, which returns a structured JSON graph
(never an image); the frontend renders it on a draggable, resizable React Flow
canvas — a draw.io-style editor.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **@xyflow/react** (React Flow v12) canvas
- **@dagrejs/dagre** auto-layout
- **Zustand** store (single source of truth for the graph)
- **Zod** validation of every LLM response before it reaches the canvas
- **Pluggable LLM** via a server-side API route (`/api/generate`) — the key never touches the client
- **html-to-image** for PNG/SVG export

## Getting started

```bash
npm install
npm run gen:icons      # writes placeholder AWS SVG icons (runs automatically after install too)
cp .env.local.example .env.local
npm run dev            # http://localhost:3000
```

### Add your LLM API key

Copy the example env file and drop in your key:

```bash
cp .env.local.example .env.local
```

See [`.env.local.example`](.env.local.example) for the exact variables (API key
+ model name). The LLM client lives in one file — [`lib/llm.ts`](lib/llm.ts) —
so swapping providers is a small, isolated change.

Restart `npm run dev` after editing `.env.local` — Next.js only reads env vars at boot.

> **No key? No problem.** With no API key set, the app runs in **MOCK mode** and
> returns a deterministic sample diagram, so you can build and test the whole UI
> offline. Mock responses are tagged `MOCK` in the history panel.

## Using it

1. Type a description (or click an example chip) and hit **Generate** (⌘/Ctrl+Enter).
2. Iterate with follow-up edits — e.g. *"add a Redis cache between the ALB and EC2"*.
   When the canvas already has a diagram, your prompt is sent as an **edit**:
   the current graph is handed back to the model, which returns the full updated spec.
3. Edit manually — drag, resize, double-click to rename nodes/edges, connect
   handles, reconnect or delete edges, add nodes from the **+ Node** picker.
4. Export **PNG / SVG**, or **Copy JSON / Copy Mermaid**.

## Swapping in the real AWS icons

Icons are resolved through one file: [`lib/awsIconMap.ts`](lib/awsIconMap.ts).
Each service key maps to a path under `public/icons/aws/`. Download the official
[AWS Architecture Icons](https://aws.amazon.com/architecture/icons/) and drop the
SVGs in at those exact file names (e.g. `public/icons/aws/lambda.svg`). No code
changes required. Re-running `npm run gen:icons` regenerates the placeholders.

## The LLM ↔ canvas contract

The model must return exactly this shape (validated by
[`lib/schema.ts`](lib/schema.ts)):

```ts
type DiagramSpec = {
  title: string;
  nodes: Array<{
    id: string;
    service: string;      // key into awsIconMap (ec2, lambda, s3, alb, vpc, …)
    label: string;
    parentId?: string;    // nest inside a VPC/subnet container
    isContainer?: boolean;// true for VPC/subnet grouping boxes
    x?: number; y?: number; // optional — omit to let dagre lay it out
  }>;
  edges: Array<{
    id: string;
    source: string; target: string;
    label?: string; animated?: boolean;
  }>;
};
```

If a response fails validation, the API route re-prompts the model **once** with
the exact zod error before returning a clean error to the UI. A malformed
response can never crash the canvas.

## Project layout

```
app/
  api/generate/route.ts   # server-side LLM call + validation + retry
  page.tsx, layout.tsx    # shell
components/
  Studio.tsx              # top-level layout + ReactFlowProvider
  Canvas.tsx              # React Flow instance, minimap, controls, grid
  PromptBar.tsx           # prompt textarea + example chips + generate/edit
  RightPanel.tsx          # history + PNG/SVG/JSON/Mermaid export + reset
  Toolbar.tsx             # add node / delete / fit
  IconPicker.tsx          # searchable service picker
  nodes/ServiceNode.tsx   # AWS-service node (icon, category border, resize, rename)
  nodes/ContainerNode.tsx # VPC/subnet grouping box (nested children)
  edges/EditableEdge.tsx  # relabel / delete / reconnect edges
lib/
  schema.ts               # zod DiagramSpec contract
  llm.ts                  # system prompt, LLM call, retry, mock fallback
  layout.ts               # spec <-> React Flow, dagre auto-layout
  awsIconMap.ts           # service key -> icon + category (swap point)
  store.ts                # Zustand graph store
  mermaid.ts              # DiagramSpec -> Mermaid flowchart
  sampleGraph.ts          # bootstrap sample + example prompts
scripts/generate-icons.mjs
```
