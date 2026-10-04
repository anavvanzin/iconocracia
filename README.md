# Mnemosyne Viva

Site editorial estático para o novo `iconocracia.com`, concebido como casa pública do acervo, do atlas e da pesquisa ICONOCRACIA.

## Estrutura

- `site/index.html` — homepage.
- `site/sobre.html` — apresentação do projeto, método e conceitos.
- `site/acervo.html` — entrada principal pelo campo constelacional, com busca, filtros e modos Palco/Grade para consulta.
- `site/constelacoes.html` — percursos curatoriais aprovados; permanece vazio enquanto o lote estiver em revisão.
- `site/404.html` — página de erro servida pelo Worker para rotas desconhecidas.
- `site/assets/` — CSS e JavaScript.
- `site/data/` — JSONs estáticos usados pela homepage e pelo acervo.
- `scripts/build_data.py` — regenera `site/data/*.json` a partir dos dados do corpus original.
- `scripts/corpus_sync.py` — valida e transforma o export canônico do repositório
  [`iconocracy-corpus`](https://github.com/anavvanzin/iconocracy-corpus) em dados do site.
- `scripts/publication_sync.py` — exporta complementos editoriais aprovados, preservando o catálogo publicado.
- `editorial/publication.json` — manifesto recuperado do PR #33, com fontes e decisões ainda em revisão; fica fora dos assets do Worker.
- `docs/constellation-method.md` — orientação autoral e fundamento da hierarquia constelacional, com limites entre disposição visual e montagem fundamentada.
- `scripts/validate_acervo.py` — valida o JSON enriquecido (estrutura + JSON Schema) e verifica URLs de imagem.
- `scripts/measure_performance.py` — mede o tempo de resposta das imagens e mantém o histórico em `site/data/performance.json`.
- `schemas/corpus-data-enriched.schema.json` — JSON Schema (draft-07) do corpus enriquecido.
- `.github/workflows/validate-acervo.yml` — validação automática semanal do acervo, com resumo via issue quando houver item quebrado ou fora do schema.
- `.github/workflows/performance-acervo.yml` — medição mensal (dia 1) do tempo de resposta das imagens.
- `AUDITORIA-ARQUITETURA.md` — auditoria do repositório de origem e arquitetura proposta.

## Dados e schema

O arquivo `site/data/corpus-data-enriched.json` é um array de itens do acervo. Sua
estrutura é documentada em [`schemas/corpus-data-enriched.schema.json`](schemas/corpus-data-enriched.schema.json)
(JSON Schema draft-07). Campos centrais consumidos pelo frontend (`id`, `title`,
`country`/`country_pt`, `regime`, `motif`, `url`, `thumbnail_url`, etc.) são
preservados; novos itens devem seguir o padrão do schema.

Metadados iconográficos da metodologia ICONOCRACIA são **opcionais** e ficam num
objeto aninhado `iconographic_metadata` (campos: `allegorical_figure`, `iconclass`,
`attributes`, `pathosformel`, `visual_regime`, `state_function`,
`contract_visual_sexual`, `coloniality_of_seeing`, `purification_indicators`,
`atlas_panel`). Quando presente, `build_data.py` preserva
esse objeto em `site/data/acervo.json` sem afetar os filtros existentes.

Validação local (o `jsonschema` é opcional; sem ele, um validador stdlib mínimo é usado):

```bash
pip install jsonschema  # opcional
python scripts/validate_acervo.py --json site/data/corpus-data-enriched.json
```

O export público versionado do corpus canônico é `corpus/corpus-data.json`. Para uma
sincronização reproduzível, use uma cópia local fixada em um commit (ou uma URL raw
fixada) e gere os artefatos fora do diretório editorial:

```bash
python scripts/corpus_sync.py \
  --corpus /caminho/para/corpus-data.json \
  --schema schemas/corpus-input.schema.json \
  --out /tmp/mnemosyne-data \
  --version <commit-ou-release>
```

O campo `editorialStatus` é aplicado quando existir; registros sem esse campo no
export upstream atual são tratados como publicados para manter compatibilidade.
IDs são preservados como strings estáveis, inclusive UUIDs. `acervo.json` e
`stats.json` continuam sendo artefatos gerados e não devem ser editados manualmente.

## Publicação editorial e constelações

O resgate do [PR #33](https://github.com/anavvanzin/iconocracia/pull/33) mantém
os geradores atuais e acrescenta um export editorial separado. A fonte fica
em `editorial/publication.json`, fora de `site/`; não copie esse manifesto
para os assets nem gere prévias de `review`/`withheld`. As duas análises com
aprovação histórica não liberam o lote de oito obras ou suas reproduções.

Com `jsonschema` instalado no ambiente Python do projeto:

```bash
python scripts/publication_sync.py --check
python scripts/publication_sync.py --out /tmp/iconocracia-publication
python -m unittest discover -s tests -v
node --test tests/test_*.mjs
```

O export produz um pacote completo com `acervo.json`, `stats.json`,
`publication-overlay.json` e `constellations.json`. Quando a projeção retorna
à base, os bytes originais do catálogo e das estatísticas são restaurados. Uma
alteração pública exige aprovação autoral, aprovação documental dos direitos
com URL de evidência, crédito, texto alternativo e imagem local confinada a
`site/`, vinculada à aprovação por SHA-256. A análise exige sua própria aprovação. O corpus é fixado por commit
e hash; o baseline público também é verificado por hashes. A constelação
publicada deve conter todas as obras na ordem declarada.

As projeções que alteram a base registram seus insumos em recibos privados,
ignorados pelo Git, em `editorial/.publication-state/`, fora dos assets. Antes
de uma publicação incremental ou retirada, o export refaz a projeção anterior
e compara os hashes do pacote inteiro. Edições externas, pacotes parciais ou
recibos inválidos interrompem a operação antes da escrita. Um checkout limpo
com o pacote completo já igual à projeção aprovada pode ser validado sem
recibo local. `--check` não escreve arquivos nem recibos. Não edite um recibo
para legitimar alterações: ele é um registro derivado, não uma aprovação.

As estatísticas das adições reutilizam as regras de `build_data.py` e a fonte
bruta imutável da base. Apenas os novos IDs aprovados entram na agregação.
Consulte a [revisão posterior ao PR #69](docs/pr69-review-followup.md).

No estado recuperado, os complementos públicos estão vazios e os dados
atuais do acervo permanecem intactos. Consulte a
[revisão técnica](docs/pr33-rescue.md) e a
[revisão editorial por obra](editorial/PR33-REVIEW.md) antes de mudar qualquer
status. `--include-review` é recusado.

## Monitoramento de performance

`scripts/measure_performance.py` mede o tempo de carregamento (HTTP GET completo)
de cada imagem acessível do corpus, calcula a média e anexa uma execução ao
histórico determinístico `site/data/performance.json` (array `runs` com
`timestamp`, `checked_count`, `accessible_count`, `average_response_ms`,
`threshold_ms`, `status` e `top_slowest`). O workflow `performance-acervo.yml` roda
todo dia 1 (09:00 São Paulo), comita o histórico com `[skip ci]` e abre/atualiza
uma issue com os 10 itens mais lentos quando a média ultrapassa 2000 ms.

```bash
python scripts/measure_performance.py --threshold-ms 2000 --top 10
```

## Deploy

O site é HTML/CSS/JS puro, sem etapa de build. Produção = **Cloudflare Worker**
(`npx wrangler deploy`, worker `iconocracia`), que serve `site/` via assets binding e
responde diretamente `/robots.txt`, `/sitemap.xml` (gerado de `site/data/stats.json`),
redirects (`/pesquisa-e-metodo` → `/sobre`) e 404 limpos (`site/404.html`).
Não há deploy Vercel nem endpoints de API.
