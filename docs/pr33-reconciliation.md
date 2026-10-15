# PR #33: reconciliação com a main em 14/10/2026

Base integrada: `eb566c8d0abaeec4126867c1f9f0c7f236846b97`, incluindo
#72, #74 e #73. A #73 já está mergeada; `scripts/acervo.py` continua
opt-in, sem substituir geradores ou autorizar publicação editorial.

## Resolução dos conflitos

O merge efetivo apresentou conflitos em manifesto, schemas, geradores,
artefatos públicos, interface, testes, documentação, configuração do Worker e
sete reproduções binárias. Foi adotada a implementação atual da main em todos
esses arquivos: ela já resgatou seletivamente o pipeline desta PR em #69.
Reintroduzir o gerador antigo faria o catálogo recuar de 337 para 95 fichas,
removeria Columbia e restauraria contratos de publicação obsoletos.

O merge preserva byte a byte os dados, reproduções e configuração atuais.
Não há alteração em `build_data.py`, `corpus_sync.py`, `publication_sync.py`
ou `acervo.py` em relação à main usada como base. A única correção funcional
adicional é o fallback no acervo: após falha da imagem local, usar
`imagem_fonte`, preservando o comportamento legado quando o campo não existe.

## Nove threads abertas no head anterior

| Thread | Contrato adotado e verificação |
|---|---|
| P1 grandfathering | Schema v2 rejeita `grandfathered`; preservar baseline imutável não autoriza novos suplementos. Testes de flag com ID existente e inexistente, aprovação própria e direitos. |
| P1 imagem fora de site | `confined_image` rejeita caminhos absolutos, `..`, separadores Windows e symlinks; exige imagem não vazia e SHA aprovado. Suíte de segurança existente. |
| Metadados iconográficos | Transformer compartilhado mantém metadados; publicação filtra campos aposentados recursivamente. |
| Constelação truncada | Publicação falha se faltar membro, houver duplicação ou membro em revisão; ordem é preservada. |
| Preview withheld | Não há geração pública de review/withheld; `--include-review` falha explicitamente. |
| Identificação canônica | Export emite ID resolvido, conserva alias e rejeita ambiguidades. |
| IDs convergentes | Regressão adicional rejeita duas chaves resolvidas para o mesmo ID nas duas ordens. |
| CLI | `corpus_sync.py --version` continua disponível; export editorial usa `publication_sync.py`, conforme README atual. |
| Fallback de reprodução | Correção para `imagem_fonte`; teste Node falhou antes e passou depois; cobertura da imagem destacada em navegador. |

## Estado editorial

Columbia permanece publicada com sua ordem, cartões, legendas e textos
alternativos aprovados. A projeção reproduz exatamente os quatro arquivos
públicos. Constituições atlânticas e seus oito **suplementos editoriais**
continuam em revisão, fora dos outputs e dos assets do Worker. Suas fichas
preexistentes na base pública de 337 registros não são retiradas nem recebem
as análises em revisão. A moeda mantém a pendência de direitos; os marcadores
históricos de aprovação de duas análises não autorizam publicação do lote.

A regressão `test_publication_pr33.py` verifica os oito status, ordem do lote,
ausência de seus suplementos no overlay e igualdade em bytes da projeção
atual, incluindo Columbia. Nenhuma nova aprovação editorial foi registrada.

## Validação desta atualização

- Python: 92 testes, 91 aprovados e 1 pulado por ausência de `google-chrome`.
- JavaScript: 50 testes aprovados, incluindo fallback e erro de imagem destacada.
- `publication_sync.py --check` e export temporário: aprovados; quatro outputs
  idênticos em bytes aos publicados.
- `acervo.py --check`, golden de produção/histórico, sintaxe JavaScript e
  `git diff --check`: aprovados.
- `npm run test:browser`: os 78 casos não iniciaram o navegador, pois o
  executável Chromium do Playwright está ausente. A instalação tentou baixar
  Chrome for Testing, mas recebeu um ZIP inválido/truncado. Isso não demonstra
  sucesso dos testes de navegador; o caso novo está pronto para execução no CI.

A PR permanece draft e não foi mergeada. A validação de navegador permanece
pendente antes de considerar integração. Os alertas de URLs externas no
workflow agendado são diagnósticos; esta revisão executou os gates locais,
sem atribuir autorização a disponibilidade de terceiros.


## Browser CI follow-up (2026-10-15 UTC)

`browser-tests.yml` runs all 78 Playwright cases (desktop and mobile) on
Ubuntu 24.04 / Node 22, including image fallback, keyboard/focus recovery,
Columbia ordering/captions and exclusion of review/withheld material. It runs on
pull requests, including drafts, and supports manual dispatch once available on
the default branch. It has only `contents: read`, no secrets or deployment step,
and checkout does not persist credentials.

Reproduce on a supported Ubuntu host:

```sh
npm ci
npx --no-install playwright install --with-deps chromium
CI=true npm run test:browser
```

The lockfile pins Playwright 1.63.0 and its browser revision. The official
installer obtains Chromium and its Linux packages; no custom mirror, downloaded
shell script, TLS bypass or manually unpacked browser is used. Browser binaries
are not cached. A larger connection timeout accommodates slow transfers but
does not turn a corrupt archive into a successful installation.

The earlier archive error was reproduced in this restricted execution
environment: Chromium v1243 download reported 0 MiB and failed with
`End of central directory record signature not found`. This points to a
truncated/non-ZIP CDN response (possibly an egress proxy/cache), not missing
Linux shared libraries. The exact upstream cause is unconfirmed. Installation
failure remains a failing CI step and tests are never silently skipped.

CI rejects focused tests, uses one worker and a 15-minute suite deadline; the
25-minute job limit leaves room for setup and artifact upload. HTML, JUnit,
failed-test screenshots, videos and traces are retained for 14 days, including
a failed test run. Inspect the Actions installation log when setup fails before
reports exist. No automatic test retries conceal regressions. Reports can be
opened with `npx --no-install playwright show-report playwright-report`.

Local validation: `npm ci`, discovery of all 78 cases and `git diff --check`
passed. Browser execution requires the successful official installation in CI.
Public data, images, editorial manifests, schemas and approval state are not
modified by this follow-up. The PR remains draft.
