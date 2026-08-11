# KG Viewer: Design and Usage

**Purpose of this document.** This is the reference for
[`viewer/graph_viewer.html`](../viewer/graph_viewer.html) — a standalone
page for exploring the knowledge graph `02_kg_extraction.ipynb` produces.
It covers what the viewer does, how data gets into it, the two features
that motivated building it (case nodes, and click-to-highlight/filter),
and the non-obvious implementation decisions, so a future edit doesn't
accidentally undo one of them.

## 1. Why a separate, versioned viewer

`02_kg_extraction.ipynb` already writes an inline pyvis preview
(`kg_preview.html`, Stage 8 / Section 13) as a fast sanity check while
iterating in the notebook. That preview is regenerated from scratch on
every run, lives in the gitignored `data/` directory, and only shows the
entity-relation graph (`G` in the notebook) — there's no node for the
clinical case a given entity came from.

`viewer/graph_viewer.html` is a different kind of artifact: a page meant
to be opened, used in class, edited, and committed like any other file in
the repo — not thrown away and regenerated each run. The **data** it
displays is still regenerated per run (`data/kg_extraction/graph_data.js`,
gitignored, written by the notebook's Section 16), but the **page itself**
is not. That split — versioned code, disposable data — is why it lives in
its own top-level `viewer/` directory rather than next to the notebook's
other outputs.

It also shows something the pyvis preview doesn't: case nodes. The
notebook builds a second graph for export, `G_export` (Section 16), by
copying the entity-only `G` and adding one node per clinical case plus a
`mentions` edge from that case to every entity extracted from it. The
viewer is what actually makes that case-level structure explorable.

## 2. Data flow

```
02_kg_extraction.ipynb (Section 16)
    │
    │  builds G_export = G + case nodes + "mentions" edges
    ▼
data/kg_extraction/graph_data.js   (gitignored, regenerated per run)
    │  const GRAPH_DATA = { nodes: [...], edges: [...] };
    ▼
viewer/graph_viewer.html   (versioned, loaded via <script src="../data/kg_extraction/graph_data.js">)
```

**Why a `<script>` tag and not `fetch()`.** Browsers block `fetch()` of
local files when a page is opened directly as `file://…` (no web server) —
exactly how this viewer is meant to be used. A `<script src="...">` tag
has no such restriction: if the file exists, it defines the global
`GRAPH_DATA` object before the viewer's own script runs; if it doesn't
(e.g. the notebook hasn't been run yet), the browser silently skips that
one `<script>` tag and every other script on the page still loads and
runs normally, so the viewer can detect the missing data and show a
message instead of failing outright.

**`GRAPH_DATA` shape:**

```js
const GRAPH_DATA = {
  nodes: [
    { id: "CUI:C0032285", label: "Pneumonia", category: "Disease",
      node_type: "entity", cui: "C0032285", age: null, gender: null },
    { id: "CASE:PMC1234567_01", label: "PMC1234567_01", category: "Case",
      node_type: "case", cui: null, age: 45.0, gender: "Female" },
    ...
  ],
  edges: [
    { source: "CLUSTER:Drug:3", target: "CUI:C0032285", interaction: "treats",
      edge_type: "relation", score: 0.87, case_id: "PMC1234567_01",
      sentence: "...", mention_count: null },
    { source: "CASE:PMC1234567_01", target: "CUI:C0032285", interaction: "mentions",
      edge_type: "mentions", score: null, case_id: "PMC1234567_01",
      sentence: null, mention_count: 1 },
    ...
  ],
};
```

Two node types (`node_type: "entity" | "case"`) and two edge types
(`edge_type: "relation" | "mentions"`) travel through the same arrays —
the viewer filters on these fields client-side rather than the notebook
producing separate files per type, which is what makes the case-node
toggle (Section 4 below) a client-side operation with no data reload.

**CSV fallback.** If `graph_data.js` is missing — e.g. looking at an older
export, or one moved elsewhere — the sidebar's "Data" panel accepts
`nodes.csv` / `edges.csv` (the same files the notebook writes for
Cytoscape import; see `kg_extraction_methodology.md`, Stage 8) via
drag-and-drop or a file picker. Both paths — `GRAPH_DATA` and CSV — are
normalized through the same `normalizeNodes`/`normalizeEdges` functions
before anything else touches the data, so the rest of the app doesn't
know or care which path was used.

## 3. Features

### Case nodes toggle

A checkbox in the sidebar shows or hides every `node_type: "case"` node
and every `edge_type: "mentions"` edge. Off, the graph is exactly what the
notebook's pyvis preview shows. On, one box-shaped node appears per case,
connected to everything it contributed.

Toggling rebuilds the underlying `vis.DataSet`s from scratch (not just a
visibility flip) and resets any active click-mode selection — flipping
the toggle mid-selection would otherwise leave the highlighted/filtered
state referring to a graph that no longer matches what's on screen.

### Click-to-highlight / click-to-filter (case nodes only)

Clicking a case node applies one of three modes, chosen via a segmented
control:

| Mode | Effect |
|---|---|
| **None** | No visual change; the info panel still shows the case's details. |
| **Highlight** | Everything the case directly or indirectly extracted stays at full opacity (color-coded by category, as usual); everything else fades to ~10% opacity but stays on screen. |
| **Filter** | Everything the case directly or indirectly extracted stays visible; everything else is hidden outright (`hidden: true` on the `vis.DataSet` item, not removed from the dataset — clearing the selection restores it instantly, no rebuild). |

Clicking the *same* case node again, or clicking empty canvas, clears the
selection. Clicking a regular entity node while a case is selected leaves
the highlight/filter in place and just updates the info panel — so you
can inspect a node without losing the case-level context.

**"Directly or indirectly extracted" is a breadth-first search over
outgoing edges only**, starting at the case node: hop 1 is every entity
reached by a `mentions` edge, hop 2+ is whatever those entities reach via
`relation` edges, and so on. This is deliberately one-directional. The
viewer that inspired this one
(a quadripartite gene/pathway network viewer, internal to a different
project) traces *both* precursors (upstream) and successors (downstream)
from a click, because every node type in that graph can have both
incoming and outgoing edges. Case nodes here never have an incoming edge —
nothing points *to* a case — so there is no "upstream" to trace, and the
highlight/filter logic only implements the successor half of that
reference design. Hop distance controls opacity for highlighted nodes
(`HOP_ALPHA = [1, 1, 0.6, 0.35, 0.2]`, i.e. hop 1 and hop 2 both render at
full strength, then fade), matching the reference's own hop-decay
convention.

### Legend, labels, and layout

- The category legend lists node counts for the six activity categories
  plus "Case", using the same color mapping as the notebook's pyvis
  preview (`#e07a5f` Symptom, `#3d405b` Disease, `#81b29a` Drug, `#f2cc8f`
  Laboratory Test, `#a8dadc` Anatomy, `#e9c46a` Procedure) plus `#6d597a`
  for Case, chosen to be visually distinct from all six entity colors.
- Entity node labels are hidden by default and toggleable — a real sample
  (50 cases) resolves to 1,000+ entity nodes, and showing every label at
  once is unreadable. Case node labels always show regardless of the
  toggle, since there are far fewer of them and they're the navigation
  anchors.
- Layout is `vis-network`'s force-directed physics (`barnesHut`), turned
  off automatically once the initial layout stabilizes (for performance
  and so dragging a node doesn't fight the simulation). This graph has no
  natural partition/ordering the way the quadripartite reference graph
  did (MicroRNA → mRNA → Pathway Location → Pathway, strictly
  layer-to-layer edges only), so its deterministic barycenter-layered
  layout doesn't apply here; force-directed layout is the standard
  default for a general graph without that structure.
- Case nodes render as boxes, entity nodes as circles sized by degree —
  shape carries `node_type`, color carries `category`, so the two are
  never conflated even for someone not reading the legend closely.

## 4. Implementation notes

- **Single self-contained file.** `viewer/graph_viewer.html` has one
  inline `<style>` block and one inline `<script>` block; the only
  external reference is the vendored `viewer/lib/vis-network.min.js`
  (copied from `pyvis`'s own bundled copy — Apache-2.0/MIT licensed, no
  CDN dependency, consistent with the rest of this project's fully-local
  design). There is no build step.
- **The `color.highlight` / `color.hover` gotcha.** `vis-network`
  repaints a node with `color.highlight` while it's part of the network's
  own internal "selected" set (true after any click) and with
  `color.hover` on mouse-over — independently of `color.background`,
  unless both are set to match. Every color assignment in this file goes
  through a `nodeColorObj()` / `edgeColorObj()` helper that sets all
  three, or a clicked/hovered node snaps back to a default color instead
  of the highlight/filter/faded style just applied to it. This is the
  single easiest thing to break when editing the coloring logic — if a
  future change reintroduces a bare `{ background, border }` color
  object, hovering will visibly "un-highlight" nodes.
- **Dark mode** follows `prefers-color-scheme` via CSS custom properties
  (`:root` / `@media (prefers-color-scheme: dark)`), matching the
  project's other authored pages.
- **No server required.** Both the `<script src="lib/vis-network.min.js">`
  and the `graph_data.js` load work when the file is opened directly
  (`file://…`); nothing here depends on Jupyter, Docker, or a local HTTP
  server.

## 5. Known limitations

- Highlight/filter only activate on case-node clicks, per the original
  design goal (exploring what one case contributed) — clicking a regular
  entity node never triggers a reachability trace, even though the same
  BFS machinery could in principle run from any node.
- The CSV fallback path re-parses and re-normalizes on every load; there's
  no persistence across page reloads (reload the page, re-load the CSVs
  or re-run the notebook so `graph_data.js` picks back up automatically).
- Force-directed layout on a large sample (many hundreds of cases) will be
  slower to stabilize and busier to read than the illustrative ~50-case
  samples this was built against; there's no clustering/aggregation for
  very dense graphs.
- No automated UI test suite ships with the file (there's no headless
  browser dependency in this project). It was validated once, ad hoc, by
  extracting the real inline script and running it against synthetic
  `GRAPH_DATA` under Node with a hand-rolled `document`/`vis-network`
  stub, confirming the highlight/filter/toggle logic behaves correctly —
  that harness wasn't kept in the repo, so a similar one would need to be
  rebuilt from scratch for future regression testing.

## 6. Quick usage

1. Run `02_kg_extraction.ipynb` through Section 16 (Export).
2. Open `viewer/graph_viewer.html` in a browser (double-click works — no
   server needed).
3. Toggle "Show clinical case nodes" on.
4. Click a case node. With "Highlight" selected (the default), everything
   it didn't touch fades out; switch to "Filter" to hide it outright, or
   "None" to just inspect the case's details in the info panel.
5. Click the same case again, or empty canvas, to reset.
