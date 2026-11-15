# Auditoria de personificações femininas de 16 de outubro de 2026

Documentação de pesquisa sobre as 51 linhas do dataset externo de personificações
nacionais. As linhas foram examinadas individualmente, mas a identificação histórica
continua parcial. Pendências e propostas interpretativas não são validações factuais.
Este diretório não altera `corpus/`, `editorial/` ou `site/`.

## Conteúdo

- [Auditoria](auditoria.md): recálculo, problemas históricos e limites do relatório Gemini.
- [Nota de leitura](retorica-cartografica.md): contribuição e limites de *The Many Tendrils of the Octopus Map*.
- `dados/Original_*.csv`: valores das três abas de origem, preservados.
- `dados/inputs.json`: captura dos valores das abas e do texto do relatório Gemini.
- `dados/Auditoria_51.csv` e `dados/Alteracoes.csv`: diagnóstico por registro e 21 propostas de alteração.
- `dados/Revisados_51.csv`: revisão provisória com originais e cenários paralelos.
- `dados/Resumo.csv`, `dados/Tipos.csv`, `dados/Regiao_x_tipo.csv`,
  `dados/Cenarios_geograficos.csv` e `dados/Animais_originais.csv`: contagens descritivas.
- `dados/Bibliografia_auditada.csv`: 33 referências originais examinadas e a adição complementar B034.
- `dados/Fontes_verificaveis.csv`: localizadores, incluindo OCT para Puerta, Spivak e Correll.
- `recalcular.py`: recálculo independente das distribuições, usando apenas a biblioteca padrão Python.

`auditoria.md` conserva a redação da auditoria inicial. A adição posterior do Lune
está identificada separadamente nos dois CSVs bibliográficos e na nota de leitura.
Os três CSVs originais não receberam essa adição.

## Fontes e documentos

- [Dataset de origem](https://docs.google.com/spreadsheets/d/1e_DTrwHEm3DCkyvK5xuwifmkE0e3MbN-7TJFVXblo1s/edit).
- [Relatório Gemini de origem](https://docs.google.com/document/d/1QmTjMn8FM02IyU15tYbk2brsSH_CcxHE0f33eFMjw_A/edit).
- [Cópia auditada no Drive](https://docs.google.com/spreadsheets/d/1UPsTico3kMagW5KKKrdPsAOrxozvH4Z2UAuQMFB6Uxo/edit).
- [Nota de leitura no Drive](https://docs.google.com/document/d/1VC-y7yftzwK8PfuyIPf12LnoYLlatV-mdS8xFVqoOYA/edit).
- [Puerta, Spivak e Correll, preprint](https://arxiv.org/abs/2501.14903).
- [DOI editorial identificado no Lune](https://doi.org/10.1145/3706598.3713583).

O snapshot registra valores e texto, não o histórico completo ou a formatação
nativa do Drive. As cópias do Drive podem continuar a mudar; os arquivos deste
diretório constituem a captura datada.

## Reprodução

```bash
python docs/research/personificacoes-2026-10-16/recalcular.py
```

O comando não escreve nos arquivos. Ele verifica a preservação dos valores
originais e a consistência das tabelas de contagem, imprime o SHA-256 do snapshot
e recalcula os cenários documentados.

## Limites metodológicos

O denominador é 51 linhas territoriais, não 51 imagens, figuras únicas ou Estados.
Um campo animal preenchido não demonstra coocorrência visual. O travessão significa
não informado. O cenário tipológico mínimo altera somente Portugal; mantém os
outros rótulos problemáticos para explicitar a sensibilidade dessa mudança.

A referência OCT sustenta comparação metodológica sobre retórica cartográfica.
O experimento contemporâneo não demonstra a recepção histórica dos mapas nem
um efeito causal geral da imagem do polvo. A inclusão bibliográfica não admite
objetos ou classificações ao corpus canônico da ICONOCRACIA.
