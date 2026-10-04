# Resgate seletivo do PR #33

O PR original continua preservado em `codex/atlantic-constellations`, commit
`8486013fc1b067e8102508eec50b2078555b313f`. Este resgate parte da `main`
`fd97da1560bd24826ee9d4bcd69e786668ce5311`, em checkout isolado. Não recupera
os artefatos antigos de 95 registros, nem altera o fluxo de geração atual.

Antes do push, `main` avançou para
`d8d359ad0c55b0a7abbd8f12e484ed9aff199fc6` (atualização de dependências).
O resgate foi rebased sobre esse commit, sem conflitos e sem alterações nos
dados. O manifesto continua ancorado no snapshot de dados `fd97da1`, cujos
bytes também estão presentes na nova base. As dependências upstream foram preservadas.

O instantâneo público de trabalho foi recontado: 337 registros, 337 IDs únicos,
17 países, 332 registros com imagem declarada e intervalo numérico 1239–2021.
Essas contagens descrevem este commit; o corpus continua em expansão.

## Limite de publicação

O manifesto e os textos recuperados ficam em `editorial/`, fora da pasta
`site/` servida pelo Worker. O histórico de aprovação das duas análises não
aprova as respectivas obras, reproduções ou a constelação. O lote de oito
obras permanece em revisão e não aparece nos artefatos nem em prévias públicas.
O acervo já publicado conserva seus bytes; o resgate não adjudica retroativamente
direitos ou textos existentes. Os novos gates se aplicam ao conteúdo recuperado
e a futuras alterações editoriais.

O gerador separado `scripts/publication_sync.py` recupera o mecanismo editorial
do PR sem substituir `scripts/build_data.py` ou `scripts/corpus_sync.py`.
Produz complementos públicos apenas depois das aprovações e evidências
documentais exigidas. Um lote incompleto deve falhar por inteiro.

## Revisão dos sete achados

Os testes foram escritos sobre uma cópia isolada do pipeline original antes
das correções: sete testes, sete falhas de asserção, sem erros de importação.

| Achado original | Contrato no resgate |
| --- | --- |
| Análise não aprovada, indicadores ou escores vazavam no JSON | Análise exige aprovação explícita; campos analíticos históricos não passam pelo export público. |
| Metadados iconográficos eram descartados | Metadados suportados são preservados; campos retirados continuam excluídos. |
| `grandfathered: true` burlava todos os gates | A flag não autoriza publicação. O baseline existente é ancorado por hashes; mudanças exigem aprovação. |
| Constelação podia ser publicada truncada | Todos os IDs devem resolver; ordem declarada e lote completo são obrigatórios. |
| `withheld` aparecia com `--include-review` | A opção de prévia editorial é rejeitada; review e withheld nunca são exportados. |
| ID canônico resolvido era descartado | Emissão usa o ID resolvido; identificadores anteriores permanecem aliases sujeitos à publicação. |
| Imagem podia escapar de `site/` | Caminhos absolutos, travessia e symlinks externos são rejeitados. |

A revisão independente também encontrou e fechou conflitos entre fontes/IDs
e estados editoriais, reprodução aprovada ignorada pela interface, imagem nova
sem complemento, URL com credenciais, timestamp não determinístico e contagem
de imagens em suplementos. A reprodução aprovada agora é a imagem primária e
seu hash fixa os bytes exatos; indicadores históricos permanecem privados.

## Segurança do push

Todos os workflows do checkout foram inspecionados. O novo job de publicação
faz validação e comparação de artefatos, sem deploy. Os workflows de performance
mantêm seus gatilhos agendados/manuais e não são disparados pelo push da branch.

A configuração ativa do Cloudflare Workers Builds também foi consultada por
GET em 2026-10-04: Worker `iconocracia`, repositório `anavvanzin/iconocracia`,
`branch_includes: ["main"]`, `build_command: ""`,
`deploy_command: "npx wrangler deploy"`, raiz `/`. A branch do draft não
dispara produção. Nenhuma configuração remota, credencial ou permissão foi alterada.

## Regressão de estatísticas já existente

Antes de qualquer mudança do resgate, o teste golden falhava nas duas execuções
de `stats.json`: a fixture histórica de #66 foi capturada em `94b8e12`, antes
da correção #67, e ainda descreve 1707–1981. O teste passou a aceitar somente
a troca explícita desses dois valores para 1239–2021, mantendo os hashes da
fixture e todos os demais bytes. As fixtures e os geradores atuais ficam intactos.
Essa falha anterior consta também no
[run da main de 15:13 UTC](https://github.com/anavvanzin/iconocracia/actions/runs/37212159401).

## Validação

Executado no Python 3.11 do ambiente `iconocracy`, Node 26.8.2 e Chromium do
Playwright, em 2026-10-04:

| Verificação | Resultado |
| --- | --- |
| Python, `unittest discover -s tests -v` | 32 casos: 31 passaram, 1 skip opcional. Inclui 25 casos do novo pipeline e os dois golden. |
| Node, `node --test tests/test_*.mjs` | 42 passaram, zero falhas. |
| Playwright, suíte completa desktop/mobile | 46 passaram, zero falhas; 320, 390 e 1440 px sem overflow no percurso aprovado de teste. |
| Playwright, nova camada após gerar os JSON finais | 10 passaram, zero falhas. |
| Sintaxe de `app.js`, `constellations.js` e Worker; `git diff --check` | Passaram. |
| `publication_sync.py --check` e geração em diretório separado seguida de `cmp` | 337 preservados, zero adições, zero suplementos, zero constelações; artefatos idênticos. |
| Dados e geradores atuais, fixtures históricas | Nenhuma alteração nos bytes de `acervo.json`, `stats.json`, `corpus-data-enriched.json`, nos dois geradores ou nas fixtures. |
| Revisão independente final | Nenhum achado técnico material pendente. |

O skip é o teste Python legado que exige o executável `google-chrome` por nome;
ele não está instalado assim no macOS. A regressão de erro de imagem destacada
desse teste foi executada e passou nos testes Playwright desktop/mobile.

O teste CLI isolado publica uma adição sintética, executa novamente e exige
os mesmos bytes; uma terceira execução após alteração externa aborta sem
sobrescrever essa alteração. Nenhum teste cria aprovação para os objetos reais.

A revisão documental por obra está em
[`editorial/PR33-REVIEW.md`](../editorial/PR33-REVIEW.md).

## Constelação como entrada principal

Após a orientação autoral de Ana, a abertura de `/acervo` passou para o campo
constelacional. O modo aparece primeiro e a ação principal da home leva a ele.
Palco e Grade explícitos continuam persistidos na URL. Links diretos abrem a
ficha sobre o campo após o carregamento; fechar devolve foco visível à moldura
e retira a seleção da URL nesse modo. Filtros não transformam uma seleção de
fallback em novo link direto. O campo acompanha a largura da tela, e molduras
amarelas aleatórias foram retiradas.

A escolha e seus limites estão em
[`constellation-method.md`](constellation-method.md): a disposição estável
atual passa a ser a entrada principal; a montagem de relações históricas e
interpretativas depende da curadoria fundamentada. Nenhuma aprovação ou fonte
editorial foi alterada para efetuar essa mudança.

O novo teste de abertura reproduziu a falha antes dos ajustes. A revisão
independente identificou e confirmou a correção de dois casos adicionais:
seleção excluída por filtro mantida na URL e retorno de foco fora da área visível
após redimensionar a tela com a ficha aberta.

Validação final desta atualização: 62/62 casos Playwright passaram em desktop
e celular, incluindo 16 casos novos de prioridade, URL, deep link, foco,
busca vazia, resize e larguras 320/390/1440 px. Node: 42/42 passaram. Python:
31 passaram e um skip opcional permanece. `git diff --check` passou; os três
JSON, geradores, manifesto, schema e gates permanecem inalterados nesta etapa.
