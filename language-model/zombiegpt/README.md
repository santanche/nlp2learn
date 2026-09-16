# Zombienella importunus

## Grammar

```
S -> s M | i L.
M -> F | r r F | r r r r F | l l F | l l r r F.
F -> f e | p e | e.
L -> l l | l l l l.
```

## Derivations

```
s r r f e
s r r p e
s r r e
s r r r r f e
s r r r r p e
s r r r r e
s l l r r f e
s l l r r p e
s l l r r e
s f e
s p e
s e
s l l f e
s l l p e
s l l e
i l l
i l l l l
```

## Transition Probabilities

```
S -> s M (0.90)
S -> i L (0.10)
---
M -> F (0.20)
M -> r r F (0.20)
M -> r r r r F (0.20)
M -> l l F (0.20)
M -> l l r r F (0.20)
---
F -> f e (0.70)
F -> p e (0.20)
F -> e (0.10)
---
L -> l l (0.50)
L -> l l l l (0.50)
```

## Mermaid Diagram

```mermaid
flowchart TD

    S((S))

    S -->|0.90| SM["s M"]
    S -->|0.10| IL["i L"]

    SM --> M((M))
    IL --> L((L))

    M -->|0.20| MF["F"]
    M -->|0.20| MRR["r r F"]
    M -->|0.20| MRRRR["r r r r F"]
    M -->|0.20| MLL["l l F"]
    M -->|0.20| MLLRR["l l r r F"]

    MF --> F((F))
    MRR --> F
    MRRRR --> F
    MLL --> F
    MLLRR --> F

    F -->|0.70| FE["f e"]
    F -->|0.20| PE["p e"]
    F -->|0.10| E["e"]

    L -->|0.50| LL["l l"]
    L -->|0.50| LLLL["l l l l"]

    classDef nonterminal fill:#ffffff,stroke:#333,stroke-width:2px;
    classDef production fill:#f7f7f7,stroke:#777,stroke-width:1px;
    classDef terminal fill:#eeeeee,stroke:#333,stroke-width:1px;

    class S,M,F,L nonterminal;
    class SM,IL,MF,MRR,MRRRR,MLL,MLLRR production;
    class FE,PE,E,LL,LLLL terminal;
```

## Markov Chain

```mermaid
flowchart LR

    S((S))

    %% Start
    S -->|0.90 / s| M
    S -->|0.10 / i| L

    %% M alternatives
    M((M))

    M -->|0.20| F
    M -->|0.20 / r| R2
    M -->|0.20 / r| R4
    M -->|0.20 / l| LL2
    M -->|0.20 / l| LLR2

    %% rr
    R2((R₂))
    R2 -->|r| F

    %% rrrr
    R4((R₄))
    R4 -->|r| R3
    R3((R₃))
    R3 -->|r| R2

    %% ll
    LL2((LL₂))
    LL2 -->|l| F

    %% llrr
    LLR2((LLRR₂))
    LLR2 -->|l| LLR1
    LLR1((LLRR₁))
    LLR1 -->|r| LLR0
    LLR0((LLRR₀))
    LLR0 -->|r| F

    %% F alternatives
    F((F))

    F -->|0.70 / f| FE
    F -->|0.20 / p| PE
    F -->|0.10 / e| END

    FE((FE))
    FE -->|e| END

    PE((PE))
    PE -->|e| END

    %% L alternatives
    L((L))

    L -->|0.50 / l| L2
    L -->|0.50 / l| L4

    L2((L₂))
    L2 -->|l| END

    L4((L₄))
    L4 -->|l| L3
    L3((L₃))
    L3 -->|l| L2

    %% End
    END((END))
```