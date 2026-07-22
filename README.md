# ArchGen — AI AWS Architecture Studio

Describe a system in plain English and get a **fully editable** AWS architecture
diagram. A prompt goes to **Cohere** (`command-r-plus`), which returns a
structured JSON graph (never an image); the frontend renders it on a draggable,
resizable React Flow canvas — draw.io / AILINE style.

## Stack


- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **@xyflow/react** (React Flow v12) canvas
- **@dagrejs/dagre** auto-layout
- **Zustand** store (single source of truth for the graph)
- **Zod** validation of every LLM response before it reaches the canvas
- **Cohere** via a server-side API route (`/api/generate`) — the key never touches the client
- **html-to-image** for PNG/SVG export

## Getting started

```bash
npm install
npm run gen:icons      # writes placeholder AWS SVG icons (runs automatically after install too)
cp .env.local.example .env.local
npm run dev            # http://localhost:3000
```

### Add your Cohere API key

Edit `.env.local`:

```
COHERE_API_KEY=...                      # from https://dashboard.cohere.com/api-keys
COHERE_MODEL=command-r-plus-08-2024     # swap to any current Cohere model
```

Restart `npm run dev` after editing `.env.local` — Next.js only reads env vars at boot.

> **No key? No problem.** If `COHERE_API_KEY` is blank, the app runs in **MOCK
> mode** and returns a deterministic sample diagram, so you can build and test
> the whole UI offline. Mock responses are tagged `MOCK` in the history panel.

## Using it

1. Type a description (or click an example chip) and hit **Generate** (⌘/Ctrl+Enter).
2. Iterate with follow-up edits — e.g. *"add a Redis cache between the ALB and EC2"*.
   When the canvas already has a diagram, your prompt is sent as an **edit**:
   the current graph is handed back to Cohere, which returns the full updated spec.
3. Edit manually — drag, resize, double-click to rename nodes/edges, connect
   handles, reconnect or delete edges, add nodes from the **+ Node** picker, and
   drop free-floating notes with **+ Text**.
   - **Connect** from any handle to any handle (either direction) — handles are
     large with a generous hit area and snap to the nearest one as you drag.
   - **Undo / redo** anything with **⌘/Ctrl+Z** and **⌘/Ctrl+Shift+Z** (or Ctrl+Y).
   - **Delete** by right-clicking a node/text box → **Delete**, or select and press
     **Delete/Backspace**. Both are undoable.
4. Export **PNG / SVG**, or **Copy JSON / Copy Mermaid**.

## AWS icons

The real **AWS Architecture Icons** ship in `public/icons/aws/` (sourced from the
[`aws-icons`](https://www.npmjs.com/package/aws-icons) package, which repackages
AWS's official SVG set). Icons are resolved through one file:
[`lib/awsIconMap.ts`](lib/awsIconMap.ts) — each service key maps to a path under
`public/icons/aws/`.

To swap or add an icon, drop an SVG in at the exact filename the map expects
(e.g. `public/icons/aws/lambda.svg`) — no code changes required.

`npm run gen:icons` (and `postinstall`) only **fills in missing** icons with
colored placeholders, so it never clobbers the real ones. Pass `--force`
(`node scripts/generate-icons.mjs --force`) to regenerate placeholders for all
keys.

## The LLM ↔ canvas contract

Cohere must return exactly this shape (validated by
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

If a response fails validation, the API route re-prompts Cohere **once** with the
exact zod error before returning a clean error to the UI. A malformed response
can never crash the canvas.

## Project layout

```
app/
  api/generate/route.ts   # server-side Cohere call + validation + retry
  page.tsx, layout.tsx    # shell
components/
  Studio.tsx              # top-level layout + ReactFlowProvider
  Canvas.tsx              # React Flow instance, minimap, controls, grid
  PromptBar.tsx           # prompt textarea + example chips + generate/edit
  RightPanel.tsx          # history + PNG/SVG/JSON/Mermaid export + reset
  Toolbar.tsx             # add node / add text / fit
  IconPicker.tsx          # searchable service picker
  nodes/ServiceNode.tsx   # AWS-service node (icon, category border, resize, rename, note)
  nodes/ContainerNode.tsx # VPC/subnet grouping box (nested children)
  nodes/TextNode.tsx      # free-floating, draggable text annotation
  edges/EditableEdge.tsx  # relabel / delete / reconnect edges
lib/
  schema.ts               # zod DiagramSpec contract
  llm.ts                  # system prompt, Cohere call, retry, mock fallback
  layout.ts               # spec <-> React Flow, dagre auto-layout
  awsIconMap.ts           # service key -> icon + category (swap point)
  store.ts                # Zustand graph store
  mermaid.ts              # DiagramSpec -> Mermaid flowchart
  sampleGraph.ts          # bootstrap sample + example prompts
scripts/generate-icons.mjs
```

## Changelog

### 2026-07-22 — Canvas editing UX

**Easier connections**
- Switched to **loose connection mode**: drag from any handle to any handle, in
  either direction — no more source→target ordering.
- Larger handles with an invisible enlarged hit area, hover/active highlighting,
  and a **45px snap radius** so you no longer have to land precisely on the dot.

**Undo / redo**
- Snapshot-based history in the store (`takeSnapshot` / `undo` / `redo`, capped at
  50 steps). Every structural change, edit, drag, resize, and generate is captured.
- **⌘/Ctrl+Z** to undo, **⌘/Ctrl+Shift+Z** (or Ctrl+Y) to redo. The shortcut is
  ignored while typing in a field so native text undo still works.

**Text boxes**
- New **+ Text** button drops a free-floating annotation (`nodes/TextNode.tsx`) —
  draggable from anywhere on the box (like a service node), resizable, double-click
  to edit. Excluded from the JSON/Mermaid export and the LLM spec.
- Service nodes gained an optional inline **note** field (hover → **+ note**).

**Edge labels**
- Removed the always-on "+ label" pill. Labels now render as clean **readable
  text** and are **single-click to edit**; the add-label and delete affordances
  only appear when the edge is selected.

**Deleting**
- **Right-click** a node or text box → **Delete** (removes the node, its container
  children, and connected edges — undoable).
- **Delete/Backspace** now routes through the store so keyboard deletes are
  undoable too.
- Removed the **Undo/Redo/Delete** buttons from the toolbar in favor of the
  keyboard shortcuts and the right-click menu.
