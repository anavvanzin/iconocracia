# Auditoria catalográfica — BE-002 e BR-005

Data da consulta: 13/10/2026. Estado: **documentação de pesquisa; correções propostas, sem aprovação editorial ou de direitos**.

## Escopo e snapshots

Auditoria vinculada à [PR #71](https://github.com/anavvanzin/iconocracia/pull/71), branch `fix/be-002-br-005-image-urls`, head examinado `31b65723f639bf33877ae17f115bb489b59b59f1`, base `8bc0f16a893e9fd2f49dce13d4bc7828971fb46f`.

Foram confrontados:
- `site/data/corpus-data-enriched.json` e sua projeção `site/data/acervo.json`;
- `corpus/corpus-data.json`, `corpus/corpus-data.v2.json` e `corpus/corpus-data-enriched.json` do upstream `anavvanzin/iconocracy-corpus`, tanto no commit fixado `d5f8ad1d5eaf039f3837d13ad3eb6ef38dedf2b7` quanto no HEAD observado `5839bd057d1f27c75be2a70d90362bd0794a51a8`;
- WebP existentes, TIFF e JPEG da NYU, descrição do Commons e página ilustrada do catálogo institucional do Senado.

As divergências já existem no corpus fixado e permanecem no HEAD upstream examinado. A PR corrigiu os endereços; não criou a mistura catalográfica. No site, `BR-005.url_image_download` continua apontando para a NYU enquanto `thumbnail_url` aponta para o Commons. Em BE-002, download e thumbnail agora convergem para o mesmo arquivo Commons.

Esta alteração acrescenta somente este documento fora de `site/`. Não altera dados públicos, fontes upstream, pinagens, imagens, fixtures, aprovação, schema ou pipeline.

## Fontes consultadas

- **S1:** [Commons — Bruxelles - Palais de Justice.jpg](https://commons.wikimedia.org/w/index.php?title=File:Bruxelles_-_Palais_de_Justice.jpg&oldid=1183996769).
- **S2:** [BE-monumen — Joseph Poelaert](https://be-monumen.be/patrimoine-belge/poelaert-joseph/).
- **S3:** [Commons — Décio Villares - A República.jpg](https://commons.wikimedia.org/w/index.php?title=File:Décio_Villares_-_A_República.jpg&oldid=1272077684).
- **S4:** [NYU — Alegoria da República](https://archive.nyu.edu/handle/2451/61396); [TIFF Rj12-03](https://archive.nyu.edu/bitstream/2451/61396/2/Rj12-03.tiff); [JPEG associado](https://archive.nyu.edu/retrieve/124973/Rj12-03.tiff.jpg).
- **S5:** Senado Federal, *Obras de arte do Senado Federal: catálogo do acervo*, Brasília, 2010, p. impressa 57 (índice PDF 55, página física 56): [PDF](https://www.senado.gov.br/publicacoes/obrasmuseu/Cat%C3%A1logo_do_Acervo_SF.pdf).
- **S6:** [MHN — referência indicada pela NYU](https://mhn.acervos.museus.gov.br/reserva-tecnica/pintura-alegorica-modelo/). Não foi possível ler esta página nesta sessão; não se atribui confirmação direta ao MHN.

## BE-002: obra arquitetônica e fotografia

| Camada | Evidência e conclusão | Correção documental proposta |
|---|---|---|
| Autoria da obra | Joseph Poelaert, arquiteto (S1/S2). | Manter `creator`; ele não é fotógrafo. |
| Identificação material | Palais de Justice de Bruxelles; complexo arquitetônico (S2). | Manter objeto arquitetônico; tratar a reprodução como fotografia digital exterior. Autoria individual das esculturas não foi verificada. |
| Datação da obra | Obras de 1866–1883 em S2. | Manter este intervalo, separado da tomada fotográfica. |
| Localização | Bruxelas, Place Poelaert (S1/S2). | Não confundir local do edifício com cidade do fotógrafo. |
| Autoria da reprodução | Fred Romero, conforme S1, proveniente de Flickr. | Registrar fotógrafo e fonte, sem substituir o arquiteto. |
| Data da fotografia | 12/06/2015, conforme S1/EXIF; não é data da arquitetura. | Registrar como data atribuída pela fonte, não como data certificada externamente. |
| Licença da reprodução | S1 declara CC BY 2.0, com verificação Flickr de 07/05/2019. | A declaração genérica `rights: Public domain` não descreve esta fotografia. Propor direitos da reprodução como CC BY 2.0, com crédito e link da licença. |
| Direitos da obra | O campo legado declara domínio público, mas não separa camadas. | Não derivar a licença fotográfica da idade da arquitetura. Registrar separadamente o estado atribuído à obra, sujeito à revisão de direitos. |

Texto de crédito proposto:
**Palais de Justice de Bruxelles — arquitetura de Joseph Poelaert, 1866–1883. Fotografia: Fred Romero, 12/06/2015, via Flickr/Wikimedia Commons, CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/). Reprodução local em WebP, redimensionada para 900 × 600 px.**

A conversão/redimensão é observável pelas dimensões e formatos; a cadeia histórica de conversão e eventuais outros tratamentos não foi recuperada. O crédito não certifica inexistência de recorte ou retoque.

Observação direta do WebP: vista exterior em contraplongée, céu claro, fachada e cúpula com andaimes. A reprodução não documenta, por si, interiores, retratos de juristas ou detalhes de alegorias femininas. Não usar esta fotografia como prova dessas afirmações analíticas preexistentes.

## BR-005: duas identificações materiais, duas reproduções

| Campo | Registro BR-005 / NYU (S4) | Reprodução associada / Commons (S3) e Senado (S5) |
|---|---|---|
| Autoria da obra | Décio Villares | Décio Villares |
| Título | Alegoria da República | A República no Commons; Retrato da República no catálogo do Senado |
| Data | Esboço sem data, aproximadamente 1900; campo NYU simplificado como 1900 | 1919 em S3/S5 |
| Material | Óleo sobre tela, esboço | Óleo sobre tela |
| Dimensões | 97 × 77 cm segundo S4 | 55 × 45 cm em S3. S5 imprime “0,55cm x 0,45cm”: provável erro de unidade, não corrigido silenciosamente. |
| Localização documentada | Museu Histórico Nacional, reserva técnica, segundo S4 | Acervo do Senado Federal, conforme S3/S5; endereço atual de exposição não verificado |
| Reprodução | TIFF Rj12-03 e JPEG associado, NYU | JPEG do Commons, originado do catálogo do Senado; WebP local |
| Fotógrafo | Não identificado na ficha consultada | Não identificado para esta imagem em S3/S5; uploader Dornicke não equivale a fotógrafo |
| Direitos da reprodução | S4 apresenta aviso geral de reserva de direitos; não documenta licença específica deste arquivo | S3 classifica reprodução fiel como PD-Art/PDM, com ressalva territorial; não é uma licença CC BY. S5 traz reserva geral de direitos da publicação. |

Não transferir a classificação de direitos do Commons para o TIFF da NYU. O domínio público atribuído à pintura não demonstra licença específica de toda reprodução nem elimina a necessidade de revisão da proveniência.

### Confronto visual direto

O WebP local mostra perfil feminino voltado à esquerda, fundo ocre retangular, barrete escuro e roupa verde. A p. 57 de S5 mostra a mesma composição, incluindo inscrição/assinatura no canto inferior esquerdo: há correspondência visual forte entre **WebP e reprodução do Senado**.

O TIFF de S4 mostra perfil à esquerda dentro de campo oval, moldura ornamentada, barrete claro com ramo e outra organização de vestes e fundo. O JPEG NYU também foi inspecionado e mostra essa composição oval. Não se trata apenas de diferença de resolução entre os dois conjuntos.

**Conclusão comprovável:** a imagem exibida em BR-005 não corresponde visualmente à reprodução Rj12-03 apresentada pela fonte citada na ficha. Não combinar 1919/Senado/55 × 45 com c. 1900/MHN/97 × 77 num único objeto.

**Incertezas mantidas:** relação entre esboço e pintura posterior; eventual estudo, versão ou transmissão compositiva; localização atual; número de inventário; autoria fotográfica; normalização institucional das unidades do catálogo. Semelhança temática e autoria comum não comprovam identidade material nem genealogia.

### Proposta por campo, sem aplicação pública nesta etapa

1. Preservar o ID BR-005 e a identificação NYU/MHN no histórico. Não substituir automaticamente `date`, `year`, `institution`, `medium`, `url` e citações pelos dados do Senado.
2. Registrar o vínculo imagem–objeto como **divergente / não confirmado**, com nota: “Reprodução associada corresponde visualmente a Retrato da República, 1919, catálogo do Senado Federal, p. 57; não corresponde ao Rj12-03 da NYU. Relação entre os objetos não demonstrada.”
3. Separar uma futura ficha da obra do Senado, com identificador adjudicado, em vez de reutilizar sem revisão o ID do MHN. Alternativamente, recuperar a reprodução correta do objeto NYU após revisão de direitos. Nenhuma dessas opções foi executada.
4. Revisar a leitura de “Ordem e Progresso” e demais codificações contra o objeto efetivamente analisado: a inscrição não foi estabelecida nesta inspeção. Não transportar análises de uma versão para outra.
5. Antes de qualquer migração pública, obter identificação institucional/inventário e adjudicar direitos, crédito e associação. Manter as duas citações individualizadas como referências de objetos distintos até haver evidência contrária.

## Integridade e limites da inspeção

SHA-256 dos WebP preservados, idênticos byte a byte à base da PR:
- BE-002, 900 × 600: `72dd12d3616d5a5779073a845b44f8b0b2f9e1cf3ac8c5f684ebed6df5409fc0`.
- BR-005, 503 × 616: `29371ff7a222ec8deb174728c5fb0da9a1dc072a8a6e6358deeb17c01d85d531`.

Downloads NYU realizados nesta auditoria:
- TIFF, 1210 × 1829, 6.670.932 bytes, SHA-256 `57744ad528eaa6a453e3559ed35b13af8e1995d9486b87f2570f1bb93b6ed8b7`.
- JPEG, SHA-256 `130b9891d4c77629de05f6d2cca5219c5f4f8b288e78169be13f5fecbcc2d433`.

Os GETs diretos dos originais Commons retornaram 403 nesta sessão. Os SHA-1 e a comparação visual dos originais descritos na PR anterior não foram novamente certificados por download. Esta auditoria inspecionou os WebP, as fichas Commons, as reproduções NYU e o PDF do Senado. Correspondência visual não é identidade binária nem prova da cadeia de conversão.

## Gates e encaminhamento

BE-002 e BR-005 pertencem ao catálogo legado e **não estão entre as oito entradas** do manifesto editorial. As oito continuam `review`; preservá-las não acrescenta, por si, um bloqueio específico aos dois registros legados. As divergências aqui documentadas permanecem pendentes de adjudicação, mesmo com CI verde.

Este documento não cria gate executável nem finge que há bloqueio novo. Não muda `approved_by`, `approved_at`, `editorial_status`, análises, overlay, constelações ou pinagem. CI comprova consistência técnica; não adjudica direitos, identidade material ou publicação. A PR deve permanecer draft, sem merge ou deploy manual. Integrações Cloudflare preexistentes podem produzir prévias automáticas ao atualizar a branch; a alteração contém apenas documentação fora dos assets servidos.
