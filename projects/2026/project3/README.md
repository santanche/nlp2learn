# Processamento de Linguagem Natural 2026

## Projeto 3

## Contexto

No Projeto 2, foi desenvolvido um processo de extração de grafos de conhecimento a partir de textos clínicos do conjunto de dados MultiCaRe, investigando como métodos estatísticos e de aprendizado de máquina podem ser utilizados para aprimorar a extração de conhecimento a partir dos textos clínicos, mas excluindo-se modelos de linguagem.

Neste terceiro e último projeto, o objetivo é investigar como **modelos de linguagem** podem ser utilizados em conjunto com outros métodos para aprimorar a extração de conhecimento a partir dos textos clínicos.

Os modelos de linguagem podem ser integrados com outras estratégias como: regras, reconhecimento de padrões, métodos estatísticos, aprendizagem de máquina, integração com ontologias, etc.

A ideia central é comparar diferentes estratégias de extração e investigar em que medida o aprendizado a partir dos próprios textos pode superar ou complementar as regras construídas nos Projetos 1 e 2.

Deve ser produzida uma aplicação que explore a árvore de conhecimento para algum propósito prático, exemplos: suporte a diagnóstico, criação de cenários de treinamento (pacientes virtuais), perguntas e respostas, sumarização, etc.

Este trabalho também deve considerar pelo menos uma segunda fonte de dados alternativa como complemento ao MultiCare. Fontes alternativas podem ser usadas para tarefas de:
1) Fornecer dados complementares no processo de extração, exemplos: vocabulários e ontologias.
2) Possibilitar a análise em um cenário diferente daquele do MultiCare.
3) Ser usado para treinamento, tal como o MACCROBAT (https://figshare.com/articles/dataset/MACCROBAT2018/9764942).
4) Servir como fonte complementar para a aplicação proposta.

---

## Objetivo

Desenvolver e avaliar um processo de extração de um grafo de conhecimento clínico a partir dos textos do MultiCaRe e mais (pelo menos) uma fonte complementar, aprimorando e expandindo os Projetos 1 e 2 com modelos de linguagem aliados a outras técnicas. Utilizar este grafo em uma aplicação prática em saúde.

---

## Conjunto de Dados Completo

Além dos arquivos CSV de amostra, está disponível um notebook que extrai um CSV completo com todos os registros em: [Preparação de Dados](../../../to-kg/notebooks/01_data_preparation.ipynb).

O conjunto de dados completo pode ser explorado nesta aplicação final.

---

## Breaking Sentences

Foi desenvolvida uma atividade em que foi explorada a questão de como explorar modelos de linguagem para refinar o desmembramento do texto em árvore de conhecimento: [Breaking Sentences](./breaking-sentences.md).

Recomendo fortemente que vejam este: [Guia de Ideias](./guia-ideias.md). Ele foi escrito pelo ChatGPT de acordo com diretrizes minhas e foi revisado por mim.

---

## Diferenciais do Projeto

Serão valorizados diferenciais do projeto, como:
* criatividade
    * por exemplo, explorando formas de combinar modelos de linguagens e embeddings com outras técnicas
* originalidade
* audácia em propostas desafiadoras
* recursos de visualização de dados do grafo
* busca por soluções diferenciais na literatura
* métodos criativos e diferenciados
  * por exemplo, comparar diferentes soluções para o problema
  * usar métricas de comparação para o problema
* criatividade na exploração do grafo de conhecimento na aplicação

É muito importante considerar que serão valorizadas equipes que arrisquem em análises ousadas, nas quais não se saiba se se alcançará o resultado esperado. Equipes podem obter nota máxima, mesmo que não alcancem o resultado esperado, considerando que apresentem um trabalho bem fundamentado, audacioso, que demonstre integração entre os componentes.

---

## Parte Escrita

O projeto tem uma parte escrita seguindo o [template](../template/project3/README.md). Cada equipe deve criar um projeto no GitHub do qual todos os membros participam e devem colocar a parte escrita lá. Nos slides de apresentação deve ser colocado o endereço do GitHub.
