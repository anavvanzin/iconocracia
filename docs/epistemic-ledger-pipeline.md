# Pipeline do Caderno Epistêmico e Constelações (`IURIS_VISIO_Vault` → `site/data/`)

Este documento registra como os materiais metodológicos produzidos no cofre da pesquisa (`IURIS_VISIO_Vault`) entram no site público `iconocracia.com` sem violar os contratos de publicação (`scripts/publication_sync.py`) nem expor itens em `review`/`withheld` de `editorial/publication.json`.

## 1. Caderno de Vínculos Justificados (`site/data/research-links.json`)

- **Origem autoral**: `IURIS_VISIO_Vault/VINCULOS_DE_PESQUISA.md`.
- **Fronteira epistêmica obrigatória**: cada entrada em `links[]` deve manter explicitamente:
  - `status`: `"revisao"` (*Em revisão*) ou `"registrado"` (*Registrado*);
  - `ponta_a` (achado empírico/fonte) e `ponta_b` (formulação teórica/capítulo);
  - `documentado_pt` / `documentado_en` (Camada I) separado de `interpretacao_pt` / `interpretacao_en` (Camada II);
  - `limite_pt`, `objecao_pt` e `verificacao_pt` (e correspondentes em inglês), preservando o caráter falsificável e em verificação do vínculo.
- **Vínculo com o acervo**: o campo opcional `corpus_item_id` só deve apontar para um `id` já presente em `site/data/acervo.json` (nunca para um item pendente em `editorial/publication.json`).
- **Independência de hash**: `research-links.json` é um artefato editorial paralelo; não altera `site/data/acervo.json`, `site/data/stats.json` nem `site/data/constellations.json`, preservando intactos os recibos e hashes de `scripts/publication_sync.py`.

## 2. Dossiês candidatos (`pacote_corpus/DOSSIE_corpus_candidatos.md`)

- Novos itens ou novas constelações oriundos de rodadas de scouting continuam sujeitos integralmente ao fluxo de aprovação descrito em `docs/pr33-rescue.md` e `editorial/PR33-REVIEW.md` antes de qualquer inclusão em `site/data/acervo.json` ou `site/data/constellations.json`.
- Montagens comparativas ad-hoc de obras **já publicadas** podem ser compartilhadas diretamente via URL da Mesa de Montagem (`/acervo?comparar=ID1,ID2,ID3` ou `/en/acervo?comparar=ID1,ID2,ID3`), sem necessidade de alterar os JSONs de publicação.
