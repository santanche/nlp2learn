# Processamento de Linguagem Natural 2026

## Projeto 2

## Contexto

No Projeto 1, foi desenvolvido um processo de extração de grafos de conhecimento a partir de textos clínicos do conjunto de dados MultiCaRe, utilizando principalmente regras linguísticas, padrões textuais e conhecimento previamente definido sobre as entidades e relações de interesse.

Neste segundo projeto, o objetivo é investigar como **métodos estatísticos e de aprendizado de máquina** podem ser utilizados para aprimorar a extração de conhecimento a partir dos textos clínicos.

O projeto deverá explorar principalmente representações baseadas em **N-grams** e métodos de **aprendizado de máquina clássico ou redes neurais**, sem a utilização de Large Language Models (LLMs), embeddings ou modelos de linguagem baseados em Transformers.

A ideia central é comparar diferentes estratégias de extração e investigar em que medida o aprendizado a partir dos próprios textos pode superar ou complementar as regras construídas no Projeto 1.

---

## Objetivo

Desenvolver e avaliar um processo de extração de um grafo de conhecimento clínico a partir dos textos do MultiCaRe, aprimorando e expandindo o Projeto 1 com técnicas estatísticas e/ou de aprendizado de máquina, mas sem o uso de LLMs ou embeddings.

---

## Detalhamento

A equipe deve investigar como técnicas de aprendizado podem melhorar o processo desenvolvido no Projeto 1 e realizar uma comparação, se possível experimental, entre a abordagem baseada em regras do Projeto 1 e a abordagem desenvolvida neste projeto.

Apesar de em sala de aula N-gramas terem sido usados em uma perspectiva principalmente generativa, neste projeto, N-gramas podem ser usados para:
* encontrar trechos de texto candidatos a entidades compostas (`myocardial infarction`) ou a nomeações compostas de relação (`caused by`);
* encontrar associações relevantes entre termos (`cancer metastasis`).

A análise de N-gramas deve estar presente em pelo menos uma parte do processo. Pode ser precedida ou sucedida por técnicas de ML (sem modelo de linguagem) ou técnicas de processamento do Projeto 1. Por exemplo, para: tokenizar e filtrar termos relevantes antes da aplicação do N-grama ou usar associações relevantes identificadas pelo N-gram como entrada para a classificação de doenças, sintomas, etc., ou associar termos a ontologias.

Veja a seguir algumas ideias de como N-gramas podem ser explorados de forma criativa. A primeira tabela foi extraída dos slides do Dan Jurafsky, apresentados em sala, e a segunda foi uma extrapolação para o contexto de saúde feita pelo ChatGPT.

### What kinds of knowledge do N-grams represent?

> **CS 124: From Languages to Information**
> * Dan Jurafsky -- Winter 2026
> * https://web.stanford.edu/class/cs124/


| Conditional Probability | Knowledge |
| --- | --- |
| | **Knowledge of grammar** |
| `P(to \| want) = .66`    |  ("want" is followed by infinitive "to") |
| `P(want \| spend) = 0` | |
| `P(of \| to) = 0`      | ("of" is not a verb) |
| | **Knowledge of meaning** |
| `P (dinner \| lunch or) = .83` | The words "dinner" or "lunch" are semantically related. |
| `P(dinner \| for) ~ P(lunch \| for)` |
| | **Knowledge about the world** |
| `P(chinese \| want) > P(english \| want)` | Chinese food is very popular |

### Tipos de Conhecimento representados por N-gramas na Saúde

| Conditional Probability                                              | Knowledge represented in MultiCaRe                                                                                             |
| --- | --- |
|                                                                      | **Knowledge of clinical grammar / syntax**                                                                                     |
| `P(with \| treated) > P(for \| treated)`                             | Certos verbos clínicos apresentam padrões sintáticos recorrentes, como *treated with...*.                                      |
| `P(by \| caused) > P(with \| caused)`                                | O padrão *caused by* é recorrente na expressão de relações causais.                                                            |
| `P(in \| located) > P(by \| located)`                                | Certos verbos/predicados apresentam padrões específicos para expressar localização.                                            |
| `P(to \| secondary) > P(of \| secondary)`                            | O padrão *secondary to* aparece como uma construção clínica recorrente.                                                        |
|                                                                      | **Knowledge of clinical meaning / semantics**                                                                                  |
| `P(infarction \| myocardial) >> P(table \| myocardial)`              | *myocardial infarction* constitui uma expressão clínica muito mais plausível do que combinações arbitrárias.                   |
| `P(pneumonia \| aspiration) > P(pneumonia \| arbitrary_word)`        | *aspiration* ocorre frequentemente em contextos relacionados a *pneumonia*.                                                    |
| `P(tumor \| lung) ~ P(carcinoma \| lung)`                            | *tumor* e *carcinoma* apresentam padrões de coocorrência relacionados a entidades da mesma área clínica.                       |
| `P(diabetes \| mellitus) >> P(diabetes \| fever)`                    | *diabetes mellitus* constitui uma expressão lexical fortemente associada.                                                      |
|                                                                      | **Knowledge about clinical entities**                                                                                          |
| `P(infarction \| myocardial) >> P(infarction \| acute)`              | N-grams podem identificar componentes de expressões que correspondem a entidades clínicas compostas.                           |
| `P(disease \| chronic) > P(disease \| acute)`                        | Certos modificadores apresentam associação estatística com determinados tipos de entidades clínicas.                           |
| `P(syndrome \| ... )`                                                | Padrões recorrentes podem fornecer evidências de que uma sequência corresponde a uma entidade clínica.                         |
|                                                                      | **Knowledge about clinical relations**                                                                                         |
| `P(by \| caused) ...`                                                | Padrões como *caused by X* fornecem evidência de uma relação causal.                                                           |
| `P(with \| treated) ...`                                             | Padrões como *treated with X* fornecem evidência de uma relação entre tratamento e condição clínica.                           |
| `P(to \| secondary) ...`                                             | Padrões como *secondary to X* fornecem evidência de uma relação entre uma condição e sua causa/associação.                     |
| `P(in \| located) ...`                                               | Padrões de contexto podem fornecer evidência de relações de localização entre uma entidade e uma região anatômica.             |
|                                                                      | **Knowledge about the clinical world**                                                                                         |
| `P(pneumonia \| aspiration) > P(pneumonia \| unrelated_condition)`   | O corpus revela associações clínicas recorrentes entre condições, mesmo sem uma regra explícita codificando esse conhecimento. |
| `P(metastasis \| cancer) > P(metastasis \| unrelated_condition)`     | A distribuição dos N-grams reflete associações entre doenças, complicações e fenômenos clínicos.                               |
| `P(chemotherapy \| cancer) > P(chemotherapy \| unrelated_condition)` | Os padrões de coocorrência refletem associações entre tratamentos e condições.                                                 |

---

## Guia de Ideias criado pelo ChatGPT, assistido pelo Professor

Recomendo fortemente que vejam este: [Guia de Ideias](./guia-ideias.md). Ele foi escrito pelo ChatGPT de acordo com diretrizes minhas e foi revisado por mim.

---

## Diferenciais do Projeto

Serão valorizados diferenciais do projeto, como:
* criatividade
  * por exemplo, explorando combinações inovadoras de N-gramas com outras técnicas
* originalidade
* audácia em propostas desafiadoras
* recursos de visualização de dados do grafo
* busca por soluções diferenciais na literatura
* métodos criativos e diferenciados
  * por exemplo, comparar diferentes soluções para o problema
  * usar métricas de comparação para o problema

É muito importante considerar que serão valorizadas equipes que arrisquem em análises ousadas, nas quais não se saiba se se alcançará o resultado esperado. Equipes podem obter nota máxima, mesmo que não alcancem o resultado esperado, considerando que apresentem um trabalho bem fundamentado, audacioso, que demonstre integração entre os componentes.

---

## Parte Escrita

O projeto tem uma parte escrita seguindo o [template](../template/project1/README.md). Cada equipe deve criar um projeto no GitHub do qual todos os membros participam e devem colocar a parte escrita lá. Nos slides de apresentação deve ser colocado o endereço do GitHub.
