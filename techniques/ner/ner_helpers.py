"""Support code for ner_pipeline.ipynb and the preliminary notebooks.

Only the plumbing lives here: downloading MACCROBAT, reading its brat
annotation files, aligning character-level annotations to WordPiece
tokens, and drawing embedding vectors as colored boxes (02a). Everything the class is actually about (tokens, embeddings,
attention, the classifier) stays in the notebook where students can see it.

MACCROBAT2018 (Caufield, 2019, CC BY 4.0, https://doi.org/10.6084/m9.figshare.9764942.v2)
is 200 PubMed Central case reports annotated in brat standoff format: for
each report a ``<pmid>.txt`` (one sentence per line) and a ``<pmid>.ann``
whose ``T`` lines look like::

    T7<TAB>Sign_symptom 78 90<TAB>palpitations

i.e. id, entity type, character start/end in the .txt file, and the
mention text. It is the dataset ``d4data/biomedical-ner-all`` was fine-tuned
on.
"""

from __future__ import annotations

import hashlib
import os
import urllib.request
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

MACCROBAT_URL = "https://ndownloader.figshare.com/files/17493650"  # MACCROBAT2018.zip
MACCROBAT_MD5 = "453c144879c303d248d74f56b6b40914"

# Shared with binder-env/postBuild, which pre-downloads the data into the
# Binder image so the notebook never needs network access in class.
DEFAULT_CACHE = Path(
    os.environ.get("MACCROBAT_DIR", Path.home() / ".cache" / "nlp2learn" / "maccrobat")
)


def download_maccrobat(cache_dir: Path | str = DEFAULT_CACHE) -> Path:
    """Download and unpack MACCROBAT2018 once; return the folder with the .txt/.ann files."""
    cache_dir = Path(cache_dir)
    if len(list(cache_dir.glob("*.ann"))) >= 200:
        return cache_dir
    cache_dir.mkdir(parents=True, exist_ok=True)
    zip_path = cache_dir / "MACCROBAT2018.zip"
    if not zip_path.exists():
        print(f"Downloading MACCROBAT2018 from figshare into {cache_dir} ...")
        urllib.request.urlretrieve(MACCROBAT_URL, zip_path)
    md5 = hashlib.md5(zip_path.read_bytes()).hexdigest()
    if md5 != MACCROBAT_MD5:
        zip_path.unlink()
        raise RuntimeError(f"MACCROBAT2018.zip checksum mismatch ({md5}); deleted, please retry.")
    with zipfile.ZipFile(zip_path) as zf:
        for member in zf.namelist():
            name = Path(member).name
            if name.endswith((".txt", ".ann")):
                (cache_dir / name).write_bytes(zf.read(member))
    return cache_dir


@dataclass
class Span:
    start: int
    end: int
    label: str
    text: str


@dataclass
class Sentence:
    doc_id: str
    text: str
    spans: list[Span] = field(default_factory=list)  # offsets relative to `text`


def read_brat(txt_path: Path) -> tuple[str, list[Span]]:
    """Return (document text, entity spans). Discontinuous entities ("10 15;20 25") are skipped."""
    text = txt_path.read_text(encoding="utf-8")
    spans = []
    for line in txt_path.with_suffix(".ann").read_text(encoding="utf-8").splitlines():
        if not line.startswith("T"):
            continue  # E (events), R (relations), A (attributes) are not entities
        _, type_and_offsets, mention = line.split("\t", 2)
        if ";" in type_and_offsets:
            continue
        label, start, end = type_and_offsets.split(" ")
        spans.append(Span(int(start), int(end), label, mention))
    return text, spans


def resolve_overlaps(spans: list[Span]) -> list[Span]:
    """Keep a non-overlapping subset, preferring longer spans.

    brat allows nested annotations ("previously healthy" = History contains
    "healthy" = Sign_symptom); a BIO tagger can only output one label per
    token, so we must choose. Longest-first is a simple, common rule.
    """
    kept: list[Span] = []
    for s in sorted(spans, key=lambda s: (-(s.end - s.start), s.start)):
        if all(s.end <= k.start or s.start >= k.end for k in kept):
            kept.append(s)
    return sorted(kept, key=lambda s: s.start)


def load_maccrobat_sentences(
    folder: Path | str, keep_labels: set[str] | None = None, max_docs: int | None = None
) -> list[Sentence]:
    """Split every report into its lines (= sentences) and re-base the spans onto each line.

    If ``keep_labels`` is given, other entity types are dropped *before*
    resolving overlaps, so they become plain "O" text.
    """
    sentences = []
    for txt_path in sorted(Path(folder).glob("*.txt"))[:max_docs]:
        text, spans = read_brat(txt_path)
        if keep_labels is not None:
            spans = [s for s in spans if s.label in keep_labels]
        spans = resolve_overlaps(spans)
        offset = 0
        for line in text.split("\n"):
            line_end = offset + len(line)
            inside = [
                Span(s.start - offset, s.end - offset, s.label, s.text)
                for s in spans
                if s.start >= offset and s.end <= line_end
            ]
            if line.strip():
                sentences.append(Sentence(txt_path.stem, line, inside))
            offset = line_end + 1  # +1 for the "\n"
    return sentences


def word_labels(tokenizer, sentence: Sentence, max_length: int = 512):
    """Tokenize a sentence and give each *word* a gold label.

    Returns ``(encoding, words)`` where ``words`` is a list of dicts with the
    word text, the index of its *first* WordPiece token (the position whose
    vector we will use for the whole word) and its gold entity label
    ("O" if no span covers it). A word is labeled with a span's type when
    its first character falls inside that span.
    """
    enc = tokenizer(
        sentence.text, return_offsets_mapping=True, truncation=True, max_length=max_length
    )
    words = []
    seen = set()
    for tok_idx, word_id in enumerate(enc.word_ids()):
        if word_id is None or word_id in seen:
            continue
        seen.add(word_id)
        char_start, char_end = enc.word_to_chars(word_id)
        label = "O"
        for s in sentence.spans:
            if s.start <= char_start < s.end:
                label = s.label
                break
        words.append(
            {"word": sentence.text[char_start:char_end], "first_token": tok_idx, "label": label}
        )
    return enc, words


# ---------------------------------------------------------------------------
# Embedding vectors as colored boxes (02a-static-embeddings.ipynb)
# ---------------------------------------------------------------------------
# One tiny box per dimension, red (negative) - white (0) - blue (positive),
# as in the clinical-embedding browser. Each vector becomes a small palette
# PNG embedded in an HTML table, so a notebook with hundreds of vectors stays
# small (~0.5 KB per vector).

BOX_COLUMNS = 48   # boxes per line: 768 dims -> 16 lines, 300 -> 7, 128 -> 3
BOX_SIZE = 3       # pixels per box, plus a 1-pixel transparent gap
BOX_LEVELS = 5     # color steps on each side of zero


def _box_palette():
    pal = [0, 0, 0]                                        # 0: transparent (gaps, padding)
    for level in range(-BOX_LEVELS, BOX_LEVELS + 1):       # 1 .. 2*BOX_LEVELS+1
        fade = round(255 * (1 - abs(level) / BOX_LEVELS))  # 255 at zero, 0 at full intensity
        pal += [255, fade, fade] if level < 0 else [fade, fade, 255]
    return pal


def vector_boxes(vector, scale: float) -> str:
    """An <img> tag drawing `vector` as boxes; values beyond +-scale get the full color."""
    import base64
    import io

    import numpy as np
    from PIL import Image

    v = np.asarray(vector, dtype=float)
    levels = np.clip(np.rint(v / scale * BOX_LEVELS), -BOX_LEVELS, BOX_LEVELS).astype(int)
    idx = np.zeros(-(-len(v) // BOX_COLUMNS) * BOX_COLUMNS, dtype=np.uint8)
    idx[: len(v)] = levels + BOX_LEVELS + 1
    grid = idx.reshape(-1, BOX_COLUMNS)
    pitch = BOX_SIZE + 1
    img = np.zeros((grid.shape[0] * pitch, grid.shape[1] * pitch), dtype=np.uint8)
    for dy in range(BOX_SIZE):
        for dx in range(BOX_SIZE):
            img[dy::pitch, dx::pitch] = grid
    pil = Image.fromarray(img, mode="P")
    pil.putpalette(_box_palette())
    buf = io.BytesIO()
    pil.save(buf, format="PNG", transparency=0, optimize=True)
    data = base64.b64encode(buf.getvalue()).decode()
    return f'<img src="data:image/png;base64,{data}" style="image-rendering:pixelated">'


def show_embeddings(table, title: str | None = None) -> None:
    """Display a DataFrame whose vector-valued columns are drawn as boxes.

    A column counts as a vector column when its cells are arrays; other
    cells are printed (None as a dash). Color scale: +-2 standard deviations
    of the values shown. Columns listed in ``table.attrs["same_scale"]``
    share one scale (pooled values), the others get one each.
    ``table.attrs["note"]``, if present, is printed under the table.
    """
    import html

    import numpy as np
    from IPython.display import HTML, display

    vector_cols = [c for c in table.columns
                   if any(isinstance(x, np.ndarray) for x in table[c])]
    shared = [c for c in table.attrs.get("same_scale", []) if c in vector_cols]
    scales = {}
    for c in vector_cols:
        pool = shared if c in shared else [c]
        values = np.concatenate([x for p in pool for x in table[p] if isinstance(x, np.ndarray)])
        scales[c] = 2 * float(values.std()) or 1.0

    th = 'style="text-align:left; padding:2px 8px; vertical-align:bottom"'
    td = 'style="text-align:left; padding:2px 8px; vertical-align:middle; font-family:monospace"'
    out = ['<table style="border-collapse:collapse; margin:4px 0 12px 0">']
    if title:
        out.append(f'<caption style="text-align:left; font-weight:bold; padding:4px 0">{html.escape(title)}</caption>')
    out.append("<tr>" + "".join(f"<th {th}>{html.escape(str(c))}</th>" for c in table.columns) + "</tr>")
    for _, row in table.iterrows():
        cells = []
        for c in table.columns:
            x = row[c]
            if c in vector_cols and isinstance(x, np.ndarray):
                cells.append(f"<td {td}>{vector_boxes(x, scales[c])}</td>")
            else:
                cells.append(f"<td {td}>{'—' if x is None else html.escape(str(x))}</td>")
        out.append("<tr>" + "".join(cells) + "</tr>")
    out.append("</table>")
    if table.attrs.get("note"):
        out.append(f'<div style="margin:-8px 0 16px 0; font-size:90%">{html.escape(table.attrs["note"])}</div>')
    display(HTML("".join(out)))
