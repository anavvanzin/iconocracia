# Taxonomia pública e rótulos históricos

Reconciliação editorial de 05/11/2026. A apresentação vigente distingue **três
regimes interpretativos** (Fundacional, Normativo, Militar) e **contra-alegoria
como teste crítico**. Esta correção preserva os registros e aplica decisões
documentadas; não realiza nova adjudicação iconológica.

## Fontes e versões consultadas

| Material | Versão verificada | Papel documental |
| --- | --- | --- |
| [Decisão de 29/07](https://github.com/anavvanzin/iconocracy-corpus/blob/8cdc287817d9da45a3f681232b8ce515c91e2926/docs/decisions/2026-07-29-aparato-minimo-suficiente.md) | `DEC-2026-07-29-APARATO-MINIMO`, vigente | A terceira determinação ainda enumera quatro nomes; estabelece leitura densa e veda agregação como prova. |
| [Consolidação de 31/07](https://github.com/anavvanzin/iconocracy-corpus/blob/8cdc287817d9da45a3f681232b8ce515c91e2926/docs/decisions/2026-07-31-metodologia-2-0-iconometry-consolidation.md) | `DEC-2026-07-31-METODOLOGIA-2-0`, vigente | Em «O que permanece»: «Os 3 regimes iconocráticos». A tabela define contra-alegorias como «Teste crítico do regime». É a formulação posterior explícita para a distinção examinada. |
| [Contrato de 31/07](https://github.com/anavvanzin/iconocracy-corpus/blob/8cdc287817d9da45a3f681232b8ce515c91e2926/docs/METHOD_CONTRACT_2026-07-31.md) | Declara vigência a partir de 31/07 | Reitera o teste crítico. Suas contagens aproximadas antigas não substituem a leitura atual do ledger. |
| [Aposentadoria de 28/07](https://github.com/anavvanzin/iconocracy-corpus/blob/8cdc287817d9da45a3f681232b8ce515c91e2926/docs/decisions/2026-07-28-aposentadoria-do-indice-composto.md) e [remoção de 24/09](https://github.com/anavvanzin/iconocracy-corpus/blob/8cdc287817d9da45a3f681232b8ce515c91e2926/docs/decisions/2026-09-24-remocao-definitiva-do-campo.md) | Decisões vigentes; a segunda tem atualização de 29/09 | Dez indicadores independentes. A remoção posterior supera a antiga manutenção do campo composto em 31/07; não redefine o número de regimes. |
| [AGENTS.md](https://github.com/anavvanzin/iconocracy-corpus/blob/8cdc287817d9da45a3f681232b8ce515c91e2926/AGENTS.md), [CLAUDE.md](https://github.com/anavvanzin/iconocracy-corpus/blob/8cdc287817d9da45a3f681232b8ce515c91e2926/CLAUDE.md), [README](https://github.com/anavvanzin/iconocracy-corpus/blob/8cdc287817d9da45a3f681232b8ce515c91e2926/README.md) e schema canônico | `iconocracy-corpus@8cdc287817d9da45a3f681232b8ce515c91e2926` | AGENTS explicita três regimes. CLAUDE conserva uma enumeração ambígua sob o título «Three iconocratic regimes»; README e schema preservam quatro rótulos. Um enum não equivale a uma decisão de quatro regimes. |
| [Relatório corrigido de 01/11](https://docs.google.com/document/d/1mpkQKb0pvexRSJ-R7mjiXJrNgFUBMyW284WhebovVd8/edit) | Documento lido nesta sessão, «Coerência metodológica pública» | Corrobora três regimes e teste crítico, e já identifica a divergência na homepage e nas estatísticas. É literatura de trabalho do projeto, não nova validação dos objetos. |
| [PR #83](https://github.com/anavvanzin/iconocracia/pull/83) | Aberta, draft, head `9f9144b90e01ef54bcc6e7cdef54416548c4c9ce` | Proposta de implementação; não foi tratada como decisão integrada. Seu adaptador de apresentação e regressões pertinentes são reaproveitados nesta correção. |
| [PR #86](https://github.com/anavvanzin/iconocracia/pull/86) | Integrada, merge `dfd9a0eed8dd61c5c0351b4a75fbb3bb655b4f46` | Introduziu a ficha bilíngue e as páginas estruturais. O merge não registra reabertura da taxonomia. |
| Plano arquitetônico e textos públicos | `iconocracia@cfd40eb4dd26fe8d244babbea191a4fcf09a20a9` | Baseline desta correção. O plano de 05/11 usa quatro regimes, mas seu módulo 4 também diz que contra-alegoria é teste crítico e não quarto regime. |

Os materiais estão no destino existente: documentação, código e conteúdo
estruturado em GitHub, com referências às fontes preservadas. Não se criaram
novas cópias dos documentos no Drive nem se alterou o repositório canônico.

## Resultado da comparação

A enumeração de quatro nomes em 29/07 é anterior à distinção explícita de 31/07.
Não foi localizada, nas decisões datadas consultadas em `docs/decisions/`,
reabertura posterior que estabeleça quatro regimes. A redação do plano de 05/11
apresenta uma inconsistência interna: seu próprio módulo 4 conserva o estatuto
crítico. Assim, a correção editorial tem respaldo documental vigente, além da
proposta ainda não integrada da #83.

| Superfície no baseline | Formulação encontrada | Correção nesta branch |
| --- | --- | --- |
| `scripts/hf_dataset_card.md`, PT/EN | Quatro regimes | Três regimes, teste crítico, preservação do enum e tabela de contagens com unidade e data. |
| `site/sobre.html`, `site/en/sobre.html` | Quatro regimes, lista única | Lista dos três regimes e explicação própria do teste crítico. |
| `site/index.html`, `site/en/index.html` | Quatro regimes como lente de classificação | Três repertórios de leitura densa e estatuto crítico da contra-alegoria. |
| Acervo, PT/EN | Filtro e ficha denominados «Regime» para qualquer rótulo | «Classificação catalogada», grupos distintos e identificação do rótulo legado; valores e URLs existentes preservados. |
| `stats.json` e seus quatro produtores | `por_regime` inclui todos os rótulos | `por_regime` contém três regimes; `por_rotulo_catalogado` preserva a distribuição completa; `taxonomia` explicita limites. |
| Plano arquitetônico e README | Enumeração ou contrato de estatísticas incompatível | Reconciliação com fontes datadas e documentação da apresentação atual. |

## Contagens e preservação

O ledger canônico e a publicação têm a mesma distribuição de rótulos neste
instantâneo. Igualdade de contagens não significa identidade de todos os
metadados: o acervo é uma projeção editorial e não substitui os ledgers.

| Rótulo armazenado | Ledger `records.jsonl` | Catálogo publicado |
| --- | ---: | ---: |
| Fundacional | 164 | 164 |
| Normativo | 103 | 103 |
| Militar | 54 | 54 |
| Contra-alegoria | 15 | 15 |
| Sem classificação | 1 | 1 |
| **Total** | **337** | **337** |

`por_regime` soma **321**; `por_rotulo_catalogado` soma **337**. Os 16 restantes
não são incorporados aos três regimes. Os 15 rótulos de contra-alegoria não
demonstram aplicação nem resultado do teste crítico. O registro sem classificação
continua acessível no conjunto completo. O recorte editorial Brasil 1822–1922
permanece em 53, dentro do catálogo transnacional mais amplo.

`purification.jsonl` contém 286 observações, outra unidade documental; essa
quantidade não certifica cobertura integral dos 337 objetos. Não se derivam
regimes de somas, médias, limiares ou atributos isolados. Os dez indicadores
ordinais 0–3 e seus inventários verbais permanecem independentes e inalterados.

Hashes SHA-256 verificados antes da alteração:

| Arquivo | SHA-256 |
| --- | --- |
| Ledger canônico `data/processed/records.jsonl` | `533b1587d94c66dae6a12e318cf4ff4f656ed3135e2a217338e1435762dd8d3f` |
| Ledger canônico `data/processed/purification.jsonl` | `b66ca91469a601b437dabf7664c8f9315721d0f9f23984b88d39952d94e4cb21` |
| `site/data/acervo.json` | `6bdb04a50b502381de3c5ed09ff290123de715160cb42398e99e36a8d2904459` |
| `site/data/corpus-data-enriched.json` | `813aef09f2e57cacfec7e7cd1762cd945bfa7a97f70e9fedd9d11d18811367f8` |

Nenhum desses quatro arquivos é modificado. O enum canônico de quatro valores
também permanece. `stats.json` é regenerado pelo produtor, sem editar rótulos.

## Contrato de apresentação

`scripts/taxonomy.py` separa os rótulos armazenados da apresentação interpretativa,
sem mutação dos insumos e de forma idempotente. Os produtores `build_data`,
`acervo`, `corpus_sync` e `publication_stats` aplicam o mesmo adaptador. Os campos
`regime`, `chave`, ordem e contagens históricos permanecem na distribuição
completa; rótulos desconhecidos continuam disponíveis fora dos três regimes.

Consumidores que necessitam da distribuição exaustiva usam
`por_rotulo_catalogado`; não somam `por_regime` para obter `total`. Os filtros
preservam matching exato, combinações com busca/país/período/tipo e links antigos
com `?regime=Contra-alegoria`. PT e EN usam os mesmos valores armazenados.

Os baselines, fixtures, hashes e aprovações editoriais não são reescritos.
Na retirada de adições, a publicação restaura as contagens antigas e mantém a
apresentação vigente. Recibos anteriores são verificados reconstruindo os bytes
históricos e comparando todos os hashes; a compatibilidade não dispensa essa
verificação nem autoriza conteúdos em revisão.

## Exame crítico da formulação

Alvo: textos públicos, especialmente a frase «quatro regimes iconocráticos» da
ficha. O padrão que eles próprios declaram é a fronteira entre «registro
documental verificável» e «interpretação autoral situada».

Achado confirmado nesta sessão: apresentar os quatro valores armazenados como
quatro regimes equipara um enum histórico à tipologia vigente, apesar de a
decisão de 31/07 preservar três regimes e distinguir o teste crítico. Esses
estatutos não podem ser simultaneamente descritos como quatro regimes no mesmo
sentido. O conteúdo que escapa é a função crítica da contra-alegoria e a distância
entre um rótulo herdado e uma leitura efetivamente realizada. Não há achado
condicional necessário à correção.

Função operativa inferida: a fórmula simplifica a publicação ao reproduzir os
valores do campo como categorias teóricas equivalentes. A inferência se apoia
na lista única, no filtro e na antiga distribuição `por_regime`; não atribui
intenção à autora. Seria refutada por decisão posterior explícita que fundamentasse
quatro regimes no mesmo plano analítico. Nenhuma foi localizada nas fontes
consultadas.

| Opção | Consequência | Situação |
| --- | --- | --- |
| Alinhar a apresentação às decisões vigentes | Preserva três regimes, teste crítico e todos os rótulos; não decide a leitura final dos objetos. | Aplicada sob a autorização condicional da usuária, cuja condição foi confirmada. |
| Reabrir a tipologia para quatro regimes | Exige decisão metodológica datada que enfrente a distinção atual. | Não adotada. |
| Reclassificar os 15 registros legados | Exige regra operacional e evidência por objeto, com revisão identificável. | Não adotada. |

Recomendação: manter a primeira opção; sua base mais fraca necessária é uma
decisão primária vigente, conferida juntamente com o contrato e as instruções
atuais. Uma reabertura expressa por Ana alteraria essa recomendação. As escolhas
teóricas e a adjudicação dos objetos continuam pertencendo à autora.

Registro: um achado confirmado, nenhum condicional; correção de apresentação
autorizada e aplicada. Estado do exame crítico: **aberto**, pois a preservação dos
rótulos não resolve sua aplicabilidade a cada caso. História: 05/11/2026,
reconciliação após #86, sem incorporar os demais trabalhos da #83. A ficha HF
é o template do repositório; nenhum dataset remoto ou site de produção é
publicado por esta correção.

## Verificação

As regressões da taxonomia verificam as contagens 321/337, as identidades dos
15 registros legados, rótulos desconhecidos, catálogo vazio, ausência de mutação,
idempotência e os quatro produtores. Os testes do fluxo editorial verificam
retiradas, recibos antigos e rejeição de hashes adulterados. Os testes de navegador
cobrem PT/EN, desktop/mobile, filtros, URLs antigas, fichas e o total completo.

Resultados locais em 05/11/2026:

- Python: 117 testes executados, 115 aprovados, 1 skip (Google Chrome ausente)
  e 1 falha preexistente em `test_game_data`.
- A mesma falha de regeneração de `site/data/jogo.json` foi reproduzida num
  worktree intacto de `cfd40eb4dd26fe8d244babbea191a4fcf09a20a9` (10 testes do jogo
  aprovados, 1 falhou). O texto foi editado na main sem a atualização equivalente
  da fonte do gerador; nenhum arquivo do jogo é alterado aqui.
- Node: 56/56 aprovados.
- Playwright: 16/16 regressões da taxonomia aprovadas, PT/EN em 1440×900 e
  390×844. Chromium 153 local, com configuração temporária externa ao repositório;
  o instalador padrão do navegador não forneceu um ZIP utilizável neste ambiente.
- `publication_sync.py --check`, `acervo.py --check` e `git diff --check` aprovados.
- O workflow de publicação descobre `test_publication_taxonomy.py` em cada PR.
- Os hashes dos dois ledgers canônicos e os bytes de `acervo.json`,
  `corpus-data-enriched.json`, manifesto editorial, overlay, constelações e jogo
  permanecem iguais ao baseline.
