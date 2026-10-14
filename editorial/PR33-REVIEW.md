# Revisão editorial do resgate do PR 33

Revisão de 4 de outubro de 2026, sobre a branch isolada criada a partir de
`fd97da1560bd24826ee9d4bcd69e786668ce5311`. O ponto de origem é o
[PR 33](https://github.com/anavvanzin/iconocracia/pull/33), cabeça `8486013`.
Este documento registra avaliação e pendências; não registra aprovação nova de
Ana, não libera direitos de reprodução e não autoriza deploy.

## Resultado editorial

`editorial/publication.json` recupera os oito registros em `review`, a definição
de **Constituições atlânticas** em `review`, a prosa original, seus indicadores
históricos e três correspondências de IDs. O arquivo está fora de `site/`, a
raiz de assets do Worker. “Fora dos assets” é uma propriedade do fluxo de
publicação, não uma promessa de confidencialidade do repositório GitHub.

As duas análises de **La Nation, la Loi, le Roi** e **Constitution de la Belgique**
conservam o marcador histórico `approved` e a atribuição `ana`, `2026-09-15`.
Esses campos foram copiados para o objeto `public_analysis`, mantendo também os
campos originais da entrada. Trata-se de migração da proveniência existente no
PR, sem nova adjudicação e sem afirmar que Ana aprovou publicação, direitos ou
alterações propostas nesta revisão. Cinco análises permanecem `draft`; a da
moeda permanece `provisional-image-pending`. Não se reescreveu a prosa autoral.

As 95 entradas antigas `published` com `grandfathered: true` não foram
recuperadas como lista de publicação. O bypass foi removido das oito entradas
recuperadas. O acervo atual já contém os oito objetos; recuperar este manifesto
não exige remover os registros atuais nem reimportar o catálogo antigo.

O resultado público esperado deste manifesto é **zero análises suplementares e
zero constelações publicadas**, inclusive em preview. Uma aprovação de análise
não basta para publicar um item cuja situação editorial é `review`.

## Proveniência e preservação do acervo

O export usado pelo PR está fixado no commit
`d5f8ad1d5eaf039f3837d13ad3eb6ef38dedf2b7` de
[`iconocracy-corpus`](https://github.com/anavvanzin/iconocracy-corpus/tree/d5f8ad1d5eaf039f3837d13ad3eb6ef38dedf2b7).
Seu SHA-256 é
`344e37d257821285c265bbbfd4ae61b23922a9df8d5c93f38c5b29a816b77e48`.
O campo `generated_at: 2026-09-15` é a data do manifesto de origem, não a data
desta revisão.

Recontagem dos arquivos da base atual: 337 registros e 17 países. São números
deste instantâneo de trabalho, não o tamanho definitivo do corpus da tese.
Nenhum dos três arquivos seguintes foi editado nesta recuperação editorial:

| Arquivo atual | SHA-256 da base |
| --- | --- |
| `site/data/acervo.json` | `7e063f444cf48ac06b60aaeaa7b8ab82cad2aff4e63c37a377b777fffa35cb7b` |
| `site/data/stats.json` | `1ddc3eb7f44bc6c79646166c92db88e3de6f8d7e6fab27b6c6e12f952fd478a3` |
| `site/data/corpus-data-enriched.json` | `c379d79002f8b68fd820552acd3dedd18151bcc0206d2d81610311e5dcc0a0b6` |

Todos os oito IDs do manifesto casam diretamente com o export fixado e com o
acervo de `main`. Não houve identificação por semelhança de título.

| Alias histórico | ID canônico presente na base atual |
| --- | --- |
| `FR-007` | `2b7a1a18-1a29-5703-9264-6012425c65e8` |
| `US-011` | `39ebfe77-0d0b-5130-8cce-f6f48d85a081` |
| `US-012` | `US-017` |

As correspondências permanecem em `recovered_aliases`, com as URLs de fonte
originais, para revisão futura. Elas não convertem as respectivas entradas
antigas em itens aprovados. O algoritmo deve conservar o ID canônico resolvido
quando recebe um alias; um alias não pode substituir o ID do registro canônico.

## Revisão dos oito objetos

As reproduções locais foram inspecionadas visualmente. A imagem de `BE-004`
exigiu comparação com a versão do PR, porque o arquivo de `main` é um
placeholder. As observações abaixo são sugestões e limites para a próxima
adjudicação de Ana, não alterações silenciosas da prosa.

| Objeto / ID | Análise herdada | Situação para publicação da camada recuperada |
| --- | --- | --- |
| Allégorie à la Constitution / `FR-087` | `draft` | Fonte BnF e termos de reutilização por confirmar; adjudicar personificação e datação. |
| La Constitution Française / `FR-073` | `draft` | Adjudicar o caso negativo; confirmar fonte, datação e descrição do suporte central. |
| Murió la Verdad / `ce773ab1-3bfc-9f6e-754a-efe0c567916d` | `draft` | Distinguir observação, contexto político e hipótese sobre Cádiz; confirmar proveniência da reprodução local. |
| La Nation, la Loi, le Roi / `324a90b6-403b-5b36-9bcf-d4c4db9efdc1` | `approved`, histórico | Aprovação do item e dos direitos ausentes; revalidar a ficha BnF e o arquivo-fonte exato. |
| Proclamation de la Constitution 1848 / `FR-075` | `draft` | Adjudicar caso negativo e sujeitos representados; completar referência institucional e direitos. |
| Constitution de la Belgique / `BE-004` | `approved`, histórico | Reprodução atual é placeholder; resolver crédito e termos UNamur, além de aprovação do item. |
| Abraham Lincoln / `235c545a-f3b8-568a-f268-178806a4bf07` | `draft` | Liberdade é a identificação catalográfica; “Columbia” requer evidência própria; registrar direitos e proveniência do arquivo. |
| 5 Francs, 1880 / `BE-IND-1880` | `provisional-image-pending` | Licença da fotografia e aplicação dos termos Heritage ainda não adjudicadas; o arquivo existente não libera a imagem. |

### `FR-087`: Constituição / Nação, 1789–1791

A reprodução permite observar mulher coroada sentada, livro com inscrições,
leão, busto régio, elementos heráldicos e documentos. A identidade da figura
como Constituição ou Nação constitucional já está formulada como alternativa
na análise; conservar essa cautela. “Leão francês” é uma identificação
interpretativa, não informação produzida pela mera presença do animal. O
intervalo `1789-1791` veio do export, enquanto a reprodução contém `1791`;
transcrever e confrontar esses dados antes de escolher uma data mais precisa.
O motivo `Republica` do registro atual diverge da leitura de monarquia
constitucional do PR e merece correção na fonte canônica após adjudicação.

A [ficha BnF vinculada ao objeto](https://gallica.bnf.fr/ark:/12148/btv1b6948145c.item)
e o serviço institucional retornaram HTTP 403. Não se conseguiu confirmar
novamente autor, ficha completa ou condições de reutilização. A cadeia fonte →
digitalização → WebP precisa de documentação; a expressão herdada “Domínio
público” não é aprovação de direitos.

### `FR-073`: um caso negativo a adjudicar

A imagem local mostra a figura central e os personagens próximos em trajes
masculinos, barrete e coroa, com fumaça ao redor. Isso sustenta a formulação
cautelosa “sem personificação feminina identificável na reprodução”, não uma
certeza sobre toda a população representada ou sobre a ausência de mulheres no
evento histórico. O texto “braseiro” não se resolve com segurança nesta
reprodução: sugerir “suporte elevado cercado por fumaça”, a decidir por Ana.
Não se incorporou essa sugestão à análise original.

O motivo público atual `Republica` conflita com a análise do PR. Os indicadores
`null` e a nota de não aplicabilidade foram preservados; não transformar o caso
negativo em uma linha numérica de zeros. A
[ficha institucional](https://gallica.bnf.fr/ark:/12148/btv1b53009905z.item)
e o serviço BnF retornaram 403. Datação, autoria, contexto exato e termos da
digitalização permanecem por conferir.

### Goya: Verdade, interpretação constitucional e datas distintas

O arquivo local apresenta corpo feminino luminoso, a legenda `Murió la Verdad`,
figuras clericais e uma mulher em luto. O
[Metropolitan Museum](https://www.metmuseum.org/art/collection/search/381424)
identifica o objeto como prancha 79, data a produção em 1814–1815 e a publicação
em 1863; sua reprodução é oferecida como Public Domain. Isso documenta outra
reprodução institucional disponível, sem mudar a origem do WebP atual.

A ficha do [Prado](https://www.museodelprado.es/en/the-collection/art-work/truth-has-died/8c3b0257-606f-4d0b-af9e-73f05de59697)
ficou inacessível na leitura direta; o resultado indexado confirma o conteúdo
político e a mulher de peito descoberto luminosa, mas não substitui a leitura
integral. A associação específica à Constituição de Cádiz e à restauração de
Fernando VII deve conservar o estatuto de interpretação historiográfica
documentada, com referência e passagem precisas, sem apresentar a mulher
enlutada como Justiça constitucional por observação imediata.

A [página do arquivo Commons indicado no PR](https://commons.wikimedia.org/wiki/File:Francisco_de_Goya_Muri%C3%B3_la_Verdad_%28Desastres_79%29.jpg)
declara PDM/PD-Art. Falta registrar a transformação entre esse arquivo e o WebP
local. Não se transferiu a declaração de direitos de uma reprodução do Met para
uma reprodução diferente. Produção, primeira edição e fotografia são datas de
objetos distintos.

### La Nation, la Loi, le Roi: produção e Constituição representada

A reprodução confirma o texto constitucional monumental, a figura feminina de
seio exposto e barrete, galo sobre globo, lanças, bandeiras e ramos. O manifesto
e o export fixado distinguem produção `1835-1841` de Constituição representada
`1791`; o slug histórico não é uma data de produção. A
[ficha BnF](https://gallica.bnf.fr/ark:/12148/btv1b69481105) não foi relida por
HTTP 403. Mantêm-se os dados de Bénard/Binet, intervalo, dimensões e cota já
documentados no export, identificados como herdados, sem nova confirmação.

Uma [página Commons de reprodução da mesma referência BnF](https://commons.wikimedia.org/wiki/File:La_Nation_la_Loi_le_Roi_-_Constitution_fran%C3%A7aise_-_B%C3%A9nard_Graveur_-_c.1835-1841.jpg)
declara PDM/PD-Art e registra recorte. Ela não é automaticamente a mesma página
de arquivo que o PR aponta. É preciso identificar a reprodução efetivamente
usada, o recorte e a proveniência do WebP. “Patrimônio jurídico nacional” e a
hierarquia entre corpo e texto são interpretações autorais conservadas; o
marcador histórico de aprovação da análise não libera direitos ou publicação.

### `FR-075`: proclamação de 1848

A reprodução traz a inscrição `Proclamation de la Constitution 1848`, leitor
com documento, grupo em trajes civis/militares/clericais, moldura e bandeiras.
Não há personificação feminina identificável nessa reprodução. “Inteiramente
masculina” precisa permanecer limitado à identificação visual, sem afirmar
ausência histórica absoluta. Fonte, evento exato, técnica, autoria e data de
produção da estampa precisam da ficha, não apenas da data inscrita.

A [ficha BnF](https://gallica.bnf.fr/ark:/12148/btv1b530172177.item) e o serviço
institucional retornaram 403. A referência atual é apenas o título, portanto
precisa ser completada antes de publicação editorial. O motivo público atual
`Republica` também merece adjudicação na fonte canônica. O resgate conserva
`indicators: null` e não recalcula codificação.

### `BE-004`: frontispício verificável no PR, imagem atual incorreta

A [ficha UNamur](https://neptun.unamur.be/ark:/83449/0091bdf9fa), consultada nesta
revisão, confirma a edição de 1852, Henry Brown e Victor Lagye, editora
Delevingne et Callewaert, e declara PublicDomain/OpenAccess. A reprodução
histórica do PR permite ver a figura feminina coroada, o texto `Constitution de
la Belgique 1831`, leão, raios e homens representando corpos sociais. A data
1831 pertence ao texto representado; a edição é de 1852.

Os [termos gerais do portal](https://neptun.unamur.be/s/neptun/page/mentions-legales)
excluem uso comercial e exigem crédito `©UNamur, Bibliothèque Universitaire
Moretus Plantin`. Essa documentação precisa de adjudicação em conjunto com a
declaração PublicDomain da ficha. O crédito herdado do PR não contém a marca
exigida. Não houve alteração silenciosa nem aprovação nova.

O WebP atual é um ícone de lupa. Seu hash de objeto Git é
`1de74a1091c8eb56f4352f46a1bb1bab5b24c915`; a reprodução do PR tem hash
`6bc92274826e6bfb94b3b59d937043726e299e06`. `tem_imagem: true` e existência de
arquivo não provam identidade da imagem. O arquivo público atual foi
preservado; antes de liberar a constelação, recuperar uma reprodução com
proveniência e direitos adjudicados, sem tratar esse placeholder como documento.

### Lincoln: Justiça e Liberdade

O [catálogo Library of Congress](https://www.loc.gov/item/2003689297/) identifica
as figuras como Justiça e Liberdade, conforme a descrição institucional
indexada acessível; a página direta/API retornaram 403 e a página de recurso
retornou 429. A imagem local permite ver balança e espada à esquerda, Constituição
e haste com barrete frígio à direita, águia e bandeiras. O nível 1 herdado que
atribui à figura da direita um estandarte/bandeiras merece conferência: o atributo
seguro observado é a haste com barrete e o objeto com inscrição `Constitution`.

“Columbia” é hipótese adicional, não identificação confirmada por essa ficha.
Conservar “Liberdade” como descrição catalográfica e manter a hipótese de
Columbia separada, com referência própria caso Ana a adote. O
[arquivo Commons indicado](https://commons.wikimedia.org/wiki/File:Abraham_Lincoln,_Republican_candidate_for_president_of_the_United_States_LCCN2003689297.jpg)
transcreve a declaração de ausência de restrições conhecidas e declara PDM,
com origem LOC. Ainda faltam a proveniência exata do WebP e o registro explícito
de decisão sobre direitos. O argumento sobre caução da candidatura masculina
continua uma interpretação de história da cultura jurídica, conservada como
rascunho.

### `BE-IND-1880`: a moeda não libera a fotografia

A [ficha Numista N#27258](https://en.numista.com/27258), consultada nesta revisão,
confirma o cinquentenário, data 1880 e a descrição do reverso com mulher, leão,
Constituição, Coluna do Congresso e tribunal de Bruxelas. Credita a fotografia
a **© Heritage Auctions** e distingue os gravadores do anverso e do reverso.
Isso oferece evidência catalográfica; não constitui licença aberta nem fonte
institucional primária de toda a interpretação histórica.

Os [termos Heritage](https://www.ha.com/c/ref/website-use-agreement.zx?ic=footer-website-use-agreement-121117)
reivindicam direitos sobre as imagens e admitem uso limitado de uma imagem para
acompanhar artigo escrito pelo usuário, não comercial e creditado. O
enquadramento do acervo/constelação nessa permissão precisa ser decidido e
documentado; não se inferiu liberação geral de uma galeria. Não se solicitou
autorização nem se enviou mensagem ao titular.

Há uma reprodução visualmente legível em `main`, mas `direitos` está vazio no
registro atual, e o PR mantém `image.path` e `license` vazios, com autorização
pendente. A inspeção desta revisão confirma atributos visíveis sem adjudicar
direitos ou recodificar os indicadores. O texto e o status provisório originais
foram preservados, inclusive a limitação histórica “inspeção direta pendente”:
essa frase descreve o estado de origem; uma nova análise deverá documentar a
inspeção e sua autora antes de substituir a versão histórica.

## Constelação e método

A introdução, o subtítulo, a nota metodológica e a ordem dos oito objetos foram
conservados. A ordem se refere à produção, com intervalos e datas herdadas; não
deve ser calculada pelo número de ano presente em slugs ou títulos. “Atlânticas”
é enquadramento comparativo. O conjunto aproxima objetos, mas não prova
circulação, influência ou cadeia causal entre países. Essas afirmações exigem
fontes específicas se forem acrescentadas.

As duas cenas francesas são casos negativos construídos sobre reproduções, não
prova de inexistência histórica de mulheres. Essa limitação afeta a frase da
introdução sobre o desaparecimento do feminino; registrar para adjudicação
antes da liberação. Uma constelação aprovada precisa ter os oito membros
resolvidos, publicados e em ordem. Não se deve publicar uma montagem truncada
com apenas os membros cujos arquivos existem.

Foram lidos o `AGENTS.md` atual do corpus e as decisões
[`2026-07-28-aposentadoria-do-indice-composto.md`](https://github.com/anavvanzin/iconocracy-corpus/blob/33132b3485629183d7378c674c67cd8136d53ce1/docs/decisions/2026-07-28-aposentadoria-do-indice-composto.md)
e
[`2026-09-24-remocao-definitiva-do-campo.md`](https://github.com/anavvanzin/iconocracy-corpus/blob/33132b3485629183d7378c674c67cd8136d53ce1/docs/decisions/2026-09-24-remocao-definitiva-do-campo.md),
incluindo a verificação de 29/09. Os dez indicadores do PR são material
histórico de revisão. Não se somam nem se calcula média, densidade, cardinalidade
ou escore para ordenar a montagem. Não se fabrica inventário verbal a partir
dos números. Na camada pública recuperada, os indicadores históricos e qualquer
composto ficam excluídos. Uma futura aprovação de texto deve observar o dossiê e
o inventário verbal; esta revisão não afirma cobertura já atingida.

## Gates antes de mudar um item para `published`

1. Ana adjudica a prosa e as sugestões deste relatório; cada afirmação histórica
   distingue observação, identificação catalográfica e interpretação com fonte.
2. A fonte canônica recebe correções de motivos, datas ou metadados quando
   necessárias; os exports são regenerados pelo pipeline correspondente. Este
   resgate não altera diretamente os JSONs públicos gerados.
3. A reprodução exata é identificada, com origem, transformação/recorte, crédito,
   texto alternativo e termos/evidência de uso. Placeholder não é reprodução.
4. A entrada registra aprovação editorial de Ana e data; direitos recebem
   aprovação própria com evidência; análise registra aprovação própria. Marcadores
   herdados ou ausência de restrições no catálogo não substituem esses registros.
5. A constelação recebe aprovação própria e confirma todos os membros, sem
   truncamento. `review` e `withheld` nunca entram nos outputs de publicação ou
   preview. O manifesto e este relatório não entram em `site/`.
6. Validadores e testes do resgate passam; o acervo de base mantém os hashes
   registrados. Toda mudança pública posterior exige revisão do resultado
   concreto, inspeção dos workflows e autorização correspondente.

## Limites da verificação

Foi possível ler Numista, UNamur, termos UNamur, termos Heritage, Met e as páginas
de arquivo Commons indicadas. BnF, Prado e LOC bloquearam parte da consulta; os
dados herdados estão assinalados acima. A tentativa de navegador alternativo
também ficou indisponível no ambiente. Não se tratou falha de acesso como
aprovação nem se substituiu uma fonte bloqueada por certeza histórica.

Verificação editorial local concluída: oito correspondências canônicas diretas,
três aliases correspondentes a IDs atuais, duas aprovações de análise herdadas,
cinco rascunhos e uma análise provisória; nenhum item/constelação liberado;
nenhuma mudança nos bytes dos três arquivos de dados de base. Os resultados dos
testes técnicos do pipeline e da interface acompanham a revisão do PR de
resgate; este documento não afirma que foi executado um release do corpus,
deploy de produção ou merge.
