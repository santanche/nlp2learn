#!/usr/bin/env python3
"""
protocell_lm.py -- DNA as a language: a minimal ancestor genome and two language models.

THE CLASSROOM STORY
-------------------
We invent a hypothetical minimal ancestor, "Protocell-0". Its genome architecture is
modelled on JCVI-syn3.0, the smallest synthetic cell ever built (473 genes, ~531 kb),
whose genes group into a few broad functional classes. Our organism is far smaller and
entirely synthetic -- and that is the point: WE wrote its grammar, so we know the
ground truth and can ask whether a language model rediscovers it.

The genome is a stream of CODONS. One codon = one word. The grammar:

    [noncoding spacer]  ATG  <class marker>  <body codons ...>  <class terminator>

Two dependencies are built in on purpose:

  (1) SHORT RANGE.  The class marker sets the codon-usage "dialect" of the body.
      A few body codons already hint at the class, so an n-gram can partly guess it.

  (2) LONG RANGE.   Each class ends its genes with its OWN terminator codon.
      Nothing in the last 40 codons reveals which one -- only the marker word at
      the very start of the gene does. An n-gram physically cannot see that far.
      A transformer can attend back to it.

Dependency (2) is the experiment. We measure it directly: at each gene's final
position, does the model pick the right terminator? Chance is 1/n_classes.

VOCABULARY STAGES (Ikehara's GNC-SNS hypothesis)
------------------------------------------------
    gnc   :  4 codons ->  4 amino acids   (GADV: Gly, Ala, Asp, Val)
    sns   : 16 codons -> 10 amino acids
    full  : 61 sense codons -> 20 amino acids

Run all three to show what vocabulary size does. In the GNC stage the language is so
small that reserving marker words leaves almost nothing to say with -- which is itself
worth twenty minutes of discussion.

USAGE
-----
    python protocell_lm.py --stage gnc
    python protocell_lm.py --stage sns  --steps 1200
    python protocell_lm.py --stage full --steps 1500
"""

import argparse
import math
import random
from collections import defaultdict

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

# =============================================================================
# 1. THE GENETIC CODE
# =============================================================================
# Built programmatically so students can SEE that GNC and SNS are filters on the
# standard table, not separate inventions.

BASES = "ACGT"          # DNA; the origin-of-life literature writes U. Same thing.
_ORDER = "ACGT"
_TABLE = (
    "KNKNTTTTRSRSIIMI"  # A**
    "QHQHPPPPRRRRLLLL"  # C**
    "EDEDAAAAGGGGVVVV"  # G**
    "*Y*YSSSS*CWCLFLF"  # T**
)

STANDARD_CODE = {
    _ORDER[i // 16] + _ORDER[(i // 4) % 4] + _ORDER[i % 4]: aa
    for i, aa in enumerate(_TABLE)
}
ALL_CODONS = sorted(STANDARD_CODE)                                   # 64
STOP_CODONS = [c for c in ALL_CODONS if STANDARD_CODE[c] == "*"]     # TAA TAG TGA
START = "ATG"


def code_stage(stage):
    """Return the coding codons for a vocabulary stage."""
    if stage == "gnc":                                   # G-N-C : 4 codons, GADV
        codons = [f"G{n}C" for n in BASES]
    elif stage == "sns":                                 # S-N-S, S in {G,C} : 16
        codons = [f"{a}{n}{b}" for a in "CG" for n in BASES for b in "CG"]
    elif stage == "full":                                # the 61 sense codons
        codons = [c for c in ALL_CODONS if STANDARD_CODE[c] != "*"]
    else:
        raise ValueError(stage)
    return sorted(codons)


# =============================================================================
# 2. THE PROTO-GENOME GENERATOR
# =============================================================================
# Gene classes echo the functional categories of JCVI-syn3.0. We use three so that
# each can own one of the three real stop codons.

CLASS_NAMES = ["expression", "preservation", "envelope"]


class ProtoGenome:
    """A hypothetical minimal ancestor with a known, hand-written grammar."""

    def __init__(self, stage="sns", n_genes=400, seed=0, gene_len=(30, 60),
                 spacer_len=(2, 6), alpha=0.15, grammar=None):
        self.stage = stage
        self.rng = np.random.default_rng(seed)
        self.gene_len, self.spacer_len, self.n_genes = gene_len, spacer_len, n_genes
        self.codons = code_stage(stage)

        # GNC has only four words; reserving three as markers would leave one.
        self.n_classes = 2 if stage == "gnc" else 3
        self.classes = CLASS_NAMES[:self.n_classes]

        if grammar is None:
            grammar = self._new_grammar(alpha)
        self.marker, self.terminator, self.body_codons, self.usage = grammar
        self.marker_to_class = {v: k for k, v in self.marker.items()}

        self.genes, self.tokens = [], []
        self._build()

    def _new_grammar(self, alpha):
        """Marker words, class terminators, and one codon-usage dialect per class."""
        # Marker codons are RESERVED: they never appear inside a body, so a single
        # attention head can learn "attend to the marker word".
        picks = self.rng.choice(len(self.codons), size=self.n_classes, replace=False)
        marker = {c: self.codons[i] for c, i in zip(self.classes, picks)}

        # Each class terminates with its own stop codon. In the reduced codes no
        # stop codon exists at all (TAA/TAG/TGA are neither GNC nor SNS) -- early
        # termination is a later invention. We borrow them as exogenous punctuation.
        terminator = {c: STOP_CODONS[i] for i, c in enumerate(self.classes)}

        body = [c for c in self.codons if c not in marker.values()]
        # Small alpha -> peaky, distinguishable dialects that still overlap, so
        # class identity is a statistical inference, like register or topic.
        usage = {c: self.rng.dirichlet([alpha] * len(body)) for c in self.classes}
        return marker, terminator, body, usage

    def grammar(self):
        return self.marker, self.terminator, self.body_codons, self.usage

    def _build(self):
        for _ in range(self.n_genes):
            # Spacers are noncoding and drawn from all 64 triplets, so the model
            # must also learn that gene interiors use a restricted vocabulary.
            k = int(self.rng.integers(*self.spacer_len))
            self.tokens.extend(self.rng.choice(ALL_CODONS, size=k).tolist())

            cls = self.classes[int(self.rng.integers(self.n_classes))]
            n = int(self.rng.integers(*self.gene_len))
            body = self.rng.choice(self.body_codons, size=n, p=self.usage[cls]).tolist()
            gene = [START, self.marker[cls], *body, self.terminator[cls]]

            self.genes.append({"class": cls, "start": len(self.tokens), "codons": gene})
            self.tokens.extend(gene)

    # -- convenience -------------------------------------------------------
    def dna(self):
        return "".join(self.tokens)

    def protein(self, gene):
        return "".join(STANDARD_CODE[c] for c in gene["codons"][1:-1])

    def summary(self):
        n = len(self.tokens)
        lines = [f"stage={self.stage}   vocabulary: {len(self.codons)} coding codons "
                 f"-> {len({STANDARD_CODE[c] for c in self.codons})} amino acids",
                 f"genome: {self.n_genes} genes / {n} codons / {n * 3} bp"]
        for c in self.classes:
            lines.append(f"   {c:<13} marker {self.marker[c]}   "
                         f"terminator {self.terminator[c]}")
        return "\n".join(lines)


# =============================================================================
# 3. TOKENISER  -- one token = one codon
# =============================================================================
# This is the whole "DNA as language" move: the alphabet has 4 letters, but the
# LANGUAGE has 64 words.

class CodonVocab:
    def __init__(self):
        self.itos = ["<bos>"] + ALL_CODONS
        self.stoi = {s: i for i, s in enumerate(self.itos)}

    def __len__(self):
        return len(self.itos)

    def encode(self, toks):
        return [self.stoi[t] for t in toks]

    def decode(self, ids):
        return [self.itos[i] for i in ids]


# =============================================================================
# 4. BASELINE: N-GRAM OVER CODONS
# =============================================================================

class NGram:
    """Add-k smoothed n-gram. Context = the n-1 previous codons, and nothing else."""

    def __init__(self, n=3, k=0.1, vocab_size=65):
        self.n, self.k, self.V = n, k, vocab_size
        self.counts = defaultdict(lambda: np.zeros(vocab_size))

    def fit(self, ids):
        seq = [0] * (self.n - 1) + list(ids)
        for i in range(self.n - 1, len(seq)):
            self.counts[tuple(seq[i - self.n + 1:i])][seq[i]] += 1
        return self

    def dist(self, ctx):
        c = self.counts.get(ctx)
        c = np.zeros(self.V) if c is None else c
        return (c + self.k) / (c.sum() + self.k * self.V)

    def perplexity(self, ids):
        seq = [0] * (self.n - 1) + list(ids)
        tot = sum(math.log(self.dist(tuple(seq[i - self.n + 1:i]))[seq[i]])
                  for i in range(self.n - 1, len(seq)))
        return math.exp(-tot / len(ids))

    def predict_at(self, ids, pos):
        """Distribution over the token at index `pos`, given what precedes it."""
        seq = [0] * (self.n - 1) + list(ids)
        j = pos + self.n - 1
        return self.dist(tuple(seq[j - self.n + 1:j]))

    def generate(self, n_tokens, rng):
        out, ctx = [], tuple([0] * (self.n - 1))
        for _ in range(n_tokens):
            p = self.dist(ctx)
            p = p / p.sum()
            nxt = int(rng.choice(self.V, p=p))
            out.append(nxt)
            ctx = (ctx + (nxt,))[1:] if self.n > 1 else ()
        return out


# =============================================================================
# 5. A TINY TRANSFORMER  (1 layer, so the attention map stays readable)
# =============================================================================

class TinyLM(nn.Module):
    def __init__(self, vocab, d=64, heads=2, ctx=96):
        super().__init__()
        self.ctx, self.vocab = ctx, vocab
        self.tok = nn.Embedding(vocab, d)
        self.pos = nn.Embedding(ctx, d)
        self.ln1 = nn.LayerNorm(d)
        self.attn = nn.MultiheadAttention(d, heads, batch_first=True)
        self.ln2 = nn.LayerNorm(d)
        self.mlp = nn.Sequential(nn.Linear(d, 4 * d), nn.GELU(), nn.Linear(4 * d, d))
        self.lnf = nn.LayerNorm(d)
        self.head = nn.Linear(d, vocab)

    def forward(self, x, return_attn=False):
        T = x.shape[1]
        h = self.tok(x) + self.pos(torch.arange(T, device=x.device))
        mask = torch.triu(torch.ones(T, T, device=x.device, dtype=torch.bool), 1)
        a, w = self.attn(*(self.ln1(h),) * 3, attn_mask=mask,
                         need_weights=True, average_attn_weights=True)
        h = h + a
        h = h + self.mlp(self.ln2(h))
        logits = self.head(self.lnf(h))
        return (logits, w) if return_attn else logits


def train(model, ids, steps=1200, ctx=96, bs=32, lr=3e-3, device="cpu", log=300):
    model.to(device).train()
    opt = torch.optim.AdamW(model.parameters(), lr=lr)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, steps)
    data = torch.tensor(ids, dtype=torch.long)
    g = torch.Generator().manual_seed(0)
    for s in range(1, steps + 1):
        i = torch.randint(0, len(data) - ctx - 1, (bs,), generator=g)
        x = torch.stack([data[j:j + ctx] for j in i]).to(device)
        y = torch.stack([data[j + 1:j + ctx + 1] for j in i]).to(device)
        loss = F.cross_entropy(model(x).reshape(-1, model.vocab), y.reshape(-1))
        opt.zero_grad(); loss.backward(); opt.step(); sched.step()
        if s % log == 0 or s == 1:
            print(f"    step {s:>5}   loss {loss.item():.4f}")
    return model


@torch.no_grad()
def nn_perplexity(model, ids, ctx=96, device="cpu"):
    model.eval()
    t = torch.tensor(ids, dtype=torch.long, device=device)
    tot = cnt = 0
    for s in range(0, len(t) - ctx - 1, ctx):
        lp = F.log_softmax(model(t[s:s + ctx].unsqueeze(0)), -1)
        y = t[s + 1:s + ctx + 1]
        tot += lp[0, torch.arange(ctx), y].sum().item()
        cnt += ctx
    return math.exp(-tot / cnt)


@torch.no_grad()
def nn_generate(model, n_tokens, ctx=96, device="cpu", seed=0, temp=1.0):
    model.eval()
    torch.manual_seed(seed)
    out = [0]
    while len(out) < n_tokens + 1:
        logits = model(torch.tensor([out[-ctx:]], device=device))[0, -1] / temp
        out.append(int(torch.multinomial(F.softmax(logits, -1), 1)))
    return out[1:]


# =============================================================================
# 6. THE PROBE THAT SETTLES THE ARGUMENT
# =============================================================================

def terminator_probe(predict_fn, genome, vocab, max_genes=200):
    """At each gene's last position, does the model pick the right terminator?

    The answer is written ONLY in the marker word at the start of the gene, 30-60
    codons earlier. Chance level is 1/n_classes.
    """
    ids = vocab.encode(genome.tokens)
    cand = [vocab.stoi[genome.terminator[c]] for c in genome.classes]
    hits = total = 0
    for g in genome.genes[:max_genes]:
        pos = g["start"] + len(g["codons"]) - 1          # the terminator's index
        p = predict_fn(ids, pos)
        if p is None:
            continue
        if cand[int(np.argmax([p[i] for i in cand]))] == vocab.stoi[
                genome.terminator[g["class"]]]:
            hits += 1
        total += 1
    return hits / total if total else float("nan")


@torch.no_grad()
def marker_attention(model, genome, vocab, ctx=96, device="cpu", max_genes=150):
    """Attention paid by body codons back to their gene's marker word,
    as a multiple of the uniform-attention baseline. >1 means it found it."""
    model.eval()
    ids = vocab.encode(genome.tokens)
    ratios = []
    for g in genome.genes[:max_genes]:
        mpos = g["start"] + 1
        w0 = max(0, mpos - 2)
        if w0 + ctx > len(ids):
            continue
        _, w = model(torch.tensor([ids[w0:w0 + ctx]], device=device), return_attn=True)
        m = mpos - w0
        for q in range(m + 4, min(ctx, m + len(g["codons"]) - 1)):
            ratios.append(w[0, q, m].item() * (q + 1))
    return float(np.mean(ratios)) if ratios else float("nan")


def parse_orfs(codons, terminators):
    """Pull ATG ... terminator 'sentences' out of a generated stream."""
    orfs, i, term = [], 0, set(terminators)
    while i < len(codons):
        if codons[i] == START:
            j = i + 1
            while j < len(codons) and codons[j] not in term:
                j += 1
            if j < len(codons):
                orfs.append(codons[i:j + 1])
                i = j + 1
                continue
        i += 1
    return orfs


def grammar_report(codons, genome, label):
    """Three checks a student can first eyeball, then quantify."""
    terms = list(genome.terminator.values())
    orfs = parse_orfs(codons, terms)
    if not orfs:
        print(f"  {label:<14}  no complete genes produced")
        return
    idx = {c: i for i, c in enumerate(genome.body_codons)}
    clean = agree = 0
    lens = []
    for o in orfs:
        body, end = o[2:-1], o[-1]
        lens.append(len(body))
        if body and all(c in idx for c in body):
            clean += 1
        # does the terminator match the class the marker word announced?
        if o[1] in genome.marker_to_class and end == genome.terminator[
                genome.marker_to_class[o[1]]]:
            agree += 1
    n = len(orfs)
    print(f"  {label:<14}  genes={n:<4} well-formed body={clean / n:6.1%}   "
          f"marker matches terminator={agree / n:6.1%}   "
          f"mean length={np.mean(lens):5.1f}")


# =============================================================================
# MAIN
# =============================================================================

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage", default="sns", choices=["gnc", "sns", "full"])
    ap.add_argument("--genes", type=int, default=400)
    ap.add_argument("--steps", type=int, default=1200)
    ap.add_argument("--ctx", type=int, default=96)
    ap.add_argument("--seed", type=int, default=0)
    args = ap.parse_args()

    torch.manual_seed(args.seed)
    random.seed(args.seed)
    rule = "=" * 78

    # ---- 1. build the organism -------------------------------------------
    print(rule)
    print("PROTOCELL-0  --  a hypothetical minimal ancestor")
    print(rule)
    train_g = ProtoGenome(args.stage, n_genes=args.genes, seed=args.seed)
    # the held-out genome must speak the SAME language: reuse the grammar
    test_g = ProtoGenome(args.stage, n_genes=max(80, args.genes // 4),
                         seed=args.seed + 999, grammar=train_g.grammar())
    print(train_g.summary())

    g0 = train_g.genes[0]
    print(f"\nfirst gene  [{g0['class']}]")
    print("   DNA      " + " ".join(g0["codons"][:12]) + " ... " + g0["codons"][-1])
    print("   protein  " + train_g.protein(g0)[:44] + " ...")

    vocab = CodonVocab()
    tr, te = vocab.encode(train_g.tokens), vocab.encode(test_g.tokens)
    chance = 1 / train_g.n_classes
    print(f"\ntokens: {len(tr)} train / {len(te)} held out    vocab: {len(vocab)}")

    # ---- 2. n-gram baselines ---------------------------------------------
    print("\n" + rule)
    print("N-GRAM MODELS   (context = n-1 codons, and nothing more)")
    print(rule)
    print(f"{'model':<14}{'perplexity':>13}{'terminator accuracy':>24}")
    rng = np.random.default_rng(args.seed)
    ngrams = {}
    for n in (1, 2, 3, 4):
        m = NGram(n, k=0.1, vocab_size=len(vocab)).fit(tr)
        ngrams[n] = m
        acc = terminator_probe(m.predict_at, test_g, vocab)
        print(f"{n}-gram{'':<8}{m.perplexity(te):13.3f}{acc:23.1%}")
    print(f"{'chance':<14}{'--':>13}{chance:23.1%}")

    # ---- 3. the transformer ----------------------------------------------
    print("\n" + rule)
    print("TINY TRANSFORMER   (1 layer, 2 heads, d=64 -- it can look back)")
    print(rule)
    model = TinyLM(len(vocab), d=64, heads=2, ctx=args.ctx)
    train(model, tr, steps=args.steps, ctx=args.ctx)

    @torch.no_grad()
    def nn_predict(ids, pos):
        lo = max(0, pos - args.ctx)
        x = torch.tensor([ids[lo:pos]])
        if x.shape[1] < 2:
            return None
        return F.softmax(model(x)[0, -1], -1).numpy()

    ppl = nn_perplexity(model, te, ctx=args.ctx)
    acc = terminator_probe(nn_predict, test_g, vocab)
    print(f"\n{'model':<14}{'perplexity':>13}{'terminator accuracy':>24}")
    print(f"{'transformer':<14}{ppl:13.3f}{acc:23.1%}")

    ratio = marker_attention(model, test_g, vocab, ctx=args.ctx)
    print(f"\nattention on the marker word, vs uniform baseline:  {ratio:.2f}x")
    print("(>1 means the model learned to look back at the gene's opening word)")

    # ---- 4. generation ----------------------------------------------------
    print("\n" + rule)
    print("GENERATION   --   can each model write a valid gene?")
    print(rule)
    grammar_report(vocab.decode(ngrams[2].generate(6000, rng)), train_g, "2-gram")
    grammar_report(vocab.decode(ngrams[3].generate(6000, rng)), train_g, "3-gram")
    grammar_report(vocab.decode(nn_generate(model, 6000, ctx=args.ctx)),
                   train_g, "transformer")
    grammar_report(train_g.tokens, train_g, "PROTOCELL-0")
    print("\n(the last row is the real genome -- the ceiling)")


if __name__ == "__main__":
    main()
