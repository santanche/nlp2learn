# Protocell-0 — Energy Pathway Branch (INTAKE)

### Handoff summary: design decisions, rationale and open questions

*Companion to `protocell-0-spec.md`. Written 2026-11-01 to transfer context between chats in the LUCA project.*

---

## 0. What this branch is, and the level it aims at

A **didactic energy pathway** for Protocell-0: partially fantasy, but with every core step derived from a real
pathway so that it is believable and teaches how cells actually get energy. The audience includes
non-biologists (the author is a computer scientist who understands pathways as graphs but is not a biologist).

**Target abstraction level** — taken from two earlier projects synced into this Project:

| Project | Repo / path | What it contributes |
|---|---|---|
| Zombie cell pathways | `datasci4health/datasci4health.github.io` → `networks/zombie/pathways/` (`zombie_cell_pathways_documentation.md`, `setup/full_setup-*.json`); viewer at `networks/dagoberto/` | Scale and format: ~7–10 named proteins per pathway, roles (receptor / intermediate / effector), `nodes.csv` + `edges.csv`, bottleneck and redundancy, normal vs mutant expression, loaded into the Dagoberto network visualizer |
| *Zombienella importunus* | `santanche/nlp2learn` → `zombie/zombienella/` (`README.md`, `zombienella_notebook_architecture.md`) | The NLP side: a tiny generative grammar of short sequences, then n-grams, full-prefix model, co-occurrence and Word2Vec-style embeddings, later attention |

**Difference from the zombie project:** the zombie pathways have no real-biology basis. This branch must abstract
a *real* energy pathway at a high level, adding fantasy only where it simplifies.

**Superseded design (do not reuse):** an earlier, very technical sketch proposed an abstract 4-step autocatalytic
carrier cycle (carrier A + Σ → A·Σ → A* + Ω → … → 2A). The author rejected it as too technical and not
reality-derived. The design below replaces it.

---

## 1. Real basis

**Glycolysis + lactic-acid fermentation.** Chosen because it is the most universal and most taught energy
pathway and its logic survives aggressive simplification — *not* because LUCA necessarily used it (LUCA
probably used a different route). Real glycolysis has ten steps; merging enzymes and keeping only the turning
points leaves **seven proteins**.

### Vocabulary: fantasy name ↔ real molecule

| Protocell-0 | Real counterpart | Notes |
|---|---|---|
| Σ (food / substrate) | glucose | one generic food |
| K (kelate, charged) / K₀ (kelate, spent) | ATP / ADP | the spec's currency; it needs a spent form to recycle |
| electron bucket (empty / full) | NAD⁺ / NADH | carrier that must be recycled |
| halves α and β | glyceraldehyde-3-phosphate / dihydroxyacetone phosphate | produced by the split |
| Ω (waste) | lactate (or ethanol + CO₂ in yeast) | leaves the cell |

---

## 2. The final pathway — seven Nax proteins

Gene family **Nax**, as reserved by the spec for INTAKE. Names follow the zombie-project style (playful,
function-revealing).

| Protein | Role | What it does in Protocell-0 | Real counterpart | Phase |
|---|---|---|---|---|
| **NaxGATE** | receptor (see §5 caveat) | Lets food Σ into the cell | Glucose transporter (GLUT) | support |
| **NaxTAG** | intermediate | Spends 1 K to tag Σ, trapping it inside | Hexokinase | investment |
| **NaxSNIP** | intermediate | Spends 1 K and cuts the food into halves α and β; also the control valve | Phosphofructokinase + aldolase (merged) | investment |
| **NaxFLIP** | intermediate | Converts β into α so one machine processes both | Triose-phosphate isomerase | support |
| **NaxGRAB** | intermediate | Strips electrons from α into the electron bucket; attaches a new high-energy phosphate | GAPDH (NAD⁺ → NADH) | payoff |
| **NaxPAY** | effector | Releases energy as kelate: 2 K per half, 4 K total | Phosphoglycerate kinase + pyruvate kinase (and steps between, merged) | payoff |
| **NaxDUMP** | effector | Empties the bucket onto the leftovers, which leave as waste Ω | Lactate dehydrogenase (fermentation) | support |

### Edges (directed)

```
NaxGATE -> NaxTAG
NaxTAG  -> NaxSNIP
NaxSNIP -> NaxGRAB        (α route, direct)
NaxSNIP -> NaxFLIP        (β route)
NaxFLIP -> NaxGRAB
NaxGRAB -> NaxPAY
NaxGRAB <-> NaxDUMP       (bucket exchange: full bucket out, empty bucket back)
NaxDUMP -> Ω (exported)
```

Diagram convention used so far: vertical trunk GATE → TAG → SNIP → GRAB → PAY; FLIP on a side branch from SNIP
rejoining at GRAB; DUMP beside GRAB; colours = investment phase (TAG, SNIP), payoff phase (GRAB, PAY),
support (GATE, FLIP, DUMP). SNIP drawn with a heavier border as the bottleneck/valve.

### Energy accounting (per food molecule Σ)

- Investment: −1 K (TAG) −1 K (SNIP) = **−2 K**
- Payoff: +2 K per half × 2 halves (PAY) = **+4 K**
- **Net: +2 K** — these are glycolysis's real numbers
- Buckets: 2 filled by GRAB, 2 emptied by DUMP (balanced)

### Fantasy simplifications (state these openly)

Merged enzymes (10 steps → 6 enzymes + 1 transporter), a single generic food, invented names, no oxygen route
(fermentation only).

---

## 3. The six real lessons the pathway carries

1. **Trap before you process.** A tagged (phosphorylated) molecule is charged and cannot leak back out through
   the membrane — why cells phosphorylate glucose first.
2. **Invest before you earn.** 2 K in, 4 K out, net +2.
3. **Split, then make the halves identical.** One cut gives two different halves; FLIP converts one into the
   other so one downstream machine handles both.
4. **Recycle the bucket or stall.** GRAB works only while empty buckets exist; without DUMP every bucket fills
   and the pathway stops. Waste (lactate in muscle, ethanol in yeast) exists to empty buckets.
5. **The valve listens to the product.** SNIP slows when K is plentiful, as real phosphofructokinase is
   inhibited by ATP. SNIP is both the bottleneck and the control point.
6. **You need K to make K.** A cell at zero kelate cannot pay the entry cost and cannot restart even when food
   returns — the "turbo design" problem (Teusink et al., *TIBS* 1998). This is the reality-based replacement
   for the spec's "autocatalytic" wording for INTAKE.

---

## 4. Why NaxGRAB is needed (the author asked: why not go from SNIP/FLIP straight to PAY?)

**NaxGRAB is where the profit comes from.** Everything before it moves energy around; GRAB is the only step
that releases new energy from the food.

- Food stores energy in its electrons (C–H bonds). Releasing it means pulling electrons off carbon:
  **oxidation**. TAG and SNIP oxidize nothing — they prepare the food. GRAB is the actual "burning"; PAY only
  cashes in.
- **Energy ladder** (energy released when the phosphate is removed, kJ/mol, standard textbook values, e.g.
  Lehninger): PEP ~62 · 1,3-bisphosphoglycerate (made by GAPDH) ~49 · **ATP ~31** · glucose-6-phosphate (made
  by hexokinase) ~14. A phosphate can only charge K₀ → K if it sits *above* ATP. The phosphates invested by TAG
  and SNIP sit *below* ATP, so the halves leaving SNIP/FLIP have nothing PAY can transfer.
- GRAB couples oxidation with attaching a **new** phosphate (from free phosphate, not from kelate) in a
  high-energy position. That new phosphate is the profit.
- Per half: fresh phosphate from oxidation (→ 1 K) + invested phosphate recovered after rearrangement into PEP
  (→ 1 K) = 2 K. Without GRAB, at most the 2 invested phosphates come back: **net zero**.
- **The price of the profit:** the stripped electrons must go somewhere — the bucket — which is why DUMP must
  exist. Present GRAB and DUMP as a pair: one earns, the other takes out the trash that earning produces.
- Recommendation: keep GRAB separate from PAY (merging is possible but hides the key idea "energy comes from
  electrons" and the visual link to DUMP).
- One-liner for students: *SNIP cuts the wood, GRAB lights it, PAY turns the heat into cash, DUMP removes the
  ashes.*

---

## 5. NaxGATE in detail (real counterpart: GLUT)

- **Mechanism:** alternating access — a pocket opens to the outside, binds one glucose, the protein flips, the
  pocket faces inside and releases it. Never open to both sides, so the membrane never leaks.
- **Passive:** no energy spent (facilitated diffusion); moves glucose only downhill, from high to low
  concentration.
- **Partnership with NaxTAG:** TAG converts arriving glucose immediately, keeping free internal glucose near
  zero, so the downhill slope never disappears. The door is passive; the next step keeps pulling food through.
  This also justifies why tagging comes so early.
- **Three real entry strategies:**

| Strategy | Real example | Energy cost | How it works |
|---|---|---|---|
| Passive door | GLUT (our cells) | none | downhill only |
| Coupled door | SGLT (intestine, kidney) | indirect | sodium flows in and drags glucose along, even uphill |
| Door that tags | PTS (many bacteria) | direct | transports and tags in one act |

- **Design option (open):** fuse NaxGATE + NaxTAG into one protein ("brings food in already tagged"). This is a
  real strategy (bacterial PTS), not a fantasy shortcut; it would make the pathway six proteins.
- **Hooks for exercises:** GLUT4 waits in vesicles and insulin moves it to the membrane — the cell regulates
  intake by changing how many doors it has (fits a "fed" / "low-food" expression scenario). Isoforms (GLUT1
  everywhere, GLUT2 liver, GLUT3 neurons, GLUT4 muscle) could become two NaxGATE variants for rich/poor
  environments, giving the language side two related, distinguishable genes.
- **Role-label caveat:** the zombie vocabulary would call GATE a "receptor" (entry point), but strictly a
  transporter is not a receptor (a receptor detects a signal; a transporter moves the substance). Options: keep
  "receptor" for simplicity, or add a fourth role "transporter". Not yet decided.

---

## 6. Zombie-style exercises the graph supports

Same `nodes.csv` / `edges.csv` format as the zombie project, loadable in Dagoberto.

**Knockout predictions:**
- Remove **GATE, TAG, SNIP, GRAB or PAY** → pathway off (the trunk).
- Remove **FLIP** → yield halved, not zero: only α is processed while β piles up. Redundancy with a cost. (Real
  triose-phosphate isomerase deficiency is a serious disease for this reason.)
- Remove **DUMP** → the surprising one: it sits off the main line, so naive path analysis calls it optional, yet
  the pathway runs a few turns and stalls (all buckets full). Lesson: topology ≠ function.

**Expression scenario** (analogue of the zombie mutant): e.g. a "low-food" condition upregulating GATE and SNIP.

---

## 7. Bridge to the language-model side

- **Operon ordering:** real bacteria often place a pathway's genes side by side in pathway order. If the seven
  Nax genes do this, the *Zombienella* co-occurrence / Word2Vec notebooks should place adjacent steps close in
  embedding space — students recover pathway order from sequence statistics alone, never seeing the graph.
- **Attention hook:** a K-sensing control element upstream of NaxSNIP adds an if/then long-range dependency for
  the later attention exercise.
- **Caveat carried over from the spec (§4.1):** an energy-only genome has a single pathway class, which
  collapses the marker → terminator experiment (the terminator becomes always the same). To keep a long-range
  dependency, treat the Nax genes as subclasses with their own markers, terminators and codon dialects.

---

## 8. Open decisions and next steps

*Status as of `design-spec.md` v1.0 (2026-11-01):* item 1 still open (graph side); item 2 kept separate,
seven proteins (design-spec §9.2); item 3 graph side only (§9.3); item 4 later version (§9.5); item 5 done
(`protocell-0-spec.md` §3.2 updated).

1. **Next deliverable (proposed, not yet done):** `nodes.csv` (id, pathway, role, expression_normal,
   expression_lowfood, expression_diff) and `edges.csv` (source, target, pathway) for the seven proteins, ready
   for Dagoberto.
2. Fuse GATE + TAG (PTS-style, 6 proteins) or keep separate (GLUT story, 7 proteins)?
3. Role label for GATE: "receptor" or new role "transporter"?
4. Optional LUCA-faithful alternative branch: chemiosmotic — a natural proton gradient drives a rotary
   "turbine" (ATP synthase). Closer to what LUCA is thought to have had, harder to tell step by step.
5. `protocell-0-spec.md` §3.2 still describes INTAKE as NaxA–NaxD with an abstract autocatalytic cycle; it
   should be updated to this seven-protein design and to lesson 6 ("need K to make K").

---

## 9. Illustrated references for non-specialists (curated, free)

Suggested order: big picture → enzymes as machines → the bucket problem.

1. **Khan Academy — Overview of glycolysis** (13 min, hand-drawn): https://www.youtube.com/watch?v=FE2jfTXAJHg ·
   article: https://www.khanacademy.org/science/biology/cellular-respiration-and-fermentation/glycolysis/a/glycolysis
2. **HHMI BioInteractive — Glycolysis animation** (~6 min; first of six on cellular respiration; series also has
   ATP Synthesis, useful for the turbine branch): https://www.biointeractive.org/classroom-resources/glycolysis
3. **PDB-101 Molecule of the Month — Glycolytic Enzymes** (Goodsell illustrations, one per enzyme; maps
   directly onto the Nax nodes; same site has a lactate dehydrogenase page under "Capturing the Energy in
   Food"): https://pdb101.rcsb.org/motm/50
4. **OpenStax Biology 2e §7.2 Glycolysis** (CC BY 4.0 — figures reusable in slides with attribution):
   https://openstax.org/books/biology-2e/pages/7-2-glycolysis
5. **Georgia Tech Biological Principles — Fermentation, mitochondria, and regulation** (why NAD⁺ must be
   regenerated): https://bioprinciples.biosci.gatech.edu/?p=4141
6. *Optional, denser:* Chandel N.S. (2021) Glycolysis. *Cold Spring Harb Perspect Biol* 13:a040535 —
   https://pmc.ncbi.nlm.nih.gov/articles/PMC8091952

**Where each protein shows up:** GATE → OpenStax 7.2 · TAG, SNIP, FLIP → PDB-101 + HHMI · GRAB, PAY → Khan + HHMI ·
DUMP → Georgia Tech + PDB-101 lactate dehydrogenase.

### Further citations used in the design

- Teusink B., Walsh M.C., van Dam K., Westerhoff H.V. (1998) The danger of metabolic pathways with turbo design.
  *Trends Biochem Sci* 23:162–169.
- Nelson D.L., Cox M.M. *Lehninger Principles of Biochemistry* — source of the phosphate energy-ladder values.
