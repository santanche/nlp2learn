# Guia de Ideias criado pelo ChatGPT, assistido pelo Professor

Este guia foi escrito pelo ChatGPT de acordo com diretrizes minhas e foi revisado por mim.

## Uso de N-grams

Os N-grams podem ser utilizados para representar o contexto local das palavras e identificar padrões recorrentes nos textos clínicos.

Por exemplo, em:

> "acute myocardial infarction"

podemos representar:

```text
unigrams:
acute
myocardial
infarction

bigrams:
acute myocardial
myocardial infarction

trigram:
acute myocardial infarction
```

Essas representações podem ajudar tanto na identificação de entidades clínicas compostas quanto na identificação de padrões linguísticos associados a relações entre entidades.

Além da frequência dos N-grams, podem ser investigadas medidas como **TF-IDF** e **Pointwise Mutual Information (PMI)** (o segundo não foi tratado em sala, mas pode ser estudado pela equipe).

---

# Possibilidades de técnicas

As técnicas abaixo são possibilidades para o desenvolvimento do projeto. O estudante não precisa necessariamente utilizar todas elas.

| Técnica                 | Aplicação no projeto                                                                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Unigrams**            | Representar palavras individuais como características para identificação de entidades ou relações.                                      |
| **Bigrams / Trigrams**  | Capturar expressões compostas e padrões locais associados a entidades e relações clínicas.                                              |
| **TF-IDF**              | Representar o contexto textual como um vetor numérico para alimentar classificadores.                                                   |
| **PMI**                 | Identificar palavras ou expressões que ocorrem juntas com frequência maior que a esperada.                                              |
| **Naive Bayes**         | Classificar o tipo de relação entre duas entidades a partir das palavras e N-grams presentes no contexto.                               |
| **Regressão Logística** | Classificar pares de entidades em diferentes tipos de relação, utilizando características textuais.                                     |
| **SVM**                 | Classificar relações ou entidades utilizando representações esparsas produzidas por TF-IDF/N-grams.                                     |
| **CRF**                 | Realizar reconhecimento de entidades como um problema de classificação sequencial.                                                      |
| **Random Forest**       | Classificar entidades ou relações a partir de diferentes características linguísticas e estruturais.                                    |
| **MLP**                 | Aprender uma função não linear para classificação de entidades ou relações a partir de representações vetoriais.                        |
| **BiLSTM**              | Considerar a sequência das palavras para identificar entidades ou relações, utilizando embeddings aprendidos durante o treinamento.     |
| **BiLSTM + CRF**        | Combinar representação neural da sequência com classificação estruturada para reconhecimento de entidades.                              |
| **Weak Supervision**    | Utilizar as regras do Projeto 1 para gerar exemplos de treinamento automaticamente e, posteriormente, treinar um modelo de aprendizado. |

---

## Possibilidade 1 — Identificação de entidades

Uma possibilidade é transformar a identificação de entidades em um problema de **classificação de sequências**.

Por exemplo:

```text
The patient developed severe pneumonia

The        O
patient    O
developed  O
severe     O
pneumonia  B-DISEASE
```

O modelo deverá aprender, a partir de exemplos, quais palavras ou sequências de palavras correspondem a entidades clínicas.

Podem ser utilizados como características:

* a própria palavra;
* palavras anteriores e posteriores;
* prefixos e sufixos;
* características ortográficas;
* POS tags;
* unigrams, bigrams e trigrams;
* posição da palavra na sentença.

Modelos possíveis incluem **CRF, SVM, Regressão Logística e BiLSTM-CRF**.

---

## Possibilidade 2 — Identificação de relações

Outra possibilidade é considerar duas entidades já identificadas e utilizar o contexto entre elas para determinar se existe uma relação.

Por exemplo:

> "pneumonia secondary to aspiration"

O sistema poderia receber:

```text
Entidade 1: pneumonia
Entidade 2: aspiration

Contexto:
pneumonia secondary to aspiration
```

e classificar o par como:

```text
CAUSES
```

ou, caso não exista relação relevante:

```text
NONE
```

As características podem incluir:

* palavras entre as entidades;
* distância entre as entidades;
* N-grams;
* palavras imediatamente anteriores e posteriores;
* tipos das entidades;
* posição das entidades na sentença;
* representação TF-IDF do contexto.

Modelos possíveis incluem **Naive Bayes, Regressão Logística, SVM, Random Forest e redes neurais**.

---

## Possibilidade 3 — Descoberta de padrões linguísticos

Os estudantes podem investigar quais N-grams estão associados a determinadas relações.

Por exemplo:

```text
X secondary to Y
X caused by Y
X associated with Y
X treated with Y
X located in Y
```

O objetivo seria descobrir se determinados padrões estatísticos são capazes de identificar relações clínicas sem que cada padrão precise ser explicitamente programado como uma regra.

Assim, a transição seria:

```text
Projeto 1:

"Se ocorrer este padrão → relação"


Projeto 2:

"Aprenda, a partir dos exemplos,
quais padrões indicam uma relação."
```

---

## Possibilidade 4 — Aprendizado supervisionado a partir do Projeto 1

O resultado do Projeto 1 pode ser utilizado como fonte de exemplos para treinamento.

Por exemplo:

```text
Texto clínico
      │
      ▼
Regras do Projeto 1
      │
      ▼
Exemplos rotulados
      │
      ▼
Modelo de aprendizado
      │
      ▼
Novas extrações
      │
      ▼
Grafo de conhecimento
```

Nesse caso, as regras desenvolvidas anteriormente funcionam como uma forma de **supervisão automática (weak supervision)**.

Os estudantes podem investigar se um modelo treinado com esses exemplos consegue:

* reproduzir os padrões das regras;
* generalizar para novos textos;
* identificar relações que não foram explicitamente previstas pelas regras;
* reduzir ou aumentar a quantidade de falsos positivos.

---

## Possibilidade 5 — Comparação entre representações

Uma questão experimental interessante é investigar o efeito da granularidade da representação textual.

Por exemplo, comparar:

```text
Modelo A
Unigrams

Modelo B
Unigrams + Bigrams

Modelo C
Unigrams + Bigrams + Trigrams
```

ou:

```text
Palavras
   ↓
TF-IDF

Palavras + N-grams
   ↓
TF-IDF

Embeddings aprendidos
   ↓
Rede neural
```

O estudante deverá investigar se uma representação mais rica do contexto realmente melhora a extração.

---

## Avaliação

O sistema deverá ser avaliado quantitativamente sempre que possível.

Para identificação de entidades, podem ser utilizadas métricas como:

* Precision;
* Recall;
* F1-score.

Para classificação de relações, podem ser avaliados:

* Precision;
* Recall;
* F1-score;
* matriz de confusão.

Além da avaliação dos classificadores, recomenda-se analisar o **grafo de conhecimento resultante**.

Por exemplo:

```text
                 ┌──────────┐
                 │ Disease  │
                 └────┬─────┘
                      │
                    CAUSES
                      │
                      ▼
                 ┌──────────┐
                 │ Symptom  │
                 └──────────┘
```

Uma abordagem pode apresentar um F1 semelhante a outra, mas produzir um grafo com características bastante diferentes, como excesso de relações ou perda de relações importantes.

---

## Restrição de métodos

O projeto deverá utilizar métodos de NLP estatístico e/ou aprendizado de máquina **sem utilizar LLMs ou modelos de linguagem baseados em Transformers**.

São permitidos, por exemplo:

* métodos baseados em frequência;
* N-grams;
* TF-IDF;
* Naive Bayes;
* Regressão Logística;
* SVM;
* Random Forest;
* CRF;
* MLP;
* RNN;
* LSTM;
* BiLSTM;
* outras técnicas de aprendizado de máquina ou redes neurais que não utilizem modelos de linguagem Transformer pré-treinados.

