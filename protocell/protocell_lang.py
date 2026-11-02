"""
protocell_lang.py -- the Protocell-0 language, defined once.

This module is the single source of truth for the language: bases, transcription, the code
table, residues, reserved (structural) codons, the seven Nax genes and their codon dialects.
Notebooks import it; the web labs read `data/web/language.json`, which is exported from
`language_as_dict()`. Never re-type these tables anywhere else.

Specification: docs/design-spec.md, sections 1 and 2.
"""

from itertools import product

GENERATOR_VERSION = "1.0.0"

# ----------------------------------------------------------------------------
# Bases and transcription (design-spec 1.1)
# ----------------------------------------------------------------------------
# Real analogues: W=A, X=G, Y=C, Z=T. In RNA, Z (zoltine) becomes V (vethine), as T becomes U.

DNA_BASES = "WXYZ"
RNA_BASES = "WXYV"

BASES = {
    "W": {"name": "welline", "pairs_with": "Z", "bond": "weak", "real_analogue": "A"},
    "X": {"name": "xoline", "pairs_with": "Y", "bond": "strong", "real_analogue": "G"},
    "Y": {"name": "ythrine", "pairs_with": "X", "bond": "strong", "real_analogue": "C"},
    "Z": {"name": "zoltine", "pairs_with": "W", "bond": "weak", "real_analogue": "T"},
    "V": {"name": "vethine", "pairs_with": "W", "bond": "weak", "real_analogue": "U",
          "rna_only": True},
}

TRANSCRIPTION = {"Z": "V"}


def transcribe(codon):
    """DNA codon -> RNA codon (Z becomes V; nothing else changes)."""
    return codon.replace("Z", "V")


def to_dna(codon):
    """RNA codon -> DNA codon (V becomes Z)."""
    return codon.replace("V", "Z")


ALL_CODONS = ["".join(t) for t in product(DNA_BASES, repeat=3)]  # 64 DNA triplets

# ----------------------------------------------------------------------------
# Residues (design-spec 1.3). Names end in -an; real analogues from the SNS code.
# ----------------------------------------------------------------------------

RESIDUES = {
    "Nm": {"name": "neman", "character": "smallest, flexible", "real_analogue": "Gly", "stage": 1},
    "Kv": {"name": "korvan", "character": "small hydrophobic", "real_analogue": "Ala", "stage": 1},
    "Ds": {"name": "dresan", "character": "acidic", "real_analogue": "Asp", "stage": 1},
    "Th": {"name": "thulan", "character": "branched hydrophobic", "real_analogue": "Val", "stage": 1},
    "My": {"name": "myrran", "character": "acidic, longer", "real_analogue": "Glu", "stage": 2},
    "Os": {"name": "osvan", "character": "basic, ring", "real_analogue": "His", "stage": 2},
    "Si": {"name": "sirran", "character": "basic, long", "real_analogue": "Arg", "stage": 2},
    "Pv": {"name": "pelvan", "character": "cyclic, rigid", "real_analogue": "Pro", "stage": 2},
    "Qu": {"name": "quellan", "character": "amide", "real_analogue": "Gln", "stage": 2},
    "Lu": {"name": "lurran", "character": "large hydrophobic", "real_analogue": "Leu", "stage": 2},
}

# ----------------------------------------------------------------------------
# Code table, Stages I-II (design-spec 1.2): a renamed copy of Ikehara's GNC-SNS code.
# Coding rule [XY] N [XY]; Stage I is the subset X N Y. DNA spelling.
# ----------------------------------------------------------------------------

CODE_TABLE = {
    # first.third = X.Y (Stage I)
    "XWY": "Ds", "XXY": "Nm", "XYY": "Kv", "XZY": "Th",
    # first.third = X.X
    "XWX": "My", "XXX": "Nm", "XYX": "Kv", "XZX": "Th",
    # first.third = Y.Y
    "YWY": "Os", "YXY": "Si", "YYY": "Pv", "YZY": "Lu",
    # first.third = Y.X
    "YWX": "Qu", "YXX": "Si", "YYX": "Pv", "YZX": "Lu",
}

CODING_CODONS = list(CODE_TABLE)
STAGE_I_CODONS = [c for c in CODING_CODONS if c[0] == "X" and c[2] == "Y"]

# Rows and columns of the printed grid (rows: first.third base; columns: middle base).
CODE_GRID_ROWS = [("X", "Y"), ("X", "X"), ("Y", "Y"), ("Y", "X")]
CODE_GRID_COLUMNS = list(DNA_BASES)


def synonyms(residue):
    """Codons coding for a residue (one or two at Stage II)."""
    return [c for c, r in CODE_TABLE.items() if r == residue]


def translate(codons):
    """Body codons (DNA or RNA) -> list of residue codes."""
    return [CODE_TABLE[to_dna(c)] for c in codons]


# ----------------------------------------------------------------------------
# Reserved (structural) codons (design-spec 1.4). All lie outside [XY]N[XY].
# ----------------------------------------------------------------------------

PROMOTER = ("ZWZ", "WWZ")             # Pribnow box TATAAT; not transcribed
RBS = ("WXX", "WXX")                  # Shine-Dalgarno AGGAGG
INITIATOR = "WXZ"                     # start codon
K_SENSOR = ("WYW", "YWZ", "WYW")      # riboswitch / attenuator sensing domain
TX_TERMINATOR = ("WZZ", "ZZZ")        # rho-independent terminator U-run
ATTENUATOR = TX_TERMINATOR            # the same word, used as a conditional terminator

# Multi-codon motifs: they may occur only where the grammar puts them.
MULTI_CODON_MOTIFS = {
    "promoter": PROMOTER,
    "rbs": RBS,
    "ksensor": K_SENSOR,
    "tx_terminator": TX_TERMINATOR,   # also the attenuator
}

SIGNALS = [
    {"signal": "promoter", "codons": list(PROMOTER), "real_analogue": "Pribnow box TATAAT",
     "transcribed": False},
    {"signal": "rbs", "codons": list(RBS), "real_analogue": "Shine-Dalgarno AGGAGG",
     "transcribed": True},
    {"signal": "initiator", "codons": [INITIATOR], "real_analogue": "start codon",
     "transcribed": True},
    {"signal": "ksensor", "codons": list(K_SENSOR),
     "real_analogue": "riboswitch / attenuator sensing domain", "transcribed": True},
    {"signal": "tx_terminator", "codons": list(TX_TERMINATOR),
     "real_analogue": "rho-independent terminator U-run", "transcribed": True},
]

# ----------------------------------------------------------------------------
# The seven Nax genes (design-spec 2.1, pathway doc 2) and their dialects (design-spec 2.3)
# ----------------------------------------------------------------------------
# Dialect = meaning layer x style layer.
#   composition: residue -> weight (meaning: protein chemistry). All weights are positive,
#                so every coding codon occurs in all seven genes.
#   register:    which synonym the gene prefers (style). "X": the synonym ending in X;
#                "Y": the synonym ending in Y. Preference SYNONYM_PREFERENCE vs. the rest.

SYNONYM_PREFERENCE = 0.8

GENES = [
    {"name": "NaxGATE", "short": "GATE", "role": "receptor", "phase": "support",
     "pathway_role": "brings food Σ in", "real_counterpart": "glucose transporter (GLUT)",
     "marker": "WWX", "terminator": "ZWW",
     "dialect": "hydrophobic (membrane protein)", "register": "X",
     "composition": {"Nm": 1.5, "Kv": 4, "Ds": 0.5, "Th": 6, "My": 0.5,
                     "Os": 0.5, "Si": 0.7, "Pv": 1, "Qu": 0.5, "Lu": 6}},
    {"name": "NaxTAG", "short": "TAG", "role": "intermediate", "phase": "investment",
     "pathway_role": "tags Σ (−1 K)", "real_counterpart": "hexokinase",
     "marker": "WWY", "terminator": "ZWX",
     "dialect": "mixed", "register": "Y",
     "composition": {"Nm": 1, "Kv": 4, "Ds": 4, "Th": 3.5, "My": 0.7,
                     "Os": 0.7, "Si": 1, "Pv": 0.7, "Qu": 0.7, "Lu": 1}},
    {"name": "NaxSNIP", "short": "SNIP", "role": "intermediate", "phase": "investment",
     "pathway_role": "cuts into halves (−1 K); valve", "real_counterpart": "PFK + aldolase",
     "marker": "WXY", "terminator": "ZXW",
     "dialect": "mixed, charged-rich", "register": "X",
     "composition": {"Nm": 1, "Kv": 1, "Ds": 5, "Th": 0.7, "My": 5,
                     "Os": 0.7, "Si": 1, "Pv": 2.5, "Qu": 0.7, "Lu": 0.7}},
    {"name": "NaxFLIP", "short": "FLIP", "role": "intermediate", "phase": "support",
     "pathway_role": "β → α", "real_counterpart": "triose-phosphate isomerase",
     "marker": "WYX", "terminator": "ZYW",
     "dialect": "mixed, small", "register": "Y",
     "composition": {"Nm": 5, "Kv": 5, "Ds": 0.7, "Th": 0.7, "My": 0.7,
                     "Os": 0.7, "Si": 0.7, "Pv": 1, "Qu": 0.7, "Lu": 0.7}},
    {"name": "NaxGRAB", "short": "GRAB", "role": "intermediate", "phase": "payoff",
     "pathway_role": "oxidation, new phosphate", "real_counterpart": "GAPDH",
     "marker": "WYY", "terminator": "ZZW",
     "dialect": "mixed, charged-rich", "register": "X",
     "composition": {"Nm": 1, "Kv": 1, "Ds": 0.7, "Th": 0.7, "My": 0.7,
                     "Os": 5, "Si": 4, "Pv": 0.7, "Qu": 1.5, "Lu": 0.7}},
    {"name": "NaxPAY", "short": "PAY", "role": "effector", "phase": "payoff",
     "pathway_role": "2 K per half", "real_counterpart": "PGK + pyruvate kinase",
     "marker": "WZX", "terminator": "ZXZ",
     "dialect": "mixed", "register": "Y",
     "composition": {"Nm": 0.7, "Kv": 0.7, "Ds": 0.7, "Th": 0.7, "My": 1.5,
                     "Os": 1.5, "Si": 1, "Pv": 4, "Qu": 3.5, "Lu": 3.5}},
    {"name": "NaxDUMP", "short": "DUMP", "role": "effector", "phase": "support",
     "pathway_role": "empties the bucket → Ω", "real_counterpart": "lactate dehydrogenase",
     "marker": "WZY", "terminator": "ZYZ",
     "dialect": "mixed, flexible", "register": "X",
     "composition": {"Nm": 6, "Kv": 1.5, "Ds": 0.7, "Th": 0.7, "My": 0.7,
                     "Os": 0.7, "Si": 0.7, "Pv": 0.5, "Qu": 4, "Lu": 0.7}},
]

GENE_NAMES = [g["name"] for g in GENES]
GENE_BY_NAME = {g["name"]: g for g in GENES}
MARKERS = {g["marker"]: g["name"] for g in GENES}
TERMINATORS = {g["terminator"]: g["name"] for g in GENES}


def codon_distribution(gene):
    """Body-codon probabilities of a gene: residue composition x synonym preference.

    `gene` is a gene name or a GENES entry. Returns {codon: probability} over the 16 coding codons.
    """
    if isinstance(gene, str):
        gene = GENE_BY_NAME[gene]
    total = sum(gene["composition"].values())
    distribution = {}
    for residue, weight in gene["composition"].items():
        codons = synonyms(residue)
        if len(codons) == 1:
            distribution[codons[0]] = weight / total
        else:
            for codon in codons:
                share = SYNONYM_PREFERENCE if codon[2] == gene["register"] else 1 - SYNONYM_PREFERENCE
                distribution[codon] = weight / total * share
    return {c: distribution[c] for c in CODING_CODONS}


# ----------------------------------------------------------------------------
# Reserved-codon inventory and codon classes
# ----------------------------------------------------------------------------

RESERVED_CODONS = sorted(
    set(PROMOTER) | set(RBS) | {INITIATOR} | set(K_SENSOR) | set(TX_TERMINATOR)
    | set(MARKERS) | set(TERMINATORS)
)
SPACER_ONLY_CODONS = sorted(set(ALL_CODONS) - set(CODING_CODONS) - set(RESERVED_CODONS))


def codon_class(codon):
    """'coding', 'reserved' or 'spacer-only' (accepts DNA or RNA spelling)."""
    codon = to_dna(codon)
    if codon in CODE_TABLE:
        return "coding"
    if codon in RESERVED_CODONS:
        return "reserved"
    return "spacer-only"


# ----------------------------------------------------------------------------
# Label vocabularies (design-spec 2.5, 2.6)
# ----------------------------------------------------------------------------

REGIONS = ["spacer", "promoter", "utr5", "rbs", "gap", "initiator", "marker", "body",
           "terminator", "intergenic", "ksensor", "attenuator", "tx_terminator"]
CONDITIONS = ["K_low", "K_high"]
START_ROLES = ["true_start", "false_start_spacer", "false_start_broken_rbs"]
LEADER_STATES = ["read_through", "attenuated"]

# ----------------------------------------------------------------------------
# Consistency checks (run on import)
# ----------------------------------------------------------------------------

assert len(ALL_CODONS) == 64
assert len(CODE_TABLE) == 16 and set(CODE_TABLE.values()) == set(RESIDUES)
assert all(c[0] in "XY" and c[2] in "XY" for c in CODE_TABLE)
assert len(STAGE_I_CODONS) == 4
assert len(RESERVED_CODONS) == 22 and not set(RESERVED_CODONS) & set(CODE_TABLE)
assert len(SPACER_ONLY_CODONS) == 26
assert len(MARKERS) == 7 and len(TERMINATORS) == 7 and not set(MARKERS) & set(TERMINATORS)
for _g in GENES:
    assert set(_g["composition"]) == set(RESIDUES) and min(_g["composition"].values()) > 0
    assert _g["register"] in ("X", "Y")
    assert abs(sum(codon_distribution(_g).values()) - 1) < 1e-12


# ----------------------------------------------------------------------------
# Export for the web labs (data/web/language.json)
# ----------------------------------------------------------------------------

def language_as_dict():
    """The whole language as plain data, for data/web/language.json."""
    return {
        "bases": BASES,
        "dna_bases": DNA_BASES,
        "rna_bases": RNA_BASES,
        "transcription": TRANSCRIPTION,
        "code_table": [
            {"codon": c, "codon_rna": transcribe(c), "residue": r,
             "stage": 1 if c in STAGE_I_CODONS else 2}
            for c, r in CODE_TABLE.items()
        ],
        "code_grid": {"rows": [f"{f}·{t}" for f, t in CODE_GRID_ROWS],
                      "columns": CODE_GRID_COLUMNS},
        "residues": RESIDUES,
        "signals": SIGNALS,
        "reserved_codons": RESERVED_CODONS,
        "spacer_only_codons": SPACER_ONLY_CODONS,
        "codon_classes": {c: codon_class(c) for c in ALL_CODONS},
        "genes": [
            {**{k: v for k, v in g.items()},
             "codon_distribution": codon_distribution(g)}
            for g in GENES
        ],
        "synonym_preference": SYNONYM_PREFERENCE,
        "regions": REGIONS,
        "conditions": CONDITIONS,
        "start_roles": START_ROLES,
        "leader_states": LEADER_STATES,
    }
