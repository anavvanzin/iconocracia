# Taxonomia pública e classificações históricas

Correção de apresentação, 02/11/2026. Referência: [relatório corrigido de 01/11](https://docs.google.com/document/d/1mpkQKb0pvexRSJ-R7mjiXJrNgFUBMyW284WhebovVd8/edit), seção «Coerência metodológica pública»; relacionada à [issue #46](https://github.com/anavvanzin/iconocracia/issues/46), sem encerrar seus demais pontos.

O método distingue três regimes interpretativos: **Fundacional, Normativo e Militar**.
A **contra-alegoria é um teste crítico**, não um quarto regime. Nem atributos
isolados nem somas de indicadores atribuem automaticamente um regime.

## Contrato dos dados

| Campo | Significado |
| --- | --- |
| `acervo[].regime` e fonte canônica | Rótulo armazenado, preservado integralmente; não constitui uma nova validação metodológica. |
| `stats.por_rotulo_catalogado` | Distribuição completa que antes aparecia em `por_regime`, preservando ordem, grafia de `chave` e contagens. Inclui legados, desconhecidos e não classificados. |
| `stats.por_regime` | Subconjunto das linhas cujos rótulos correspondem aos três regimes interpretativos. Não é uma partição exaustiva do catálogo. |
| `stats.taxonomia` | Declara os três regimes, o estatuto crítico da contra-alegoria e a unidade/limites das contagens. Não atribui resultado de teste a registros. |

No snapshot de `main` `14ff9d8de057d1d3e72d9e00c7bd3f46e01fd267`, os 337 registros
distribuem-se em Fundacional 164, Normativo 103, Militar 54, Contra-alegoria 15 e
Não classificado 1. Assim, `por_regime` soma 321; `por_rotulo_catalogado` soma 337.
Não se incorporam os 16 restantes aos três regimes. Os 15 rótulos históricos
de contra-alegoria não demonstram aplicação ou resultado do teste crítico.
O recorte operacional Brasil, 1822–1922 continua com 53 registros.

Consumidores que precisam da distribuição exaustiva devem usar
`por_rotulo_catalogado`, não somar `por_regime` para obter `total`. Comparação
sem distinção de caixa/espaços seleciona rótulos conhecidos apenas para a
apresentação estatística; não modifica nem agrega as linhas históricas. Rótulos
desconhecidos permanecem na distribuição completa, sem inferência de regime.

Os quatro caminhos de geração (`build_data`, `corpus_sync`, a fronteira opt-in
`acervo` e `publication_stats`) aplicam a mesma apresentação. O pipeline editorial
também a aplica a baselines imutáveis antigos, inclusive quando não há adições
ou há apenas suplemento de imagem. A retirada de adições preserva essa apresentação
vigente e recupera as contagens da base. Os arquivos históricos e o manifesto
editorial não são reescritos. Recibos privados anteriores são verificados por
reconstrução exata da distribuição antiga antes da transição; seus hashes não
são aceitos sem essa verificação. `stats.json` é regenerado; não é editado à mão.

## Consulta pública

Homepage e Sobre explicam a distinção. O filtro «Classificação catalogada»
separa regimes interpretativos, classificações legadas e outros rótulos. As
opções e fichas identificam «Contra-alegoria (rótulo legado)», mantendo o valor
`Contra-alegoria` e links existentes com `?regime=Contra-alegoria`. As combinações
com país, busca, período e tipo continuam usando os mesmos valores armazenados.
Registros sem classificação continuam no catálogo e na contagem total.

Não houve exclusão, alteração da fonte canônica, redistribuição de registros ou
nova regra de classificação. Uma futura reclassificação exige regra metodológica
documentada, evidência e revisão identificável dos registros.

## Regressões

`tests/test_taxonomy.py` verifica identidades legadas, contagens, rótulos desconhecidos,
casos vazios, não mutação, idempotência e caminhos de geração/publicação. Os goldens
e o relatório histórico da fronteira permanecem intactos: seus testes recuperam
a distribuição histórica para comparação, enquanto a taxonomia vigente é testada
separadamente. `tests/browser/taxonomy.spec.mjs` verifica a prosa, os grupos de opções,
IDs e contagens de cada filtro, links antigos, filtros combinados, recarga,
fichas e restauração do total em desktop e mobile.
