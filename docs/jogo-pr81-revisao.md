# FUNDIÇÃO — revisão funcional da PR #81

Revisão iniciada em 1º de novembro e retomada em 5 de novembro de 2026.
Base inicial: `bea5a7d`; base reconciliada: `487ce71`. O commit `01e5a35`,
incorporado na branch durante a pausa, já corrigiu os defeitos principais.
Esta continuação preserva suas correções e testes, bem como os documentos
de arquitetura acrescentados depois dele.

## Apontamentos consolidados

As 11 threads da primeira rodada descreviam nove defeitos distintos.
Na retomada, oito delas já estavam resolvidas; outras dez threads foram
acrescentadas pelas revisões posteriores. Não se somam as
threads duplicadas como se fossem problemas novos.

| Problema | Threads (sufixo do comentário) | Verificação e correção |
| --- | --- | --- |
| Conclusão não persistida | 4433958265, 4433965051 | Confirmado. `cunhou` grava o ID em `concluidos` e salva antes da animação. O mapa libera o sucessor e permite revisitar objetos já cunhados, inclusive por deep-link. |
| Leitura esgota o relógio sem repetir | 4433958267, 4433965056 | Confirmado. A apresentação observa `FAILED`, incluindo `leitou-e-falhou`; exibe repetição e desabilita os controles. |
| Final da campanha inacessível | 4433958270 | Confirmado. O último dossiê oferece uma ação de encerramento. A mensagem de campanha concluída exige todos os IDs; um deep-link isolado mostra “Fim do percurso”. |
| Letras Q–P não selecionam | 4433965060 | Confirmado. As duas fileiras mapeiam os dez eixos. R conserva a recusa na etapa IV; nessa etapa, 4 seleciona o quarto eixo, conforme os controles. |
| Dossiê não modal | 4433965064 | Confirmado. Usa `showModal()`, título acessível e foco inicial no título. A margem automática local neutraliza o reset global e centraliza os diálogos. |
| Pausa por aba oculta sem indicação | 4433965071 | Confirmado. O repaint sincroniza o texto “Continuar” e `aria-pressed`; a retomada continua sendo explícita. |
| Efeitos fora do canvas | 4433965076 | Confirmado por coordenadas e dimensionamento. Mede na carga e usa o centro local do canvas; não coordenadas da janela ou de alavancas externas à platina. |
| Mensagem de imagem ausente sobrescrita | 4433965082 | Confirmado. A indisponibilidade fica no estado do lote e é preservada pelos repaints. |
| Setas mudam seleção, mas Enter aciona foco antigo | 4433983183 | Confirmado. As setas atualizam também o foco do botão. |

A alegação ampla de que era impossível avançar de qualquer forma precisa de
qualificação: “Próximo lote” já permitia avanço linear. O defeito confirmado
era a ausência de conclusão persistida e de desbloqueio pelo mapa. Não se
reproduziu uma causa independente para cada comentário duplicado.

Também se protegeu o retorno assíncrono da imagem e da animação contra troca
de lote: um callback de um estado anterior não deve atuar no novo estado.

## Regressões

A suíte existente foi preservada. Esta continuação acrescenta sete cenários,
executados em desktop (1440×900) e mobile (390×844):

- Dois lotes cunhados pela UI real; desbloqueio do segundo e terceiro;
  persistência após recarga; navegação de volta ao primeiro e ao terceiro;
  quarto lote ainda bloqueado.
- Último lote com e sem predecessores concluídos (dois cenários). Somente
  aqui os predecessores são preparados em armazenamento; a cunhagem final
  usa a UI. Modal, nome acessível, foco e limites da viewport são verificados.
- Espaço ativa o botão focado; a pausa desabilita a prensa e permite retomada.
- Gaveta móvel fechada sai da tabulação; atalhos a abrem antes de focar o eixo.
- Erro de imagem após o timeout de quatro segundos mantém o fallback.
- Um lote que já inicia com todos os eixos no alvo conclui sem erro artificial
  ou consumo de carimbo. Fixture sintética; nenhum lote atual apresenta essa
  condição, embora o gerador a permita legitimamente.

Dois testes Python novos rejeitam booleanos em cada um dos dez eixos e
preservam as observações inteiras reais de 0 a 3. Isso corrige o risco de
`bool` ser aceito como `int`; não se constatou corrupção no manifesto atual.

Os dados do corpus, o manifesto, a elegibilidade e os valores dos dez
indicadores não foram alterados. O armazenamento novo registra somente IDs
concluídos como booleanos, sem somar indicadores ou criar índice composto.

## Ambiente de execução

Python com `jsonschema==4.23.0`; Node 24; Playwright 1.63.0 contra o Worker local.
O download padrão do Chrome for Testing retornou arquivos inválidos neste
ambiente. Para a execução local foi usado Chromium 153 de
`@sparticuz/chromium@153.0.0`, obtido pelo registro npm, com configuração
local temporária e sem vídeo. As dependências e a configuração versionadas
continuam intactas; a CI deve usar o navegador fixado pelo Playwright.

A prévia remota de `bea5a7d` foi aberta e nela se reproduziu a cunhagem do
primeiro lote seguida de mapa ainda bloqueado para o segundo. Isso comprova
o defeito remoto, não a publicação das correções locais.

## Revisões posteriores: confirmado, latente e pendente

| Comentário | Avaliação em 5 de novembro | Tratamento |
| --- | --- | --- |
| 4448821770 | Nome acessível do modal inexistente: confirmado | Corrigido com ID real e foco no título. |
| 4448821777 | Pausa deixa controles aparentando disponibilidade: confirmado | Corrigido; retomada explícita reabilita controles. |
| 4448821791 | Falha tardia de imagem suprimida pelo timeout: confirmado | Callback de erro continua ativo e verifica a identidade do estado. |
| 4448821798 | Python aceita bool como inteiro: risco latente reproduzível | Corrigido no validador, com regressões. Não implica que o corpus atual contenha esse erro. |
| 4448821803 | Lote inicialmente no alvo exige golpe errado: risco latente | Corrigido na transição de início e na persistência; cenário sintético coberto. |
| 4476634836 | Espaço sobre outro botão estampa eixo: confirmado | Ativação nativa preservada. |
| 4476634851 | Gaveta fechada mantém controles na tabulação: confirmado | Tabindex acompanha gaveta e viewport; atalhos abrem a gaveta. |
| 4448821762 | Promessa de ordem cronológica diverge do manifesto: confirmado | Pendente. Não reordenar silenciosamente a campanha existente neste ajuste de persistência; alinhar a decisão de ordem entre gerador, UI e documentação. |
| 4476634841 | JSON/UI expõem coded_by e notas sem review_state: confirmado | Pendente de reconciliação editorial com a arquitetura de 02/11. A proposta também prevê manter site/ durante as fases iniciais; não se presume aprovação editorial nem se executa a migração nesta correção funcional. |
| 4476634843 | Três lotes sem fonte_url: confirmado | Pendente: SCOUT-564, SCOUT-568 e SCOUT-565. Não inventar URLs; localizar a fonte ou excluir mediante revisão do manifesto. |

A conclusão dos testes funcionais não autoriza integração ou publicação do
manifesto. As três pendências acima continuam explicitamente abertas.

## Resultado final da validação local — 05/11/2026

| Step | Status | Details |
| --- | --- | --- |
| Python: unittest discover | PASS | 110 testes executados: 109 aprovados, 1 ignorado porque google-chrome não está instalado no caminho esperado por esse teste legado. |
| JavaScript: node --test tests/test_*.mjs | PASS | 50 aprovados. |
| Playwright: suíte completa contra Worker local | PASS | 144 aprovados em 3,6 minutos; Chromium 153, projetos desktop e mobile. Inclui 44 execuções específicas de FUNDIÇÃO. |
| Contrato metodológico do jogo | PASS | 11 testes aprovados; manifesto reproduzido byte a byte, schema válido e ausência de agregado. |
| Revisão visual local | PASS | Dossiê centralizado e focado no título em 1440×900 e 390×844; ações acessíveis por rolagem. |
| git diff --check | PASS | Nenhum erro de whitespace. |
| Integração e publicação em produção | NÃO EXECUTADAS | Pendências editoriais acima permanecem abertas. |

Aplicado `iconocracy-agent`, modo INFRA, em 05/11. O escopo é a implementação
em `anavvanzin/iconocracia`, não uma alteração do ledger canônico de
`iconocracy-corpus`. Testes funcionais não são validação da hipótese histórica.
A campanha brasileira, os comparadores e o corpus amplo têm estatutos distintos;
a pontuação lúdica não atribui regimes nem constitui índice dos dez indicadores.
Nenhuma adjudicação, fonte, nota interpretativa ou aprovação editorial foi criada.

### Complemento: pausa no briefing

A revisão automática de `bf688d0` confirmou que o botão de início sobre a imagem permanecia habilitado durante a pausa. O estado disabled agora acompanha o controle principal, e retomar reabilita ambos. Regressão adicional aprovada em desktop e mobile: 2/2. A suíte completa anterior permanece com 144 aprovações; não foi repetida para esta alteração localizada.
