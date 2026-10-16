#!/usr/bin/env python3
"""Recalcula as contagens descritivas do snapshot sem alterar os arquivos."""
import collections
import csv
import hashlib
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent / "dados"


def read_csv(name):
    with (BASE / name).open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.reader(stream))


def counts(rows, region_index=1):
    result = {}
    for row in rows:
        group = result.setdefault(row[region_index], {"n": 0, "animal_preenchido": 0, "tipos": {}})
        group["n"] += 1
        group["animal_preenchido"] += int(row[5] != "—")
        types = group["tipos"]
        types[row[2]] = types.get(row[2], 0) + 1
    return result


def main():
    snapshot = (BASE / "inputs.json").read_bytes()
    inputs = json.loads(snapshot)
    original = inputs[1]["values"]
    if len(original) != 52:
        raise ValueError("O snapshot deve ter 51 registros e um cabeçalho")
    for index, name in [(1, "Original_figuras.csv"), (2, "Original_corpus.csv"), (3, "Original_bibliografia.csv")]:
        if read_csv(name) != inputs[index]["values"]:
            raise ValueError(f"Valores originais divergentes: {name}")

    rows = original[1:]
    regional = counts(rows)
    types = collections.Counter(row[2] for row in rows)
    animal_count = sum(row[5] != "—" for row in rows)
    if animal_count != 26:
        raise ValueError("O snapshot original deve ter 26 campos animais preenchidos")
    for row in read_csv("Resumo.csv")[1:-1]:
        calculated = regional[row[0]]
        if (int(row[1]), int(row[3])) != (calculated["n"], calculated["animal_preenchido"]):
            raise ValueError(f"Resumo divergente: {row[0]}")

    minimal = [row.copy() for row in rows]
    for row in minimal:
        if row[0] == "Portugal":
            row[2] = "Alegoria republicana"
    minimal_types = collections.Counter(row[2] for row in minimal)
    for row in read_csv("Tipos.csv")[1:]:
        if (int(row[1]), int(row[3])) != (types[row[0]], minimal_types[row[0]]):
            raise ValueError(f"Contagem tipológica divergente: {row[0]}")

    m49 = [row.copy() for row in rows]
    for row in m49:
        if row[0] in {"Armenia", "Georgia"}:
            row[1] = "Ásia"
    state_labels = [row for row in m49 if row[0] not in {"European Union", "Venice", "Korea (North and South Korea)"}]
    if len(state_labels) != 48:
        raise ValueError("O cenário de etiquetas estatais simples deve ter 48 linhas")
    print(json.dumps({
        "sha256_inputs": hashlib.sha256(snapshot).hexdigest(),
        "n_linhas": len(rows),
        "regioes_originais": regional,
        "tipos_originais": dict(types),
        "animais": {"campo_preenchido": animal_count, "nao_informado": len(rows) - animal_count},
        "tipos_cenario_minimo_portugal": dict(minimal_types),
        "m49_todas_linhas": counts(m49),
        "m49_48_etiquetas_estatais": counts(state_labels),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
