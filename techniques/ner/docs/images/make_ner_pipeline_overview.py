"""Draws ner_pipeline_overview.svg, the overview figure of ner_pipeline.ipynb
(style after Jay Alammar's "A Visual Guide to Using BERT for the First Time").

The ids, BIO labels and the ##pati probabilities (79% B-Sign_symptom / 21% O)
were read from d4data/biomedical-ner-all on the walkthrough sentence; they are
hard-coded in `cols` and in the callout below. Standard library only:

    python docs/images/make_ner_pipeline_overview.py      # from techniques/ner
"""
import sys
from html import escape
from pathlib import Path

OUT = sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).with_name("ner_pipeline_overview.svg"))

# ---- palette (Alammar-like) -------------------------------------------------
BG, GREY_TXT, ARROW = "#f2f2f2", "#5a5a5a", "#a9a9a9"
YEL_FILL, YEL_STROKE, BAND, BAND0, BAND_TXT = "#fdf0c4", "#f0a04b", "#f8e2a6", "#fbe8b9", "#8a6a2f"
GREEN, GREEN2, PURPLE = "#d8e8cc", "#e2eed9", "#9b3fb5"
TEAL, PINK, BLUE = "#3ba99c", "#e8467c", "#3c9fdc"
VEC_FILL, VEC_STROKE = "#fbe5ec", "#d6aab8"
TYPE = {"Age": "#c2a5cf", "Sex": "#a6dba0", "Sign_symptom": "#f4a582"}
O_FILL = "#e3e3e3"
SANS = "Helvetica Neue, Helvetica, Arial, Liberation Sans, sans-serif"
MONO = "Menlo, Consolas, DejaVu Sans Mono, Liberation Mono, monospace"

# ---- data: 17 of the 33 positions --------------------------------------------
cols = [  # (piece, id, BIO label, entity type)
    ("[CLS]", 101, "O", None), ("a", 1037, "O", None),
    ("44", 4008, "B", "Age"), ("-", 1011, "I", "Age"), ("year", 2095, "I", "Age"),
    ("-", 1011, "I", "Age"), ("old", 2214, "I", "Age"), ("woman", 2450, "B", "Sex"),
    ("…", None, None, None),
    ("nausea", 19029, "B", "Sign_symptom"), ("and", 1998, "O", None),
    ("con", 9530, "B", "Sign_symptom"), ("##sti", 16643, "O", None),
    ("##pati", 24952, "B", "Sign_symptom"), ("##on", 2239, "O", None),
    (".", 1012, "O", None), ("[SEP]", 102, "O", None),
]
SPECIAL = {"[CLS]", "[SEP]"}
NONFIRST = {12, 13, 14}           # ##sti ##pati ##on: not the first piece of their word
PATI = 13

W, H = 1900, 1110
X0, STEP, CW = 270, 80, 72
X_END = X0 + len(cols) * STEP - (STEP - CW)          # right edge of last column
RX = 1665                                             # right-hand annotation column


def cx(i):
    return X0 + i * STEP + CW / 2


svg = []
add = svg.append


def text(x, y, s, size=14, fill=GREY_TXT, family=SANS, anchor="start", weight="normal", style="normal"):
    add(f'<text x="{x:.1f}" y="{y:.1f}" font-family="{family}" font-size="{size}" fill="{fill}" '
        f'text-anchor="{anchor}" font-weight="{weight}" font-style="{style}">{escape(s)}</text>')


def rect(x, y, w, h, fill, stroke="none", rx=3, sw=1, extra=""):
    add(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" fill="{fill}" '
        f'stroke="{stroke}" stroke-width="{sw}" {extra}/>')


def arrow(x, y1, y2, color=ARROW, dash=False, width=3):
    d = ' stroke-dasharray="5 5"' if dash else ""
    add(f'<line x1="{x:.1f}" y1="{y1:.1f}" x2="{x:.1f}" y2="{y2 + 9:.1f}" stroke="{color}" '
        f'stroke-width="{width}"{d}/>')
    add(f'<path d="M{x - 7:.1f},{y2 + 11:.1f} L{x:.1f},{y2:.1f} L{x + 7:.1f},{y2 + 11:.1f} Z" fill="{color}"/>')


add(f'<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 {W} {H}" width="{W}" height="{H}">')
rect(0, 0, W, H, BG, rx=0)

# ---- y layout (top → bottom) -------------------------------------------------
Y_OUT = 62            # baseline of the output sentence
Y_SPAN, H_SPAN = 128, 36
Y_BIO, H_BIO = 228, 46
Y_CLF, H_CLF = 330, 84
Y_VEC, H_VEC = 470, 22
Y_ENC = 530
ENC_H = 316
Y_IDS, H_IDS = 900, 46
Y_TOK, H_TOK = 954, 34
Y_SENT = 1044

# ---- left labels --------------------------------------------------------------
def left(y, lines):
    for k, (s, color, size, weight) in enumerate(lines):
        text(30, y + k * (size + 6), s, size=size, fill=color, weight=weight)

left(Y_OUT - 6, [("Output", PINK, 20, "bold"), ("entities", PINK, 15, "normal")])
left(Y_SPAN + 14, [("Decoding", GREY_TXT, 18, "bold"), ("first piece of each word,", GREY_TXT, 13, "normal"),
                    ("then B/I → spans", GREY_TXT, 13, "normal")])
left(Y_BIO + 14, [("Classifier output", PINK, 18, "bold"), ("one BIO label per piece", GREY_TXT, 13, "normal")])
left(Y_CLF + 40, [("Classifier head", GREY_TXT, 20, "bold")])
left(Y_VEC - 8, [("Classifier input", BLUE, 18, "bold"), ("Encoder output", PINK, 18, "bold"),
                 ("768 numbers per piece", GREY_TXT, 13, "normal")])
left(Y_ENC + 160, [("Encoder", GREY_TXT, 20, "bold")])
left(Y_IDS + 20, [("Input", TEAL, 20, "bold"), ("ids + WordPiece", TEAL, 15, "normal"),
                  ("tokens", TEAL, 15, "normal")])
left(Y_SENT - 4, [("Sentence", GREY_TXT, 18, "bold")])

# ---- sentence and tokenizer arrow --------------------------------------------
text(X0, Y_SENT, "A 44-year-old woman presented with a 3-day history of right flank and lower quadrant "
                 "abdominal pain associated with nausea and constipation.", size=16, style="italic")
arrow((X0 + X_END) / 2, Y_SENT - 22, Y_TOK + H_TOK + 4)
text((X0 + X_END) / 2 + 16, Y_SENT - 26, "WordPiece tokenizer (lower-cases, splits into pieces)", size=13)
text(X0, Y_TOK + H_TOK + 22, "17 of the 33 positions shown", size=12, fill="#8c8c8c")

# ---- input rows ---------------------------------------------------------------
for i, (piece, pid, lab, typ) in enumerate(cols):
    x = X0 + i * STEP
    if pid is None:
        for y in (Y_IDS + 30, Y_TOK + 23, Y_VEC + 17, Y_BIO + 30):
            text(cx(i), y, "…", size=22, anchor="middle", fill="#8c8c8c")
        continue
    color = PURPLE if piece in SPECIAL else "#222"
    rect(x, Y_IDS, CW, H_IDS, GREEN)
    text(cx(i), Y_IDS + 29, str(pid), size=15, family=MONO, anchor="middle", fill=color)
    rect(x, Y_TOK, CW, H_TOK, GREEN2)
    text(cx(i), Y_TOK + 22, piece, size=15, family=MONO, anchor="middle", fill=color)
    arrow(cx(i), Y_IDS - 4, Y_ENC + ENC_H + 4)

# ---- encoder box ----------------------------------------------------------------
enc_h = ENC_H
rect(X0 - 18, Y_ENC, X_END - X0 + 36, enc_h, YEL_FILL, YEL_STROKE, rx=34, sw=2.5)
text((X0 + X_END) / 2, Y_ENC + 36, "DistilBERT", size=26, anchor="middle")
text((X0 + X_END) / 2, Y_ENC + 60, "d4data/biomedical-ner-all  ·  fine-tuned on case reports (MACCROBAT)",
     size=14, anchor="middle", fill="#8a7a5a")
band_x, band_w = X0 + 10, X_END - X0 - 20
for k in range(7):                       # k = 0 is layer 0 (bottom band)
    y = Y_ENC + enc_h - 26 - (k + 1) * 30
    rect(band_x, y, band_w, 24, BAND0 if k == 0 else BAND, rx=6)
    label = ("layer 0 · word + position embeddings (static lookup)" if k == 0
             else f"Transformer layer {k} · self-attention (12 heads) + feed-forward")
    text(band_x + 14, y + 17, label, size=13, fill=BAND_TXT)
# ---- vectors ----------------------------------------------------------------------
for i, (piece, pid, lab, typ) in enumerate(cols):
    if pid is None:
        continue
    arrow(cx(i), Y_ENC - 4, Y_VEC + H_VEC + 4)
    for c in range(3):
        rect(cx(i) - 33 + c * 22, Y_VEC, 22, H_VEC, VEC_FILL, VEC_STROKE, rx=0, sw=1.5)
    arrow(cx(i), Y_VEC - 4, Y_CLF + H_CLF + 4)

# ---- classifier box ------------------------------------------------------------------
rect(X0 - 18, Y_CLF, X_END - X0 + 36, H_CLF, YEL_FILL, YEL_STROKE, rx=26, sw=2.5)
text((X0 + X_END) / 2, Y_CLF + 38, "Linear(768 → 84) + softmax", size=24, anchor="middle")
text((X0 + X_END) / 2, Y_CLF + 64, "the same weights for every piece  ·  84 BIO labels over 43 entity types",
     size=14, anchor="middle", fill="#8a7a5a")

# ---- BIO labels ----------------------------------------------------------------------
for i, (piece, pid, lab, typ) in enumerate(cols):
    if pid is None:
        continue
    arrow(cx(i), Y_CLF - 4, Y_BIO + H_BIO + 4)
    x = X0 + i * STEP
    fill = TYPE[typ] if typ else O_FILL
    faded = piece in SPECIAL
    rect(x, Y_BIO, CW, H_BIO, fill, "#ffffff" if i != PATI else PINK, rx=4,
         sw=1 if i != PATI else 2.5, extra='opacity="0.45"' if faded else "")
    text(cx(i), Y_BIO + 31, lab, size=22, family=MONO, anchor="middle",
         fill="#9a9a9a" if faded else "#222", weight="bold")

# ---- decoding: arrows from pieces to spans --------------------------------------------
for i in [2, 3, 4, 5, 6, 7, 9, 11]:
    arrow(cx(i), Y_BIO - 4, Y_SPAN + H_SPAN + 4, width=2.5)
for i in NONFIRST:
    add(f'<line x1="{cx(i):.1f}" y1="{Y_BIO - 4}" x2="{cx(i):.1f}" y2="{Y_SPAN + H_SPAN + 6}" '
        f'stroke="#c4c4c4" stroke-width="2" stroke-dasharray="4 5"/>')

spans = [(2, 6, "44-year-old", "Age"), (7, 7, "woman", "Sex"),
         (9, 9, "nausea", "Sign_symptom"), (11, 14, "constipation", "Sign_symptom")]
for a, b, word, typ in spans:
    x1, x2 = X0 + a * STEP, X0 + b * STEP + CW
    rect(x1, Y_SPAN, x2 - x1, H_SPAN, TYPE[typ], rx=8)
    text((x1 + x2) / 2, Y_SPAN + 24, word, size=16, family=MONO, anchor="middle", fill="#222", weight="bold")

# note on the first-piece rule
text(X0 + 15 * STEP - 4, Y_SPAN + 14, "only the label of “con”", size=12, fill="#8c8c8c")
text(X0 + 15 * STEP - 4, Y_SPAN + 30, "decides; ##sti ##pati ##on", size=12, fill="#8c8c8c")
text(X0 + 15 * STEP - 4, Y_SPAN + 46, "are ignored", size=12, fill="#8c8c8c")

# ---- output sentence (displaCy-like) -----------------------------------------------------
segments = [("A ", None), ("44-year-old", "Age"), (" ", None), ("woman", "Sex"),
            (" presented with a 3-day history … associated with ", None),
            ("nausea", "Sign_symptom"), (" and ", None), ("constipation", "Sign_symptom"), (".", None)]
CH, TCH = 9.6, 6.6                 # mono char widths at 16px and 11px
x = X0
for seg, typ in segments:
    if typ is None:
        text(x, Y_OUT, seg, size=16, family=MONO, fill="#333")
        x += len(seg) * CH
    else:
        tag = typ.upper()
        w = len(seg) * CH + 10 + len(tag) * TCH + 14
        rect(x, Y_OUT - 21, w, 30, TYPE[typ], rx=6)
        text(x + 7, Y_OUT, seg, size=16, family=MONO, fill="#222")
        text(x + 7 + len(seg) * CH + 8, Y_OUT - 1, tag, size=11, family=MONO, fill="#333", weight="bold")
        x += w
arrow((X0 + X_END) / 2 - 300, Y_SPAN - 4, Y_OUT + 16)

# ---- right column: legend, softmax callout, shapes ----------------------------------------
text(RX, Y_OUT - 12, "Entity types", size=15, weight="bold")
for k, (name, col) in enumerate(list(TYPE.items()) + [("O (outside)", O_FILL)]):
    rect(RX, Y_OUT + 2 + k * 24, 18, 16, col, rx=3)
    text(RX + 26, Y_OUT + 15 + k * 24, name, size=13)

# softmax callout for ##pati (cf. the 15 % / 85 % box of the original)
cy0 = Y_BIO - 18
rect(RX, cy0, 64, 34, "#f2a8bf", "#c9c9c9", rx=0, sw=1.5)
rect(RX, cy0 + 34, 64, 34, "#fbe5ec", "#c9c9c9", rx=0, sw=1.5)
text(RX + 32, cy0 + 22, "79%", size=15, anchor="middle", fill="#222")
text(RX + 32, cy0 + 56, "21%", size=15, anchor="middle", fill="#222")
text(RX + 76, cy0 + 22, "B-Sign_symptom", size=14, fill=PINK, weight="bold")
text(RX + 76, cy0 + 56, "O", size=14, fill=PINK, weight="bold")
text(RX, cy0 + 88, "softmax for “##pati”", size=13)
text(RX, cy0 + 106, "(84 probabilities; top 2)", size=12, fill="#8c8c8c")
# dashed connector from the ##pati box
px = cx(PATI)
add(f'<path d="M{px:.1f},{Y_BIO + H_BIO + 2} L{px:.1f},{Y_BIO + H_BIO + 22} L{RX - 14},{Y_BIO + H_BIO + 22} '
    f'L{RX - 14},{cy0 + 34} L{RX - 4},{cy0 + 34}" fill="none" stroke="{PINK}" stroke-width="1.8" '
    f'stroke-dasharray="5 4"/>')

for y, s in [(Y_CLF + 40, "logits (1, 33, 84)"), (Y_VEC + 16, "hidden_states[-1]"),
             (Y_VEC + 34, "(1, 33, 768)"), (Y_ENC + 150, "hidden_states: 7 ×"),
             (Y_ENC + 168, "(1, 33, 768)"), (Y_ENC + 196, "attentions: 6 ×"),
             (Y_ENC + 214, "(1, 12, 33, 33)"), (Y_IDS + 28, "input_ids (1, 33)")]:
    text(RX, y, s, size=13, family=MONO, fill="#7a7a7a")

text(W - 20, H - 16, "Style after Jay Alammar, “A Visual Guide to Using BERT for the First Time”. "
                     "Values from d4data/biomedical-ner-all on this sentence.",
     size=11, anchor="end", fill="#9a9a9a")
add("</svg>")
open(OUT, "w").write("\n".join(svg))
print("wrote", OUT)
