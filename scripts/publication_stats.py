"""Production aggregates for an approved projection of an immutable baseline.

The public catalogue loses raw regime case and source order when transformed
and sorted. Rebuild from the pinned raw baseline followed by approved additions,
using the existing production helper for countries, periods, regimes and motifs.
Image availability comes from the approved projection, without filesystem I/O.
The caller is responsible for editorial approval; this module never selects or
publishes a source record on its own.
"""
from __future__ import annotations

import copy
from collections.abc import Iterable, Mapping

from scripts.build_data import build_stats as build_production_stats


def _index(records: Iterable[dict], label: str) -> dict[str, dict]:
    result = {}
    for record in records:
        key = str(record.get("id") or "")
        if not key:
            raise ValueError(f"{label}: registro sem ID.")
        if key in result:
            raise ValueError(f"{label}: ID duplicado: {key}")
        result[key] = record
    return result


def _image_count(items: Iterable[dict]) -> int:
    return sum(bool(item.get("tem_imagem")) for item in items)


def build_publication_stats(items: list[dict], baseline: list[dict], baseline_stats: dict | None = None, *,
                            baseline_records: list[dict] | None = None,
                            added_records: Iterable[dict] | Mapping[str, dict] | None = None) -> dict:
    """Return production-compatible stats for approved items, without mutation.

    ``baseline_records`` must retain the immutable raw source order; projected
    catalogue fields cannot reconstruct it. ``added_records`` supplies raw
    canonical sources for new projected IDs only. Other supplied records do not
    contribute to statistics. Ties retain baseline source order, then the order
    of new projected items. Always pass the original baseline, including when
    withdrawing a previously generated addition or image supplement.

    Unchanged projections and image-only supplements preserve all other baseline
    statistics verbatim. Additions require complete original raw sources and
    reuse ``build_data.build_stats`` instead of approximating its semantics.
    """
    projected_by_id = _index(items, "Projeção")
    baseline_by_id = _index(baseline, "base publicada")
    if not baseline_by_id.keys() <= projected_by_id.keys():
        raise ValueError("Projeção remove um registro da base publicada imutável.")

    if baseline_records is not None:
        raw_by_id = _index(baseline_records, "Fonte da base")
        if raw_by_id.keys() != baseline_by_id.keys():
            raise ValueError("baseline_records deve corresponder integralmente aos IDs da base publicada.")

    new_ids = [key for key in projected_by_id if key not in baseline_by_id]
    if not new_ids and baseline_stats is not None:
        result = copy.deepcopy(baseline_stats)
        image_delta = _image_count(items) - _image_count(baseline)
        if image_delta:
            count = result.get("com_imagem")
            if not isinstance(count, int) or isinstance(count, bool) or count + image_delta < 0:
                raise ValueError("Estatísticas da base não têm com_imagem válido.")
            result["com_imagem"] = count + image_delta
        return result

    if baseline and baseline_records is None:
        raise ValueError("baseline_records é obrigatório para reconstruir agregados da base publicada.")
    raw_records = list(baseline_records or [])
    if isinstance(added_records, Mapping):
        for key, record in added_records.items():
            if str(key) != str(record.get("id") or ""):
                raise ValueError(f"Fonte adicional tem ID divergente da chave: {key}")
        source_by_id = _index(added_records.values(), "Fonte adicional")
    else:
        source_by_id = _index(added_records or [], "Fonte adicional")
    for key in new_ids:
        if key not in source_by_id:
            raise ValueError(f"Registro canônico necessário para estatísticas do novo ID: {key}")
        raw_records.append(source_by_id[key])

    # ID is only used by the production helper to probe local image files. Clear
    # it on a copy and express projected availability through its URL predicate:
    # missing images therefore cannot accidentally count unapproved local files.
    aggregate_input = []
    for record in raw_records:
        key = str(record["id"])
        aggregate_input.append({**record, "id": None, "url_image_download": None,
                                "thumbnail_url": bool(projected_by_id[key].get("tem_imagem"))})
    result = copy.deepcopy(baseline_stats) if baseline_stats is not None else {}
    result.update(build_production_stats(aggregate_input))
    return result
