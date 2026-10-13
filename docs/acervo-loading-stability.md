# Recuperação do acervo — reconciliação local

## Escopo e base

Autorização: “melhore a estabilidade do acervo. veja o github iconocracia”,
“siga no conserto” e “Vamos!” após a proposta de PR, CI, prévia e publicação.
Escopo técnico do loader, sem redesign ou Atlas.

Branch isolada: `fix/acervo-loader-recovery`, baseada em `origin/main`, commit
`1f81699b910cf40045c96e6a5b30d16931fb1c76`. A correção de rota da PR 64 já faz
parte dessa base: `/acervo/` redireciona preservando os parâmetros. Este patch
não altera nem reaplica o Worker ou os workflows. O teste de rota importa
os contratos do loader, mantendo seus quatro cenários existentes intactos.

O patch staged anterior, em `acervo-stability`, permaneceu idêntico. O app,
os dados de teste e a regressão do mapa tardio do frontend isolado também
mantiveram seus hashes durante a verificação. Cópias de preservação e logs
ficam no diretório irmão `acervo-debug`, fora do diff canônico.

## Diagnóstico

Na investigação anterior, o servidor Python de fila pequena produziu resets
em JSON, fontes e CSS. Alterar somente a fila para 128 permitiu 16/16 visitas
aos mesmos arquivos. Isso explica a instabilidade daquele preview local,
sem atribuí-la ao Worker de produção.

Separadamente, o cliente canônico fazia uma única tentativa de carregar os
registros, sem timeout ou recuperação manual. Seu tratamento de falha removia
filtros e item da URL. O primeiro patch resolveu essa recuperação, mas testes
com o cache HTTP real mostraram duas lacunas: uma resposta inválida ainda
fresca bloqueava a recuperação manual; um HTTP 503 armazenado era reutilizado
nas tentativas automáticas. Ambos os testes falharam antes da reconciliação.
Um terceiro teste reproduziu a aceitação de ID composto apenas de espaços.

## Diff reconciliado

Único arquivo de runtime alterado: `site/assets/app.js`.

- Até três tentativas para erros de conexão, timeout e HTTP 408/429/5xx;
  pausas de 250 e 500 ms, deadline de oito segundos incluindo o corpo JSON.
- Tentativas subsequentes e a ação **Tentar novamente** usam `cache: 'reload'`,
  aproveitando a correção compatível já presente no frontend isolado.
- JSON incompatível, ID inválido e país com tipo inválido chegam ao estado
  de erro recuperável; dados científicos não são corrigidos ou filtrados
  silenciosamente pelo cliente.
- URL solicitada preservada durante falhas, controles bloqueados enquanto
  não existem dados válidos e seletores reconstruídos sem opções duplicadas.
- `aria-busy` indica carregamento; recuperação manual devolve foco à busca.
- O controle de recuperação é criado pelo script e reutiliza o CSS existente,
  funcionando também com o HTML anterior em cache.

Não há dependência de `acervo-map.json` no código canônico: as imagens seguem
em `assets/acervo/<id>.webp`. O mapa pertence ao preview; sua chegada tardia
foi verificada separadamente, sem transportar essa integração ou o redesign
para o site canônico. O botão da Constelação permanece conectado e recebe
foco ao fechar a ficha após a atualização tardia.

## Verificação da árvore final

- **36/36 testes browser canônicos**, Chromium desktop 1440×900 e mobile
  390×844, incluindo 40 visitas/reloads com imagens reais e sem resets locais.
- Cache HTTP real, sem interceptação que o desabilite: recuperação de JSON
  inválido ainda fresco e de HTTP 503 armazenado.
- Timeout tanto antes dos headers quanto durante corpo JSON incompleto;
  limite de tentativas, HTTP 404, erro persistente e recuperação manual.
- IDs numéricos, vazios e em branco, país incompatível e parâmetros de URL
  desconhecidos; recuperação mantém seleção, filtros, modo e foco.
- Busca, quatro filtros, três modos, ficha completa, resultados vazios e
  erro de imagem já destacada do DOM.
- **4/4 testes de compatibilidade do preview**, executados sem editar seus
  arquivos: cache e mapa tardio com retorno de foco, desktop e mobile.
- **16/16 testes Node** no job CI existente: quatro de rota e doze contratos
  do loader (cache, retry, timeout e tipos inválidos). Nenhuma permissão de
  workflow foi ampliada. Três testes Python passaram e um foi
  ignorado por exigir o executável Linux `google-chrome`. O comportamento
  desse teste de imagem foi coberto pela suíte Chromium nova.
- Dados, imagens, schemas, HTML, CSS, fontes, Worker e workflows permanecem
  byte a byte iguais à base. `git diff --check` passou.

Os novos arquivos de tooling são `playwright.config.mjs`,
`tests/test_acervo_loader.mjs` e `tests/browser/acervo-loading.spec.mjs` /
`acervo-cache.spec.mjs`.
O manifesto adiciona `test:browser` e Playwright de desenvolvimento; o npm
sincronizou o lockfile, removendo entradas órfãs do sandbox antigo sem mudar
a versão Wrangler já resolvida. Outputs de testes são ignorados pelo Git.

Para repetir:

```sh
npm ci
npx playwright install chromium
npm run test:browser
node --test tests/test_acervo_route.mjs
```

A suíte inicia e encerra `wrangler dev --local` automaticamente. Os cenários
de cache usam um servidor HTTP local com cache real do navegador, não mocks
de `fetch`. Os dados sintéticos desses cenários só existem nas respostas de
teste; nenhum arquivo do acervo foi regenerado.

## Limites

Os números acima descrevem a revalidação local antes do PR. A autorização de
publicação exige CI e prévia aprovados, revisão sem bloqueadores e confirmação
do código efetivamente servido após o merge. Essa verificação não equivale a
testar todos os navegadores ou incidentes reais de produção. O trabalho de
layout e inércia do Atlas permanece fora do escopo.
