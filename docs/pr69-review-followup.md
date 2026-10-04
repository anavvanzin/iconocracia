# Revisão posterior ao PR #69

Este patch corrige os dez comentários da revisão automática do head
`25ded3febb087adb549c789381bf3158d32ec5d1`. A implementação foi entregue em PR
em rascunho. Depois da revisão, Ana autorizou a publicação em 2026-10-04,
condicionada à validação do head, da prévia hospedada e dos gates. Não há novas
aprovações editoriais ou de direitos.

## Base e preservação

Worktree isolada `pr69-followup`, branch `codex/publication-review-followup`,
base `origin/main` em `92d1ed9bee76ee39f0b46bd98dd6801f4f1e154b`. A contagem
direta deste instantâneo público encontrou 337 registros com IDs únicos,
17 países e 332 imagens declaradas. São contagens de trabalho, não um limite
para o crescimento do corpus.

| Arquivo | SHA-256 na base |
| --- | --- |
| `site/data/acervo.json` | `7e063f444cf48ac06b60aaeaa7b8ab82cad2aff4e63c37a377b777fffa35cb7b` |
| `site/data/stats.json` | `1ddc3eb7f44bc6c79646166c92db88e3de6f8d7e6fab27b6c6e12f952fd478a3` |
| `site/data/corpus-data-enriched.json` | `c379d79002f8b68fd820552acd3dedd18151bcc0206d2d81610311e5dcc0a0b6` |
| `site/data/publication-overlay.json` | `da6fa0fb6dc64a3faf1f81f830b8696ccf02b9c654135111429090fa240870f8` |
| `site/data/constellations.json` | `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570` |

O manifesto recuperado continua em revisão. Fixtures sintéticas exercitam
aprovações somente nos testes; não alteram as decisões sobre os objetos reais.
Os geradores existentes, as fixtures históricas, a prosa original e os dados
atuais foram comparados com esta base e permanecem intactos.

## Achados cobertos

| Comentário no PR #69 | Contrato a verificar |
| --- | --- |
| `4178629140` | Palco/Grade para Constelação mantém a mesma ficha fechada após reload, enquanto um link direto abre a ficha. |
| `4178629120` | Alterações só de imagem disparam a validação editorial de hashes. |
| `4178629121` | Alias que colide com ID canônico é recusado em qualquer ordem. |
| `4178629152` | Correspondências por URL nos dois catálogos não podem esconder identidades divergentes. |
| `4178629131` | A análise aprovada produz os mesmos bytes em processos com sementes Python diferentes. |
| `4178629123` | Publicação incremental reconhece somente a projeção anterior verificada. |
| `4178629124` | Retirada restaura a base confiável, sem sobrescrever edições externas. |
| `4178629156` | Adições mantêm as normalizações e agregações do gerador de produção. |
| `4178629142` | A nota metodológica aprovada aparece na página do percurso. |
| `4178629146` | Pesquisa e método oferece navegação condicional para percursos publicados. |

As duas últimas omissões e os casos do pipeline são exercitados com fixtures
publicadas. No estado real, os JSON editoriais públicos permanecem vazios.

## Regressões reproduzidas antes das correções

- Interface: quatro testes desktop falharam nos dois modos de seleção, na
  ausência da nota metodológica e na ausência do marcador de navegação.
- Workflow: cinco testes expuseram dez falhas de cobertura e descoberta antes
  da remoção do filtro. Os comandos de validação e comparação já presentes
  foram executados pelo teste, sem deploy.
- Estatísticas: o helper anterior não reproduziu os agregados do instantâneo
  de produção, incluindo ordem de empates, caixa dos regimes e ruído nos motivos.
- Identidade, serialização e transições: seis casos novos produziram doze
  falhas de asserção; os 25 testes anteriores dos gates passaram nessa rodada.

## Limites da alteração

Entrar no campo por troca de modo remove a seleção da URL e conserva a ficha
fechada. A carga inicial por link direto, incluindo aliases canônicos, ainda
abre a ficha. A nota metodológica é inserida como texto literal; estados em
revisão, retidos ou incompletos continuam indisponíveis. A navegação em Pesquisa
e método segue a mesma disponibilidade das demais páginas.

Para agregação, `publication_stats.py` reutiliza `build_data.build_stats` com
a fonte bruta da base imutável, na ordem original. Apenas fontes dos novos IDs
efetivamente publicados são acrescentadas. A disponibilidade de imagem vem da
projeção aprovada. Os geradores existentes permanecem intactos.

A validação editorial passa a executar em todas as PRs e descobre os novos
testes `test_publication*.py`. Continua com `contents: read`, sem dependências
novas e sem operação de deploy.

Publicação e retirada conferem o pacote inteiro de quatro arquivos antes da
primeira escrita. Um recibo privado por destino, em
`editorial/.publication-state/` (ignorado pelo Git e fora de `site/`), guarda o
manifesto e o corpus fixados da projeção anterior. O pipeline recalcula essa
projeção e seus hashes; hashes isolados não autorizam sobrescrever dados vivos.
A retirada da última adição ou imagem restaura os bytes originais da base.

O replay histórico pode reconhecer uma imagem anterior já removida do disco,
mantendo a validação de caminho, esquema, aprovações e hash declarado. A
publicação ativa continua exigindo a existência e o hash dos bytes atuais de
cada imagem. Não há flag de CLI que dispense esses gates.

Um checkout novo reconhece seu pacote já comprometido somente quando os quatro
arquivos coincidem com a projeção aprovada recalculada. Um predecessor diferente
exige recibo verificável. Recibo ausente ou corrompido, arquivos parciais,
mistura de projeções, edição externa ou symlink são recusados antes da escrita.
A recuperação exige restaurar um snapshot/recibo confiável; editar um recibo
para legitimar saídas arbitrárias não é procedimento de recuperação.

Os quatro arquivos não são uma transação atômica do filesystem. Uma interrupção
entre escritas pode deixar um pacote parcial, que a execução seguinte rejeita;
não tenta corrigir silenciosamente esse estado. `--check` valida o destino sem
escrever arquivos ou recibos.

## Validação final

- Python: 59 testes, 58 aprovados e um skip pela ausência do executável opcional
  `google-chrome`. São 52 casos editoriais (25 anteriores, 11 de identidade e
  transições, 11 de estatísticas e cinco de workflow), além dos golden e do
  pipeline existente. A corrida de carregamento de imagem coberta pelo teste
  opcional também passou no Playwright em desktop e celular.
- Playwright: 74/74 casos aprovados em desktop e celular, incluindo 12 novos
  casos de navegação, nota literal, disponibilidade e links por alias.
- Node: 42/42 casos aprovados; checagens de sintaxe JavaScript passaram.
- CLI: `--check` e export em destino temporário aprovados. Os quatro arquivos
  exportados foram comparados byte a byte com os arquivos públicos atuais.
- Preservação: os cinco JSON públicos, o manifesto editorial, os geradores
  existentes e as fixtures históricas permanecem sem diferenças contra a base.
  `git diff --check` passou.
- Revisão independente: sem achados materiais; sete recibos adicionais
  malformados foram recusados sem traceback e sem alteração pública.

Os testes exercitam publicação incremental, retirada parcial e total,
independência da ordem dos aliases, divergência entre catálogos, sementes Python
diferentes, perda/corrupção do recibo, pacote misturado, symlinks e retirada após
remoção da imagem anterior. Nenhuma aprovação real foi acrescentada. As
evidências dos checks e da publicação são registradas no PR #70.

## Configuração da prévia hospedada

Os builds automáticos do head `a63626d` falharam nas duas integrações Cloudflare
porque `npx wrangler preview`, executado com Wrangler 4.147.0, exige um bloco
`previews` no arquivo de configuração. Nenhum deles produziu URL de prévia.
Os jobs GitHub aprovados não demonstravam sucesso da hospedagem.

O ajuste acrescenta somente `"previews": {}` a `wrangler.jsonc`, conforme a
[configuração oficial](https://developers.cloudflare.com/workers/previews/configuration/).
Assets permanecem em `site/`, fora de `editorial/`. A configuração de produção,
a data de compatibilidade, as migrações históricas e os comandos remotos ficam
intactos. A inspeção da configuração efetiva do Worker `iconocracia` confirmou
ausência de base com bindings, variáveis ou segredos para a prévia; produção
tem somente o binding `ASSETS`. O código apenas lê esses assets.

O teste de configuração falhou antes do ajuste e passa com o bloco vazio. Dois
casos novos verificam a adesão explícita ao modo de prévia, ausência de bindings
de recursos e o limite dos assets: manifesto, recibos, arquivos do repositório
e o endpoint removido `/api/exec` respondem 404. A suíte Node fica em 44 casos.

O contrato de validação hospedada exige build vinculado ao head atual, hashes
dos arquivos servidos iguais aos da branch, contagem direta do catálogo,
artefatos editoriais vazios, caminhos privados inacessíveis e navegação em
desktop/celular. O resultado e a URL efetiva são registrados na descrição do
[PR #70](https://github.com/anavvanzin/iconocracia/pull/70). Produção continua no
Worker `iconocracia`, com domínio `iconocracia.com` e deploy de `main` separado.
O ajuste não altera a infraestrutura adicional `iconocracia-site` nem concede
acesso a recursos. A publicação em produção depende da autorização autoral
recebida e da validação dos gates; configurar a prévia não substitui esses passos.

## Dois achados da revisão automática do PR #70

A revisão do head `085778e` identificou duas inconsistências da CLI:

- [`4179096647`](https://github.com/anavvanzin/iconocracia/pull/70#discussion_r4179096647):
  a validação ativa usava `--schema`, mas o replay do recibo usava o schema
  padrão. O schema escolhido deve ser aplicado tanto à publicação ativa quanto
  ao replay anterior e à conferência do novo recibo. O formato do recibo e os
  hashes fixados permanecem intactos. Um schema incompatível com o predecessor
  interrompe a transição sem escrever; é preciso selecionar um schema
  compatível para recuperar aquele snapshot.
- [`4179096650`](https://github.com/anavvanzin/iconocracia/pull/70#discussion_r4179096650):
  `--check --out` aceitava um arquivo regular como raiz ou ancestral do destino,
  embora a escrita real falhasse. Raiz e ancestrais existentes devem ser
  diretórios nas duas operações. As exceções restritas para os aliases de
  diretório `/var` e `/tmp` do macOS continuam válidas.

Antes das correções, os dois testes de regressão produziram cinco falhas.
Depois delas, os testes dirigidos passaram. O teste do schema cobre a primeira publicação, replay anterior,
checagem sem escrita e recusa do schema padrão incompatível sem modificar
saídas ou recibo. O teste do destino cobre raiz e ancestral como arquivo em
ambos os modos, preservando o arquivo do usuário e sem criar estado privado.
Nenhum conteúdo de `site/`, manifesto ou decisão editorial é alterado por
essas correções da CLI.

A revisão independente reproduziu uma regressão adicional da propagação:
o helper compartilhado ignora o schema quando o arquivo não existe. Um caminho
incorreto era aceito tanto em `--check` quanto na escrita. O pipeline editorial
agora exige arquivo existente, JSON legível e schema Draft7 válido, e valida
o corpus mesmo quando vazio e nos replays. O helper compartilhado permanece
intacto e continua conferindo os IDs depois da validação estrita.

O novo teste cobre oito subcasos: schema ausente, diretório, JSON inválido e
schema estruturalmente inválido nos dois modos, sem alteração de saídas ou
recibo. A regressão foi reproduzida antes da correção. A suíte editorial final
passou com 55/55 casos; `git diff --check` passou.
