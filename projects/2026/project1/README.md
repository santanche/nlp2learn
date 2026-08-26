# Processamento de Linguagem Natural 2026

## Projeto 1

Este laboratório envolve a extração de dados de um repositório que cataloga milhares de casos clínicos, conhecido como MultiCaRe, e cada caso em um grafo de conhecimento. O MultiCaRe está descrito no artigo:

> Nievas Offidani, M., Roffet, F., González Galtier, M. C., Massiris, M., & Delrieux, C. (2025). An Open-Source Clinical Case Dataset for Medical Image Classification and Multimodal AI Applications. Data 2025, Vol. 10, Page 123, 10(8), 123. https://doi.org/10.3390/DATA10080123

O banco de dados extraiu os casos clínicos disponíveis de artigos publicados no PubMed.

Na pasta [sample/](sample/) estão disponíveis três arquivos:



A equipe deve 
1. Quais são os dados interessantes para serem extraídos e como:
  * entidades: sintomas, doenças, exames, tratamentos, medicamentos, regiões anatômicas, etc.;
  * valores associados a resultados de exames e dosagem de medicamentos, bem como suas unidades de medida;
2. Como é interessante organizar estes dados em um grafo de conhecimento.
3. Estratégias clássicas para extrair os dados desejados do texto: tokenização, normalização, remoção de stop-words, associação a dicionários/tesauros/ontologias

Para este estágio de trabalho, não poderão ser usados modelos de linguagem para a extração dos dados. A equipe deve explorar as técnicas tradicionais de modo que entenda cada algoritmo que foi usado e seu impacto na geração final do grafo.
