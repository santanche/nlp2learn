# Exemplo 1 — grafo com atributos agregados nos nós

Ver também: [README.md](README.md) (enunciado do projeto) e [example2.md](example2.md) (variante que decompõe atributos e liga entidades a vocabulários controlados).

Neste exemplo, cada entidade extraída do texto (sintoma, exame, resultado, diagnóstico, ...) é um único nó, e seus atributos (valor, unidade, status, etc.) ficam agrupados na coluna `attributes` desse nó — é a leitura mais direta do par de tabelas nós/arestas descrito no README.

### Texto de exemplo

> A 52-year-old man with a history of type 2 diabetes mellitus and hypertension presented to the emergency department with a 5-day history of progressive epigastric pain radiating to the back, accompanied by nausea and low-grade fever. Physical examination revealed epigastric tenderness without rebound. Laboratory tests showed elevated serum lipase (850 U/L, reference range 10-140 U/L) and C-reactive protein of 96 mg/L. Abdominal contrast-enhanced computed tomography (CT) demonstrated peripancreatic fat stranding and a 4 cm pseudocyst adjacent to the pancreatic tail. Endoscopic ultrasound (EUS) confirmed the pseudocyst and excluded a solid mass. Based on clinical presentation, laboratory findings, and imaging, a diagnosis of acute pancreatitis with pseudocyst formation, superimposed on chronic pancreatitis, was established. The patient was treated with intravenous fluids and analgesia, and underwent EUS-guided cystgastrostomy for pseudocyst drainage. He was discharged on day 8 with resolution of symptoms.

### Grafo

```mermaid
flowchart LR
  classDef patient fill:#fef3c7,stroke:#d97706,color:#000
  classDef history fill:#e0e7ff,stroke:#4338ca,color:#000
  classDef symptom fill:#fee2e2,stroke:#b91c1c,color:#000
  classDef finding fill:#fce7f3,stroke:#be185d,color:#000
  classDef exam fill:#dbeafe,stroke:#1d4ed8,color:#000
  classDef result fill:#cffafe,stroke:#0e7490,color:#000
  classDef diagnosis fill:#dcfce7,stroke:#15803d,color:#000
  classDef treatment fill:#fef9c3,stroke:#a16207,color:#000
  classDef outcome fill:#f3e8ff,stroke:#7e22ce,color:#000

  P1["Patient<br/>52yo Male"]:::patient

  P1 -->|HAS_HISTORY| C1["Type 2 diabetes mellitus"]:::history
  P1 -->|HAS_HISTORY| C2["Hypertension"]:::history

  P1 -->|PRESENTS_WITH| S1["Epigastric pain<br/>radiating to back"]:::symptom
  P1 -->|PRESENTS_WITH| S2["Nausea"]:::symptom
  P1 -->|PRESENTS_WITH| S3["Low-grade fever"]:::symptom
  P1 -->|HAS_FINDING| F1["Epigastric tenderness"]:::finding

  P1 -->|UNDERWENT_EXAM| E1["Serum lipase"]:::exam
  E1 -->|HAS_RESULT| R1["850 U/L<br/>ref 10-140 U/L"]:::result

  P1 -->|UNDERWENT_EXAM| E2["C-reactive protein"]:::exam
  E2 -->|HAS_RESULT| R2["96 mg/L"]:::result

  P1 -->|UNDERWENT_EXAM| E3["Abdominal CT"]:::exam
  E3 -->|REVEALS| F2["Peripancreatic<br/>fat stranding"]:::finding
  E3 -->|REVEALS| F3["Pancreatic pseudocyst<br/>4cm, tail"]:::finding

  P1 -->|UNDERWENT_EXAM| E4["EUS"]:::exam
  E4 -->|CONFIRMS| F3
  E4 -->|EXCLUDES| F4["Solid mass"]:::finding

  S1 -->|SUPPORTS| D1["Acute pancreatitis"]:::diagnosis
  R1 -->|SUPPORTS| D1
  F2 -->|SUPPORTS| D1
  F3 -->|SUPPORTS| D3["Pancreatic pseudocyst"]:::diagnosis
  D2["Chronic pancreatitis"]:::diagnosis -->|PREDISPOSES_TO| D1

  P1 -->|DIAGNOSED_WITH| D1
  P1 -->|DIAGNOSED_WITH| D2
  P1 -->|DIAGNOSED_WITH| D3

  D1 -->|TREATED_BY| T1["IV fluids"]:::treatment
  D1 -->|TREATED_BY| T2["Analgesia"]:::treatment
  D3 -->|TREATED_BY| T3["EUS-guided<br/>cystgastrostomy"]:::treatment
  T3 -->|TARGETS| F3

  P1 -->|HAS_OUTCOME| O1["Discharged day 8<br/>symptom resolution"]:::outcome
  T3 -->|LEADS_TO| O1
```

### Tabela de nós

| node_id | type | label | attributes |
|---|---|---|---|
| P1 | Patient | case PMC_EXAMPLE_01 | age=52; gender=Male |
| C1 | History | Type 2 diabetes mellitus | status=pre-existing |
| C2 | History | Hypertension | status=pre-existing |
| S1 | Symptom | Epigastric pain radiating to back | duration=5 days; course=progressive |
| S2 | Symptom | Nausea | |
| S3 | Symptom | Low-grade fever | |
| F1 | Finding | Epigastric tenderness | source=physical examination |
| E1 | Exam | Serum lipase | modality=laboratory |
| R1 | ExamResult | 850 U/L | value=850; unit=U/L; reference_range=10-140 U/L; interpretation=elevated |
| E2 | Exam | C-reactive protein | modality=laboratory |
| R2 | ExamResult | 96 mg/L | value=96; unit=mg/L; interpretation=elevated |
| E3 | Exam | Abdominal contrast-enhanced CT | modality=imaging |
| F2 | Finding | Peripancreatic fat stranding | source=CT |
| F3 | Finding | Pancreatic pseudocyst, 4 cm | location=pancreatic tail; size=4 cm; source=CT+EUS |
| E4 | Exam | Endoscopic ultrasound (EUS) | modality=imaging |
| F4 | Finding | Solid mass | status=excluded; source=EUS |
| D1 | Diagnosis | Acute pancreatitis | |
| D2 | Diagnosis | Chronic pancreatitis | qualifier=underlying condition |
| D3 | Diagnosis | Pancreatic pseudocyst | |
| T1 | Treatment | Intravenous fluids | |
| T2 | Treatment | Analgesia | |
| T3 | Treatment | EUS-guided cystgastrostomy | type=procedure |
| O1 | Outcome | Discharged, day 8, symptom resolution | length_of_stay=8 days |

### Tabela de arestas

| edge_id | source_id | target_id | relation | attributes |
|---|---|---|---|---|
| e1 | P1 | C1 | HAS_HISTORY | |
| e2 | P1 | C2 | HAS_HISTORY | |
| e3 | P1 | S1 | PRESENTS_WITH | |
| e4 | P1 | S2 | PRESENTS_WITH | |
| e5 | P1 | S3 | PRESENTS_WITH | |
| e6 | P1 | F1 | HAS_FINDING | |
| e7 | P1 | E1 | UNDERWENT_EXAM | |
| e8 | E1 | R1 | HAS_RESULT | |
| e9 | P1 | E2 | UNDERWENT_EXAM | |
| e10 | E2 | R2 | HAS_RESULT | |
| e11 | P1 | E3 | UNDERWENT_EXAM | |
| e12 | E3 | F2 | REVEALS | |
| e13 | E3 | F3 | REVEALS | |
| e14 | P1 | E4 | UNDERWENT_EXAM | |
| e15 | E4 | F3 | CONFIRMS | |
| e16 | E4 | F4 | EXCLUDES | |
| e17 | S1 | D1 | SUPPORTS | |
| e18 | R1 | D1 | SUPPORTS | |
| e19 | F2 | D1 | SUPPORTS | |
| e20 | F3 | D3 | SUPPORTS | |
| e21 | D2 | D1 | PREDISPOSES_TO | |
| e22 | P1 | D1 | DIAGNOSED_WITH | |
| e23 | P1 | D2 | DIAGNOSED_WITH | |
| e24 | P1 | D3 | DIAGNOSED_WITH | |
| e25 | D1 | T1 | TREATED_BY | |
| e26 | D1 | T2 | TREATED_BY | |
| e27 | D3 | T3 | TREATED_BY | |
| e28 | T3 | F3 | TARGETS | |
| e29 | P1 | O1 | HAS_OUTCOME | |
| e30 | T3 | O1 | LEADS_TO | |
