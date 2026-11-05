"""Separate stored catalogue labels from the current interpretive framework.

This is a presentation migration of aggregates, never a record classifier.
The historical rows (including case, order and counts) remain available in
por_rotulo_catalogado. No critical-test result is inferred from those labels.
"""
from __future__ import annotations

import copy

REGIMES = ("Fundacional", "Normativo", "Militar")


def present_taxonomy(stats: dict) -> dict:
    """Return a non-mutating, idempotent view of old or current aggregates."""
    result = copy.deepcopy(stats)
    if "por_regime" not in result and "por_rotulo_catalogado" not in result:
        return result
    labels = result.get("por_rotulo_catalogado", result.get("por_regime", []))
    result["por_regime"] = [copy.deepcopy(row) for row in labels
                            if row["regime"].strip().casefold() in
                            {name.casefold() for name in REGIMES}]
    result["por_rotulo_catalogado"] = labels
    result["taxonomia"] = {
        "regimes_interpretativos": list(REGIMES),
        "contra_alegoria": {
            "estatuto": "teste_critico",
            "rotulo_legado": "Contra-alegoria",
            "nota": "O rótulo legado não constitui um quarto regime nem comprova a aplicação do teste crítico.",
        },
        "unidade": "registro do catálogo publicado",
        "nota_contagens": (
            "por_rotulo_catalogado preserva todos os rótulos armazenados, inclusive os legados "
            "e não classificados. por_regime seleciona apenas os rótulos dos três regimes; "
            "sua soma pode ser menor que total. As contagens não reclassificam registros "
            "nem validam interpretações iconológicas."
        ),
    }
    return result
