# Auditoria de reprodutibilidade editorial — 23/10/2026

As quatro falhas observadas na [PR #77](https://github.com/anavvanzin/iconocracia/pull/77)
precedem a correção do modo noite. O primeiro commit que as reproduz é
[`529fb580545079581b066031d08a140705ceb997`](https://github.com/anavvanzin/iconocracia/commit/529fb580545079581b066031d08a140705ceb997),
de 20/10/2026: acrescentou `recorte_tese_brasil_1822_1922: 53` ao
`site/data/stats.json` e uma quebra de linha final, sem atualizar o gerador nem
a referência histórica do manifesto editorial.

## Evidência temporal

Reprodução em worktrees isoladas, sem modificar os dados públicos:

| Referência | Verificação Python | `publication_sync.py --check` |
| --- | --- | --- |
| `eb566c8` — merge da PR #73 | 89 testes: 88 aprovados, 1 ignorado | aprovado |
| `8e9ba07` — pai de `529fb58` | 92 testes: 91 aprovados, 1 ignorado | aprovado |
| `529fb58` — edição do agregado | os quatro testes afetados falham | rejeição confirmada pelo teste do workflow |
| `29438d6` — main/base da PR #77 | 92 testes: 87 aprovados, 4 falhas, 1 ignorado | rejeitado |
| `1142eec` — head da PR #77 | 92 testes: 87 aprovados, as mesmas 4 falhas, 1 ignorado | rejeitado |

O teste ignorado exige o executável `google-chrome`. A reprodução usou Python
3.12.14, Node 24.19.0 e `jsonschema==4.23.0`. A primeira tentativa local sem
`jsonschema` foi descartada como falha de ambiente; a tabela usa a dependência
instalada. O CI usa Python 3.11.

O diff `29438d6..1142eec` contém somente cinco páginas HTML e dois arquivos de
testes de tema. Corpus, manifesto, scripts de dados, snapshots e workflows são
idênticos entre esses dois commits. Não há alteração editorial introduzida pela
PR #77.

Os logs do GitHub confirmam:

- [Validate acervo boundary](https://github.com/anavvanzin/iconocracia/actions/runs/39609761016):
  os testes da fronteira passam; a reprodução dos bytes de `stats.json` falha.
- [Validate editorial publication](https://github.com/anavvanzin/iconocracia/actions/runs/39609761196):
  falham a reprodução do pacote Columbia, o agregado completo e a checagem do workflow.
- [Conflict markers](https://github.com/anavvanzin/iconocracia/actions/runs/39609761738):
  scanner e regressões Node passam; falha o job **Acervo production golden**.
- [Browser tests da PR #77](https://github.com/anavvanzin/iconocracia/actions/runs/39609760946):
  concluído com sucesso. Esse resultado pertence à PR visual, não a esta correção.

## Fontes e divergência exata

O manifesto apontava para `fd97da1560bd24826ee9d4bcd69e786668ce5311`.
Esse snapshot contém os mesmos 337 registros, na mesma ordem, e os mesmos bytes
de `corpus-data-enriched.json` e `acervo.json` existentes em `529fb58` e na main.
Sua única diferença em estatísticas é a ausência da nova chave e do LF final.

Antes da correção, a reprodução do manifesto já coincidia byte a byte com
`acervo.json`, `publication-overlay.json` e `constellations.json`. Somente
`stats.json` divergia:

| Artefato | SHA-256 dos bytes versionados preservados |
| --- | --- |
| `corpus-data-enriched.json` | `c379d79002f8b68fd820552acd3dedd18151bcc0206d2d81610311e5dcc0a0b6` |
| `acervo.json` | `7e063f444cf48ac06b60aaeaa7b8ab82cad2aff4e63c37a377b777fffa35cb7b` |
| `stats.json` atual | `6953066a5534cfe30c8abb5d5ca4379ee22c109523e403cb825bada4a31bc04e` |
| `stats.json` na referência antiga | `1ddc3eb7f44bc6c79646166c92db88e3de6f8d7e6fab27b6c6e12f952fd478a3` |
| `publication-overlay.json` | `165bb628ab94a5cb3f64bd1e76c23f47a78d5f53c871b32494b5bc9e32271a74` |
| `constellations.json` | `2d50a92f2d3159234ffdbf1b853a8bab0231616cbfb35ff3789d3ebd0728b97b` |

`publication_sync.py` recusa um destino que não coincide com a base nem com o
pacote reproduzido. A mensagem sobre estado privado era, neste checkout, a
consequência dessa divergência comprovada de `stats.json`; não demonstra perda
de corpus privado. O manifesto tem oito suplementos em `review`, nenhum item
novo com publicação aprovada, a constelação atlântica em revisão e Columbia
publicada. Essa seleção permanece intacta. A reprodução atual não exige buscar
o corpus privado remoto.

## Correção proposta

1. `build_data.build_stats` calcula o agregado a partir de `country` normalizado
   como Brasil e **`year` inteiro entre 1822 e 1922, inclusive**. O gerador
   serializa `stats.json` com o LF que já existe desde `529fb58`. A serialização
   de `acervo.json` permanece igual.
2. `editorial/publication.json` passa a apontar para o commit histórico
   **já versionado** `529fb58` e seu hash de estatísticas. Os hashes do catálogo
   e da fonte permanecem iguais; nenhum campo de seleção, aprovação, imagem,
   análise, constelação ou vínculo ao corpus privado muda.
3. O golden histórico de 04/10 permanece intacto, com seus hashes originais.
   O teste explicita a transformação aditiva de `529fb58` em sua expectativa,
   assim como já fazia com a correção do período da PR #67. Não copia a saída
   gerada para o golden nem elimina a comparação exata de bytes.
4. Regressões verificam os limites do recorte, ausência de inferência a partir
   de datas textuais, inclusão/retirada de adições aprovadas, exclusão de fontes
   não selecionadas, identidade dos bytes antigos/novos e rejeição de qualquer
   divergência nos quatro arquivos, mesmo sem recibo.

`publication_stats.py` já reutiliza `build_data.build_stats` para adições e
reconstruções completas, preservando ordem canônica e semântica dos agregados.
Não precisou de outra fórmula. Sem adições, preserva o snapshot agora correto.

### Alcance metodológico do número 53

Há 73 registros brasileiros na fonte pública. O campo estruturado `year`
seleciona 53 deles no intervalo; procurar anos somente no texto de `date`
selecionaria 52. A diferença é `SCOUT-563`, com `date: "século XIX"` e
`year: 1850`. O cálculo conserva essa codificação existente; não estabelece
1850 como data historicamente comprovada nem aprova uma nova inclusão no corpus
da tese. Valores ausentes ou que não sejam inteiros não são inferidos do texto.
O agregado descreve a seleção fornecida ao gerador, não toda a base privada.

### Fronteira opt-in e recibos anteriores

`scripts/acervo.py` continua sendo a proposta opt-in da RFC #52. Seu `--check`
valida o próprio pacote e não afirma igualdade com a produção. Diferenças já
documentadas de motivos, regimes, desempates e projeção de imagens permanecem
em `docs/acervo-boundary.md` e `docs/acervo-boundary-diff.json`. Essa projeção
baseada nas fichas também não conserva `year` para reproduzir o novo recorte;
uma futura migração deverá carregar a informação canônica, não inferi-la de
`data`. Esta correção não migra os dados públicos para essa fronteira.

Recibos privados antigos são vinculados à base e ao destino. Se um ambiente
possui recibo de outra base, a validação continuará recusando-o: não houve
relaxamento desse controle, remoção automática de recibos nem adoção de JSON
vivo. Qualquer restauração desse ambiente deve usar seu histórico confiável e
ser revisada separadamente. O checkout auditado não tinha recibo do destino
`site/data`; a conferência corrigida passa sem criar um.

## Validação da correção

| Verificação | Resultado local |
| --- | --- |
| `python -m unittest discover -s tests -v` | 96 executados: 95 aprovados, 1 ignorado por ausência de `google-chrome` |
| `node --test tests/*.mjs` | 50/50 aprovados na branch separada baseada na main |
| `python scripts/publication_sync.py --check` | aprovado; 337 itens, 0 adições, 2 suplementos e 1 constelação |
| `python scripts/acervo.py --check` | aprovado; 337 selecionados, sem warnings |
| Teste do workflow editorial | reprodução em diretório temporário e comparações exatas aprovadas |
| Replay dos quatro artefatos | identidade byte a byte, sem escrita no destino público |
| `git diff --exit-code -- site/ tests/fixtures/` | nenhuma alteração |
| `git diff --check` | aprovado |

Não foram regenerados arquivos de `site/`, alterados snapshots históricos,
criados recibos artificiais, modificados workflows ou desativadas verificações.
Os testes existentes exercitam geração/recibos legítimos somente em destinos
temporários. O catálogo permanece com **337 registros, 332 com imagem e 53 no
agregado brasileiro**, sem inclusão de material em revisão. Não houve merge ou
publicação. Os resultados de CI da nova proposta devem ser consultados na PR.

## Reprodução

```sh
python -m pip install 'jsonschema==4.23.0'
python -m unittest discover -s tests -v
node --test tests/*.mjs
python scripts/acervo.py --check
python scripts/publication_sync.py --check
git diff --exit-code -- site/ tests/fixtures/
git diff --check
```

Para repetir a localização temporal, execute os quatro testes nomeados na
descrição da PR #77 em worktrees de `8e9ba07`, `529fb58`, `29438d6` e
`1142eec`, com o histórico Git disponível. Não execute os geradores sem
`--check` sobre `site/data` para tentar corrigir o estado publicado.
