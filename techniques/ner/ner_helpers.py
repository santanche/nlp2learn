"""Support code for ner_pipeline.ipynb.

Only the plumbing lives here: downloading MACCROBAT, reading its brat
annotation files, and aligning character-level annotations to WordPiece
tokens. Everything the class is actually about (tokens, embeddings,
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
