# RFC #52 — primeira etapa da fronteira do acervo

Base revalidada: `3641553551ab7b2ec1b4cf7ba1d135271a40f251`, em 13/10/2026.
Esta PR introduz a API e o CLI opt-in. Não conclui nem fecha a RFC #52.
Os geradores legados e o pipeline editorial continuam operando como antes;
nenhum JSON em `site/` é modificado por esta PR.

## API e CLI

```python
from scripts.acervo import build
pacote = build(corpus="corpus/corpus-data.json", enriched="corpus/corpus-data-enriched.json")
pacote.itens
pacote.stats
pacote.meta
pacote.fichas()  # projeção independente para futuras fichas
pacote.escrever(out_dir)  # stage de ambos os arquivos, replace atômico por arquivo
```

`build(corpus=None, enriched=None, source_url=None, *, status="published",
out_dir=None, incluir_meta=True, schema=None)` aceita arrays Python ou caminhos.
Por padrão, resolve `corpus/` e depois `site/data/corpus-data-enriched.json`.
Com corpus explícito e sem enriched, usa o próprio corpus como projeção.
`enriched` é um subconjunto: IDs desconhecidos falham; não pode promover um
registro privado do corpus. Ausência de status significa **published** em ambos
os conjuntos, inclusive em chamadas com `status="review"`.

```sh
python scripts/acervo.py --check
python scripts/acervo.py --out /tmp/acervo-review
python scripts/acervo.py --corpus /path/pinned.json --check
```

`--check` valida entrada e saída sem criar diretórios nem escrever arquivos.
Códigos: 0 válido, 1 erro de fonte/contrato/I/O, 2 erro de argumentos.
`--schema` substitui o contrato de **saída**; o schema de entrada permanece
obrigatório. O CLI sem argumentos grava a nova projeção em `site/data/`:
use `--out` temporário durante a migração e submeta qualquer alteração de dados
em PR para revisão curatorial. `--check` não afirma igualdade com os JSON atuais.

`jsonschema` é opcional localmente e fixado em 4.23.0 no CI. Sem ele, a validação
stdlib implementa os constraints dos contratos atuais, registra um warning e
rejeita constraints desconhecidos. Schemas ausentes nunca são ignorados.
Validação inválida aborta a construção; nenhum pacote inválido é retornado.

A proveniência usa hashes SHA-256 do conteúdo JSON canônico, ordenado por ID,
para corpus e enriched, versão do contrato e contagens. São hashes de conteúdo,
não SHAs de commits Git. Não inclui hora, caminho local ou URL de execução.
Quando a integração com fontes Git fixadas for migrada, seu SHA continuará
sendo responsabilidade do manifesto editorial existente. A resolução das imagens
observa o checkout: reproduções devem integrar o mesmo pacote revisado dos dados.

## Comparação revalidada

| Gerador | Itens | Reproduções | Países | Período |
| --- | ---: | ---: | ---: | --- |
| build_data atual | 337 | 332 | 17 | 1239–2021 |
| corpus_sync atual | 337 | 84 | 17 | 1239–2021 |
| acervo proposto | 337 | 332 | 17 | 1239–2021 |

A correção de datas já está na main: não usar 1707–1981 como resultado atual.
O golden histórico continua intacto e seus testes reconhecem a correção revisada.
`build_data.py` ainda reproduz byte a byte os JSON atuais.

O relatório [acervo-boundary-diff.json](acervo-boundary-diff.json) identifica todos
os IDs por campo alterado e as estatísticas propostas. Comparação com o publicado:

- Nenhum ID adicionado/removido, nenhuma mudança de ordem, país, regime, motivos
  originais, disponibilidade ou período.
- `imagem`: 332 registros passam a apontar explicitamente para seu WebP publicado.
  Cadeia compatível com os consumidores atuais: WebP não vazio →
  thumbnail HTTP(S) → IIIF HTTP(S) → download HTTP(S). Arquivo ausente, vazio,
  fora do pacote ou URL-placeholder não conta como reprodução.
- `suporte`: 43 registros passam a usar `support` quando `medium` está ausente.
  Esta diferença semântica precisa ser examinada antes de trocar o produtor.
- `descricao_longa` e `notas_curatoriais`: campos aditivos nos 337 registros,
  preservando a descrição curta com limite de 600 caracteres.
- `por_regime[].chave`: nomes canônicos em minúsculas. Contagens preservadas.
- Empates de países/motivos são ordenados lexicalmente, sem depender da ordem de
  entrada. Países Espanha e Países Baixos trocam de posição no empate de 10.
- Agregados preservam categorias interpretativas: Alegoria feminina (33) e
  Allégorie féminine (14) voltam ao top 10. Isso desloca `dispositivo estatal
  brasileiro` e `scales`; não apaga esses motivos dos itens. Só o marcador exato
  `descricao_pre_iconografica` é excluído. Nenhum prefixo interpretativo é vetado.
- `stats.meta` acrescenta hashes, versão e contagens estáveis. Os agregados vêm
  exclusivamente dos itens emitidos, não do universo completo de pesquisa.
- `endurecimento_score` é removido recursivamente dos metadados iconográficos;
  os atributos independentes e suas evidências são preservados. O snapshot
  atual já não contém o escore: não há diff nesse campo.

## CI e coexistência com a PR #33

A PR #33 foi examinada no head `5bf5b31560faacbd0436f701b8a17180642d9105`:
está aberta, draft e conflitante com a main. Ela redefine corpus_sync e a validação,
e usa manifesto editorial privado e corpus fixado. Parte desse trabalho já tem
contrapartida na main em `publication_sync.py`, `publication_stats.py`,
`editorial/publication.json` e `publication.yml`.

Esta etapa adiciona apenas `acervo-boundary.yml`, com permissão contents:read,
testes de fronteira, golden de produção e `acervo.py --check`. Não modifica os
workflows de publicação/validação concorrentes da #33, não cria dispatch, não
faz commit automático, merge ou deploy. O pipeline de publicação permanece
responsável por seus gates; acervo.py não substitui aprovação editorial.

Próximas etapas, após revisão explícita do diff de dados: fachadas legadas
compatíveis e consumidores de imagem/estatísticas delegando à fronteira;
integração do manifesto existente sem expor review/draft; sincronização por PR
com fonte fixada; deploy apenas do commit aprovado e validado. Preservar opções
CLI antigas e coordenar a migração com a #33. Quedas de contagem exigem relatório
e revisão, sem vetos numéricos absolutos.

A escrita é atômica por arquivo, não uma transação de dois arquivos. Falha ao
preparar o pacote preserva ambos os destinos; falha entre os dois replaces pode
produzir uma dupla incompleta. O fluxo editorial deve validar a dupla concluída
antes de commit/deploy, mantendo a produção anterior quando houver erro.

## Correções da revisão P1 — 13/10/2026

- URLs de fonte/imagem com userinfo (usuário ou senha, inclusive vazios ou
  codificados) são descartadas. URLs com credenciais em texto livre, citações
  ou metadados aninhados abortam a projeção sem registrar o valor sensível.
  A escrita revalida esse limite antes de criar arquivos.
- `review`, `draft` e `archived` exigem `--out` explícito fora de `site/` para
  escrita. `--check` continua aceitando esses status sem escrever. A API
  `build(..., out_dir=...)` e `pacote.escrever(...)` aplicam o mesmo bloqueio,
  inclusive para caminhos relativos e symlinks resolvidos. O pacote conserva
  o status selecionado; ausência de status nos registros continua published.
- `local_image_path` e `files[].path` alternativos não são selecionados nesta
  etapa: app.js sem o módulo editorial carrega o espelho WebP e faz fallback
  apenas HTTP(S); o módulo editorial já admite alguns caminhos locais. A
  projeção usa a interseção dos contratos para funcionar em ambos os casos. Habilitar caminhos alternativos depende da migração conjunta dos
  consumidores prevista na RFC #52. Não há mudança no frontend ou nos dados.
- JSON emitido ordena recursivamente chaves de objetos, mantém arrays e usa
  UTF-8, indentação de dois espaços e rejeição de NaN. É o formato canônico
  deste módulo, não uma implementação de RFC 8785. Reordenar chaves aninhadas
  preserva bytes e hashes; a ordem editorial dos registros não muda.

Os quatro testes de regressão cobrem credenciais, destinos privados (CLI/API),
imagens locais incompatíveis e chaves aninhadas. O teste do relatório continua
exigindo exatamente os mesmos IDs, ordem e todos os agregados propostos:
337 registros, 332 reproduções, 17 países, período 1239–2021. O golden legado
permanece byte a byte preservado. A projeção não interpreta o manifesto privado
como autorização: a integração com #33 e a aprovação curatorial permanecem
pendentes antes de substituir geradores ou habilitar migração/publicação.

Validação desta revisão: 80 testes Python (79 aprovados, um pulado por ausência
de google-chrome), 44 testes JavaScript aprovados, `acervo.py --check`,
`publication_sync.py --check` e `git diff --check` aprovados. Os quatro novos
testes foram também executados contra o head anterior e reproduziram todos
os P1. Nenhum arquivo público, manifesto editorial ou workflow foi alterado.

## Correções da segunda revisão — 14/10/2026

- A detecção de credenciais examina strings sem controles C0/DEL, inclusive
  URLs interrompidas por newline, CR ou tab, antes da validação de saída e da
  escrita. O erro não inclui o valor sensível; textos válidos são preservados.
- Citações removem URLs-placeholder independentemente do rótulo ou idioma.
  URLs públicas no restante da citação continuam preservadas.
- `stats.meta` inclui `selected_status`, `selected_count` e `items_sha256`
  (hash da projeção canônica emitida). `published_count` conta apenas registros
  publicados elegíveis na projeção enriched, inclusive ao selecionar review,
  draft ou archived. Os hashes do corpus/enriched permanecem iguais.
- URLs de imagens/fontes com portas inválidas ou fora de 0–65535 são descartadas;
  não aumentam a contagem de reproduções.
- O fallback stdlib aplica recursivamente `additionalProperties` quando seu
  valor é um schema, mantendo a rejeição de constraints não suportados.
- O pacote guarda um snapshot imutável do schema de saída, incluindo schemas
  personalizados. `escrever()` reaplica esse contrato e verifica hash, status
  e estatísticas antes de criar diretórios ou preparar arquivos. Mutações
  exigem um novo build, para não publicar proveniência ou agregados obsoletos.

Oito testes novos reproduzem as falhas no head `d3bda5f` e passam após as
correções. Validação: 88 testes Python (87 aprovados; um pulado por ausência
de google-chrome), 44 testes JavaScript aprovados, ambos os CLIs `--check` e
`git diff --check` aprovados. O relatório de migração só acrescenta os três
campos de proveniência; IDs, ordem, 337 itens, 332 reproduções e as 43 diferenças
editoriais de suporte permanecem iguais. Nenhum arquivo em `site/`, manifesto
ou workflow foi modificado; migração, merge e publicação não foram executados.
