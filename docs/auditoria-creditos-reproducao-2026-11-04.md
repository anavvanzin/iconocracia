# Auditoria de créditos de reprodução — fontes remotas

Data: 2026-11-04. Estado: **revisão de lançamento (PR #83, draft)**; achados documentados, sem aprovação editorial ou de direitos além do que já consta nos commits desta branch.

## Escopo e método

Auditoria das fontes remotas de imagem declaradas em `site/data/corpus-data-enriched.json` (campos `thumbnail_url`, `url_image_download`, `url_iiif`), com foco nos arquivos hospedados no Wikimedia Commons — único provedor com licenças de atribuição obrigatória (CC BY) no universo verificado. As licenças foram lidas na API do Commons (`prop=imageinfo&iiprop=extmetadata`: `LicenseShortName`, `Artist`), uma consulta por arquivo, em 04/11/2026. A verificação não inclui conferência visual arquivo a arquivo; identidade binária não foi testada.

O site exibe primeiro o espelho local (`site/assets/acervo/<ID>.webp`, ~336 arquivos) com fallback para a URL remota; a licença da reprodução de origem acompanha a derivada local.

## Arquivos do Commons usados como fonte de imagem (5)

| Item | Arquivo | Licença (Commons) | Situação no PR #83 |
|---|---|---|---|
| BE-002 | `Bruxelles_-_Palais_de_Justice.jpg` | **CC BY 2.0** (Fred Romero) | **Corrigido**: crédito e link de licença na ficha; `rights` em duas camadas (obra × reprodução) |
| BR-005 | `Décio_Villares_-_A_Rep%C3%BAblica.jpg` | Public domain (PD-Art) | Divergência de identidade catalográfica documentada em nota curatorial (ver `docs/auditoria-be-002-br-005.md`); crédito de cortesia incluso |
| FR-012 | `Eugène_Delacroix_-_Le_28_Juillet._La_Liberté_guidant_le_peuple.jpg` | Public domain | Sem pendência de atribuição |
| DE-021 | `Germania5pf1900.jpg` | Public domain | Sem pendência de atribuição |
| UK-004 | `Old_Bailey_Lady_Justice.jpg` | **arquivo removido do Commons** (página inexistente; GET do original retorna HTTP 404) | **Pendente**: ver abaixo |

Conclusão: BE-002 era o único caso de licença com atribuição obrigatória entre as fontes Commons — corrigido nesta branch. Nenhum outro arquivo Commons exige crédito por licença.

## Achado pendente: UK-004 (Lady Justice, Old Bailey)

- `thumbnail_url` e `url_image_download` apontam para `commons/f/f4/Old_Bailey_Lady_Justice.jpg`, **removido do Commons** (motivo não determinado nas fontes consultadas; busca por títulos equivalentes não localizou renomeação evidente).
- O espelho local `site/assets/acervo/UK-004.webp` (24 KB) mantém a exibição; **nenhum visitante vê a URL morta** — ela só seria usada como fallback remoto.
- A ficha cita como fonte `speel.me.uk` (200) e o escultor F.W. Pomeroy.
- Tratamento proposto (mesma honestidade documental aplicada a BR-005): nota curatorial registrando a remoção do arquivo de origem e a preservação da reprodução local, e substituição da URL morta somente quando a reprodução correta for reidentificada. **Não aplicado nesta revisão — pendente de decisão da autora.** Substituir por outra fotografia (ex.: geograph.org.uk, CC BY-SA 2.0) mudaria a imagem de origem e criaria obrigação de atribuição: não fazer sem revisão.

## Inventário dos demais provedores (sem auditoria de licença por arquivo)

Reproduções remotas fora do Commons, por domínio (contagem de ocorrências nos campos de imagem): gallica.bnf.fr (27), bildindex.de (22), loc.gov/tile.loc.gov (18), brasilianafotografica.bn.gov.br (8), iiif.micr.io (8), bndigital.bnportugal.gov.pt (8), media.britishmuseum.org (3), sammlungenonline.albertina.at (2), balat.kikirpa.be (2), outros. São reproduções institucionais de obras em domínio público; cada ficha cita sua fonte (`fonte_url`) e citação ABNT. Verificação de licença provedor a provedor fica **fora do escopo desta revisão** e registrada como pendência de longo prazo.

URLs de fonte (`url`) dos itens BR-022–BR-028, FR-012, FR-070, FR-SEM-SELO-1903 (páginas Commons): verificadas por HTTP em 04/11/2026 — todas respondem 200.

## Nome público (registro de decisão em aberto)

A identidade pública do site segue em reconsideração pela autora; «Mnemosyne Viva» permanece como possível nome, não como decisão definitiva. Ocorrências atuais na superfície pública: 15 pontos em 6 arquivos (títulos, og:title, meta description, prosa e footers de index/sobre/acervo/constelacoes/404, além do README). Nenhum nome foi alterado nesta revisão. A troca futura é localizada e de baixo risco (apresentação pura; não toca dados pinados).

## Integridade

- Consultas à API do Commons com User-Agent declarado de pesquisa; sem downloads além do já registrado em `docs/auditoria-be-002-br-005.md`.
- A verificação de URLs em massa do `validate_acervo.py` não foi usada como fonte de conclusão (rate-limit distorce resultados; ver `site/data/performance.json` para a medição confiável dos espelhos: 332/332 acessíveis, 270 ms médios, 01/11/2026).
