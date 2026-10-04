# Acervo de produção — golden da etapa 0

Referência da [issue #52](https://github.com/anavvanzin/iconocracia/issues/52),
capturada em **04/10/2026 UTC (03/10 em São Paulo)** após revalidar `main`
`94b8e124cd3c491fa00463bbc22a33073df0ab93`. O golden descreve o comportamento
anterior à migração; não transforma as regras antigas em decisões curatoriais.

## Revalidação antes da captura

`python3 scripts/build_data.py --out <diretório-temporário>` reproduziu
**byte a byte** os dois artefatos versionados. O script, a fonte enriquecida,
os espelhos e os resultados permanecem iguais aos do SHA auditado na issue,
`adb1eae1b612d7237dd621e395f189c086af151b`. As mudanças posteriores em `main`
tratam de rotas/carregamento e não alteraram esse comportamento.

| Observação | Resultado |
| --- | --- |
| Fonte pública usada como corpus e enriched | 337 registros |
| Itens emitidos / países | 337 / 17 |
| Com reprodução | 332 (248 dependem apenas do espelho local) |
| WebP locais não vazios | 336 |
| Período agregado atual | 1707–1981 |
| Registros com `editorialStatus` | 0 |
| `stats.meta` | Ausente |
| `scripts/acervo.py` | Ainda não existe |

`corpus_sync.py`, executado separadamente com a mesma fonte local, continua
produzindo 337 itens, 84 com reprodução e período 1531–2021. Essa divergência
entre geradores já existia na auditoria; **não houve desvio novo do snapshot
de produção**. A #55 está concluída e não é bloqueio desta etapa.

A verificação cobre os arquivos versionados em `site/data/`, servidos pelo
binding `site/` do Worker. GETs para `https://iconocracia.com/data/acervo.json`
e `https://iconocracia.com/data/stats.json` retornaram HTTP 403 neste ambiente;
a igualdade com os bytes do deployment remoto não foi confirmada nesta execução.

## Conteúdo e isolamento

- `corpus-data-enriched.json`: cópia integral e sem edição da fonte desse head.
- `acervo.json` e `stats.json`: cópias byte a byte dos resultados versionados,
  feitas **após** comprovar sua reprodução (não geradas como oráculo no teste).
- `manifest.json`: SHA do head, caminhos de origem, tamanhos, SHA-256 dos três
  JSONs e nomes dos WebP locais não vazios nesse head.

O teste copia somente o **script atual** para uma raiz temporária, coloca a fonte
congelada em `site/data/` e materializa arquivos de um byte para os nomes do
manifesto. O gerador atual consulta apenas existência, tipo de arquivo e tamanho
não zero: os pixels não são entrada da transformação. Isso evita duplicar 57 MiB
de imagens, mas não é uma validação de integridade ou disponibilidade das imagens.

Sem `corpus/` e sem outputs preexistentes, a CLI sem argumentos usa o fallback
público e deve reproduzir os dois goldens byte a byte. Uma segunda execução com
`--out` verifica determinismo, inclusive ordenação e serialização. Outro teste
usa a fonte e os WebP reais do checkout atual e compara a regeneração isolada
com seus artefatos versionados. Nenhum teste acessa a rede ou escreve em `site/`
do checkout; todos usam somente a biblioteca padrão do Python.

## Executar e evoluir

```bash
python3 -m unittest discover -s tests -p 'test_build_data_golden.py' -v
python3 -m unittest discover -s tests -v
```

O golden roda em PRs e pushes para `main` no workflow de checks existente;
também é descoberto pela suíte Python do workflow semanal. O gerador usado
pelo workflow semanal e os fluxos de produção permanecem inalterados.

Não atualizar automaticamente as fixtures para fazer uma falha passar. Para
mudanças legítimas, mostrar o diff dos artefatos e separar alterações mecânicas
das decisões aprovadas de datas, agregados e proveniência. A migração futura
deverá adaptar o runner para a nova fronteira: esta etapa não cria `acervo.py`,
não muda os geradores e não aplica as decisões editoriais.
