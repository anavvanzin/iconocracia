#!/usr/bin/env python3
"""Opt-in publication of approved supplements to the existing public catalogue.

The private manifest lives outside site/. Review/withheld material has no public
preview. Existing catalogue metadata and ordering are preserved. Approved new
records come from a pinned corpus; supplements use a separate public overlay.
"""
from __future__ import annotations
import argparse
import base64
import copy
import datetime
import hashlib
import json
import pathlib
import re
import sys
import subprocess
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
from scripts.corpus_sync import transform_item as transform_corpus_item, validate_records
from scripts.publication_stats import build_publication_stats

DEFAULT_SCHEMA = ROOT / "schemas/corpus-input.schema.json"
PUBLICATION_SCHEMA = ROOT / "schemas/publication.schema.json"
DEFAULT_PUBLICATION = ROOT / "editorial/publication.json"
DEFAULT_BASELINE = ROOT / "site/data/acervo.json"
DEFAULT_STATS = ROOT / "site/data/stats.json"
DEFAULT_OUT = ROOT / "site/data"
RETIRED_FIELDS = {"endurecimento_score", "indicadores", "indicators", "scale", "hardening_index",
                  "hardening_score", "endurecimento_index", "purificacao_composto", "purification_indicators",
                  "purification_score", "purificacao_indicadores", "score_composite", "composite_score"}
ANALYSIS_FIELDS = ("status", "summary", "panofsky", "method_note", "limitation", "gender_attributed")
OUTPUT_NAMES = ("acervo.json", "stats.json", "publication-overlay.json", "constellations.json")
OVERLAY_FIELDS = {"id", "slug", "legacy_ids", "credito", "texto_alternativo", "analise_publica",
                  "fonte_url", "imagem_fonte", "imagem", "direitos", "tem_imagem", "constelacoes"}


class AmbiguousResolution(ValueError):
    """An identity conflict must also fail closed for private entries."""


def normalize_url(value: Any) -> str:
    url = str(value or "").strip().replace("http://", "https://").rstrip("/")
    return url[:-5] if url.endswith(".item") else url


def load_json(path: pathlib.Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _corpus_schema_validator(schema_path: pathlib.Path) -> Any:
    if not schema_path.is_file():
        raise ValueError(f"Schema do corpus exige arquivo existente: {schema_path}")
    try:
        import jsonschema
    except ModuleNotFoundError as error:
        raise ValueError("Schema do corpus exige jsonschema instalado.") from error
    try:
        schema = load_json(schema_path)
    except (OSError, ValueError) as error:
        raise ValueError(f"Schema do corpus não é JSON legível: {schema_path}") from error
    try:
        jsonschema.Draft7Validator.check_schema(schema)
    except jsonschema.exceptions.SchemaError as error:
        raise ValueError(f"Schema do corpus inválido: {error.message}") from error
    return jsonschema.Draft7Validator(schema)


def _validate_corpus_records(records: Any, schema_path: pathlib.Path) -> None:
    # The shared helper treats schema validation as optional. Publication must
    # validate the loaded schema unconditionally, then retain its ID checks.
    validator = _corpus_schema_validator(schema_path)
    errors = sorted(validator.iter_errors(records), key=lambda error: str(error.absolute_path))
    if errors:
        details = "; ".join(f"{'/'.join(map(str, error.absolute_path)) or '<root>'}: {error.message}"
                            for error in errors[:10])
        raise ValueError(f"Corpus inválido segundo o schema: {details}")
    validate_records(records, schema_path)


def _schema_validate(value: Any) -> None:
    try:
        import jsonschema
    except ModuleNotFoundError as error:
        raise ValueError("Instale jsonschema para validar o manifesto editorial.") from error
    errors = sorted(jsonschema.Draft7Validator(load_json(PUBLICATION_SCHEMA), format_checker=jsonschema.FormatChecker())
                    .iter_errors(value), key=lambda error: str(error.absolute_path))
    if errors:
        details = "; ".join(f"{'/'.join(map(str, e.absolute_path)) or '<root>'}: {e.message}" for e in errors[:10])
        raise ValueError(f"Manifesto editorial inválido: {details}")


def _approved(value: dict, *, author: bool = False) -> bool:
    reviewer = str(value.get("approved_by") or "").strip()
    if author and reviewer.casefold() not in {"ana", "ana vanzin", "anavvanzin"}:
        return False
    date = str(value.get("approved_at") or "")
    try:
        datetime.date.fromisoformat(date)
    except ValueError:
        return False
    return bool(reviewer and re.fullmatch(r"\d{4}-\d{2}-\d{2}", date))


def _http_url(value: Any) -> bool:
    raw = str(value or "")
    if "\\" in raw or any(char.isspace() for char in raw):
        return False
    try:
        parsed = urllib.parse.urlparse(raw)
        parsed.port  # Invalid port/IPv6 syntax must not become a public link.
        return (parsed.scheme in {"http", "https"} and bool(parsed.hostname)
                and parsed.username is None and parsed.password is None)
    except ValueError:
        return False


def confined_image(path: Any, site_root: pathlib.Path, *, _historical: bool = False) -> pathlib.Path:
    raw = str(path or "")
    parts = raw.split("/")
    if (not raw or raw.startswith("/") or "\\" in raw or ":" in raw
            or any(part in {"", ".", ".."} or not re.fullmatch(r"[A-Za-z0-9._~-]+", part) for part in parts)):
        raise ValueError(f"image.path deve ser relativo e confinado a site/: {raw!r}")
    candidate = site_root / raw
    if site_root.is_symlink() or any(site_root.joinpath(*parts[:i]).is_symlink() for i in range(1, len(parts) + 1)):
        raise ValueError(f"image.path não pode atravessar symlink: {raw!r}")
    if not candidate.resolve().is_relative_to(site_root.resolve()):
        raise ValueError(f"image.path escapa de site/: {raw!r}")
    if candidate.suffix.lower() not in {".webp", ".jpg", ".jpeg", ".png", ".gif", ".avif"}:
        raise ValueError(f"image.path não identifica imagem permitida: {raw!r}")
    if not _historical and (not candidate.is_file() or not candidate.stat().st_size):
        raise ValueError(f"Imagem local inexistente ou vazia: {raw!r}")
    return candidate


def validate_publication(publication: Any, *, site_root: pathlib.Path | None = None,
                         _historical: bool = False) -> None:
    _schema_validate(publication)
    seen: set[str] = set()
    for entry in publication["items"]:
        key = str(entry.get("canonical_id") or entry.get("legacy_record_id"))
        if key in seen:
            raise ValueError(f"Entrada editorial duplicada: {key}")
        seen.add(key)
        if "grandfathered" in entry:
            raise ValueError("grandfathered foi removido: apenas a base já publicada pode ser preservada.")
        if entry["editorial_status"] != "published":
            continue
        if entry.get("overrides"):
            raise ValueError(f"Overrides não autorizados em {key}; fatos vêm do corpus canônico.")
        if not _approved(entry, author=True):
            raise ValueError(f"Item {key} exige aprovação autoral de Ana com data.")
        rights = entry.get("rights_approval") or {}
        if rights.get("status") != "approved" or not _approved(rights) or not _http_url(rights.get("evidence_url")):
            raise ValueError(f"Item {key} exige aprovação explícita de direitos com fonte verificável.")
        image = entry.get("image") or {}
        missing = [field for field in ("path", "source_url", "license", "credit", "alt")
                   if not str(image.get(field) or "").strip()]
        if missing or not _http_url(image.get("source_url")):
            raise ValueError(f"Imagem de {key} exige path/source_url/license/credit/alt completos.")
        if image.get("catalog_url") and not _http_url(image["catalog_url"]):
            raise ValueError(f"Fonte catalográfica inválida em {key}.")
        if str(image["license"]).strip().casefold() in {"unknown", "pending", "desconhecida", "public access"}:
            raise ValueError(f"Licença de {key} ainda não autoriza publicação.")
        local = confined_image(image["path"], site_root or ROOT / "site", _historical=_historical)
        if not _historical and hashlib.sha256(local.read_bytes()).hexdigest() != image.get("sha256"):
            raise ValueError(f"Imagem de {key} diverge do sha256 aprovado.")
        analysis = entry.get("public_analysis")
        if analysis and (analysis.get("status") != "approved" or not _approved(analysis, author=True)):
            raise ValueError(f"Análise de {key} exige aprovação autoral própria; item aprovado não aprova análise.")


def _public_metadata(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _public_metadata(item) for key, item in value.items() if key not in RETIRED_FIELDS}
    if isinstance(value, list):
        return [_public_metadata(item) for item in value]
    return copy.deepcopy(value)


def transform_item(source: dict, editorial: dict | None = None) -> dict:
    editorial = editorial or {}
    item = _public_metadata(transform_corpus_item(source))
    if not _http_url(item.get("fonte_url")):
        item["fonte_url"] = ""
    item["id"] = str(source["id"])
    item["instituicao"] = source.get("institution") or source.get("sourceInstitution") or source.get("source_archive") or ""
    image = editorial.get("image") or {}
    if image:
        item.update({"imagem": image.get("path") or "", "tem_imagem": bool(image.get("path")),
                     "direitos": image.get("license") or "", "credito": image.get("credit") or "",
                     "texto_alternativo": image.get("alt") or "",
                     "fonte_url": image.get("catalog_url") if _http_url(image.get("catalog_url")) else item["fonte_url"],
                     "imagem_fonte": image.get("source_url") if _http_url(image.get("source_url")) else ""})
    item["slug"] = editorial.get("slug") or str(source["id"]).lower()
    item["legacy_ids"] = list(editorial.get("legacy_ids") or [])
    analysis = editorial.get("public_analysis") or {}
    if (editorial.get("editorial_status") == "published" and analysis.get("status") == "approved"
            and _approved(analysis, author=True)):
        item["analise_publica"] = _public_metadata({key: analysis[key] for key in ANALYSIS_FIELDS if key in analysis})
        if "panofsky" in analysis:
            item["analise_publica"]["panofsky"] = {key: analysis["panofsky"][key] for key in
                                                    ("level_1", "level_2", "level_3")
                                                    if isinstance(analysis["panofsky"].get(key), str)}
    return item


def _indexes(records: list[dict]) -> tuple[dict[str, dict], dict[str, dict]]:
    by_id: dict[str, dict] = {}
    by_url: dict[str, dict] = {}
    for item in records:
        item_id = str(item["id"])
        if item_id in by_id:
            raise ValueError(f"ID duplicado: {item_id}")
        by_id[item_id] = item
        url = normalize_url(item.get("url") or item.get("fonte_url"))
        if url:
            if url in by_url and by_url[url]["id"] != item_id:
                by_url[url] = {"id": None}  # URL shared by records is not an unambiguous alias.
            else:
                by_url[url] = item
    return by_id, by_url


def resolve_entry(entry: dict, records: list[dict], baseline: list[dict]) -> tuple[dict, str]:
    by_id, by_url = _indexes(records)
    baseline_id, baseline_url = _indexes(baseline)
    canonical = str(entry.get("canonical_id") or "")
    source_url = normalize_url(entry.get("source_url"))
    candidates = [index[source_url] for index in (by_url, baseline_url) if source_url and source_url in index]
    candidate_ids = {candidate["id"] for candidate in candidates}
    if None in candidate_ids or len(candidate_ids) > 1:
        raise AmbiguousResolution(f"Fonte editorial tem identidades conflitantes entre corpus e base: {source_url}")
    if canonical in by_id or canonical in baseline_id:
        if candidate_ids and canonical not in candidate_ids:
            raise AmbiguousResolution(f"Fonte editorial discorda do ID canônico: {canonical}")
    if canonical in by_id:
        return by_id[canonical], canonical
    if source_url and source_url in by_url:
        source = by_url[source_url]
        if source["id"] is None:
            raise AmbiguousResolution(f"Correspondência canônica ambígua: {source_url}")
        return source, str(source["id"])
    for alias in [entry.get("legacy_record_id"), *(entry.get("legacy_ids") or [])]:
        old = baseline_id.get(str(alias))
        if old:
            source = by_url.get(normalize_url(old.get("fonte_url")))
            if source and source["id"] is None:
                raise AmbiguousResolution(f"Alias com correspondência canônica ambígua: {alias}")
            if source and source["id"] is not None:
                return source, str(source["id"])
    if canonical in baseline_id:
        candidate = baseline_url.get(source_url)
        if candidate and candidate["id"] != canonical:
            raise AmbiguousResolution(f"Fonte editorial discorda do ID da base: {canonical}")
        return baseline_id[canonical], canonical
    if source_url and source_url in baseline_url and baseline_url[source_url]["id"] is None:
        raise AmbiguousResolution(f"Correspondência na base ambígua: {source_url}")
    if source_url and source_url in baseline_url and baseline_url[source_url]["id"] is not None:
        source = baseline_url[source_url]
        return source, str(source["id"])
    raise ValueError(f"Entrada sem correspondência canônica: {canonical or entry.get('legacy_record_id')}")


def build_constellations(definitions: list[dict], items: list[dict], include_review: bool = False,
                         *, aliases: dict[str, str] | None = None, blocked_ids: set[str] | None = None) -> list[dict]:
    if include_review:
        raise ValueError("Previews de revisão foram removidos; apenas saídas aprovadas são geradas.")
    visible = {str(item["id"]) for item in items}
    aliases, blocked_ids = aliases or {}, blocked_ids or set()
    result: list[dict] = []
    slugs: set[str] = set()
    for definition in definitions:
        if definition.get("editorial_status") != "published":
            continue
        slug = str(definition.get("slug") or "")
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug) or slug in slugs:
            raise ValueError(f"Slug de constelação inválido ou duplicado: {slug}")
        slugs.add(slug)
        if not _approved(definition, author=True):
            raise ValueError(f"Constelação {slug} exige aprovação autoral própria.")
        ordered = [aliases.get(str(item_id), str(item_id)) for item_id in (definition.get("item_ids") or [])]
        if (not ordered or len(set(ordered)) != len(ordered)
                or any(item_id not in visible or item_id in blocked_ids for item_id in ordered)):
            raise ValueError(f"Constelação {slug} incompleta, duplicada ou com itens em revisão; publicação indivisível.")
        public = {key: copy.deepcopy(definition[key]) for key in
                  ("slug", "title", "subtitle", "introduction", "method_note") if key in definition}
        result.append({**public, "editorial_status": "published", "item_ids": ordered})
    return result


def generate(records: list[dict], publication: dict, baseline: list[dict], *, include_review: bool = False,
             baseline_stats: dict | None = None, site_root: pathlib.Path | None = None,
             baseline_records: list[dict] | None = None) -> tuple[list[dict], dict, list[dict]]:
    return _generate(records, publication, baseline, include_review=include_review, baseline_stats=baseline_stats,
                     site_root=site_root, baseline_records=baseline_records)


def _generate(records: list[dict], publication: dict, baseline: list[dict], *, include_review: bool = False,
              baseline_stats: dict | None = None, site_root: pathlib.Path | None = None,
              baseline_records: list[dict] | None = None, _historical: bool = False) -> tuple[list[dict], dict, list[dict]]:
    if include_review:
        raise ValueError("--include-review não é permitido: não existe preview público de revisão.")
    validate_publication(publication, site_root=site_root, _historical=_historical)
    baseline_by_id, _ = _indexes(baseline)
    _indexes(records)
    items = copy.deepcopy(baseline)
    index = {str(item["id"]): position for position, item in enumerate(items)}
    aliases = {item_id: item_id for item_id in index}
    blocked: set[str] = set()
    published: set[str] = set()
    added_sources: dict[str, dict] = {}
    canonical_ids = {str(item["id"]) for item in records} | set(baseline_by_id)
    for entry in publication["items"]:
        if entry["editorial_status"] != "published":
            try:
                _, item_id = resolve_entry(entry, records, baseline)
                blocked.add(item_id)
            except AmbiguousResolution:
                raise
            except ValueError:
                pass
            blocked.update(str(value) for value in
                           [entry.get("canonical_id"), entry.get("legacy_record_id"), *(entry.get("legacy_ids") or [])] if value)
            continue  # A pending supplement cannot suppress a preexisting public baseline record.
        source, resolved_id = resolve_entry(entry, records, baseline)
        if resolved_id in published:
            raise ValueError(f"Entradas publicadas convergem para o mesmo ID: {resolved_id}")
        published.add(resolved_id)
        normalized = {**entry, "canonical_id": resolved_id}
        legacy_ids = list(entry.get("legacy_ids") or [])
        for alias in (entry.get("canonical_id"), entry.get("legacy_record_id")):
            if alias and alias != resolved_id and alias not in legacy_ids:
                legacy_ids.append(str(alias))
        for alias in legacy_ids:
            if alias in canonical_ids and alias != resolved_id:
                raise ValueError(f"Alias colide com um ID canônico conhecido: {alias}")
            if alias in aliases and aliases[alias] != resolved_id:
                raise ValueError(f"Alias colide com um ID público: {alias}")
            aliases[alias] = resolved_id
        if resolved_id in aliases and aliases[resolved_id] != resolved_id:
            raise ValueError(f"ID canônico colide com alias anterior: {resolved_id}")
        aliases[resolved_id] = resolved_id
        normalized["legacy_ids"] = legacy_ids
        if resolved_id in baseline_by_id:
            supplement = transform_item({**source, "id": resolved_id}, normalized)
            items[index[resolved_id]] = {**baseline_by_id[resolved_id], **{
                key: value for key, value in supplement.items() if key in OVERLAY_FIELDS}}
        else:
            if "title" not in source and "titulo" in source:
                raise ValueError("Item novo exige o registro canônico, não uma ficha pública legada.")
            index[resolved_id] = len(items)
            items.append(transform_item({**source, "id": resolved_id}, normalized))
            added_sources[resolved_id] = {**source, "id": resolved_id}
    blocked = {aliases.get(item_id, item_id) for item_id in blocked}
    if published & blocked:
        raise ValueError(f"Status editoriais contraditórios para: {', '.join(sorted(published & blocked))}")
    constellations = build_constellations(publication["constellations"], items, aliases=aliases, blocked_ids=blocked)
    memberships: dict[str, list[str]] = {}
    for definition in constellations:
        for item_id in definition["item_ids"]:
            memberships.setdefault(item_id, []).append(definition["slug"])
    for item in items:
        if item["id"] in published or item["id"] in memberships:
            item["constelacoes"] = memberships.get(item["id"], [])
    stats = build_publication_stats(items, baseline, baseline_stats, baseline_records=baseline_records,
                                    added_records=added_sources)
    if baseline_stats is None or len(items) > len(baseline):
        stats.setdefault("meta", {})["generated_at"] = publication["generated_at"]
    return items, stats, constellations


def build_overlay(items: list[dict], baseline: list[dict]) -> dict:
    baseline_by_id, _ = _indexes(baseline)
    supplements = []
    for item in items:
        old = baseline_by_id.get(str(item["id"]))
        if item == old:
            continue
        supplement = {"id": item["id"]}
        supplement.update({key: copy.deepcopy(value) for key, value in item.items()
                           if key in OVERLAY_FIELDS and key != "id" and (old is None or key not in old or old[key] != value)})
        supplements.append(supplement)
    return {"version": 1, "items": supplements}


def write_outputs(out: pathlib.Path, items: list[dict], stats: dict, constellations: list[dict], *, baseline: list[dict],
                  baseline_stats: dict | None = None) -> None:
    """Legacy in-memory helper; publication/withdrawal uses the guarded CLI bundle."""
    values: list[tuple[str, Any]] = [("publication-overlay.json", build_overlay(items, baseline)),
                                    ("constellations.json", constellations)]
    if len(items) > len(baseline):
        values.append(("acervo.json", items))
    changed_stats = (stats != baseline_stats if baseline_stats is not None else
                     stats.get("com_imagem") != sum(bool(item.get("tem_imagem")) for item in baseline))
    if len(items) > len(baseline) or changed_stats:
        values.append(("stats.json", stats))
    out.mkdir(parents=True, exist_ok=True)
    for name, value in values:
        target = out / name
        if target.is_symlink():
            raise ValueError(f"Saída não pode atravessar symlink: {target}")
        data = json.dumps(value, ensure_ascii=False, indent=2) + "\n"
        if not target.exists() or target.read_text(encoding="utf-8") != data:
            target.write_text(data, encoding="utf-8")


def validate_baseline(publication: dict) -> dict[str, bytes]:
    """Read the immutable, approved baseline even after projected additions exist."""
    anchor = publication.get("baseline") or {}
    if not re.fullmatch(r"[0-9a-f]{40}", str(anchor.get("commit") or "")):
        raise ValueError("Base publicada exige commit imutável de referência.")
    result = {}
    for key, path in (("acervo_sha256", DEFAULT_BASELINE), ("stats_sha256", DEFAULT_STATS),
                      ("corpus_enriched_sha256", ROOT / "site/data/corpus-data-enriched.json")):
        relative = path.relative_to(ROOT).as_posix()
        pinned = subprocess.run(["git", "show", f"{anchor['commit']}:{relative}"], cwd=ROOT,
                                capture_output=True, check=False)
        if pinned.returncode or hashlib.sha256(pinned.stdout).hexdigest() != anchor.get(key):
            raise ValueError(f"baseline.{key} não corresponde ao commit imutável indicado.")
        result[path.name] = pinned.stdout
    if hashlib.sha256((ROOT / "site/data/corpus-data-enriched.json").read_bytes()).hexdigest() != anchor.get("corpus_enriched_sha256"):
        raise ValueError("Fonte pública foi alterada; atualize o snapshot editorial após revisão.")
    return result


def validate_live_outputs(baseline_raw: dict[str, bytes], items: list[dict], stats: dict) -> None:
    """Never overwrite unrelated user changes; accept repeat output of this projection."""
    additions = len(items) > len(json.loads(baseline_raw["acervo.json"]))
    for path, value in ((DEFAULT_BASELINE, items), (DEFAULT_STATS, stats)):
        allowed = {baseline_raw[path.name]}
        if additions or (path == DEFAULT_STATS and stats != json.loads(baseline_raw["stats.json"])):
            allowed.add((json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
        if path.read_bytes() not in allowed:
            raise ValueError(f"{path.name} contém mudanças fora desta projeção; nenhuma saída será sobrescrita.")


def _load_corpus_bytes(path: pathlib.Path | None, publication: dict, *, needed: bool) -> bytes:
    if path:
        data = path.read_bytes()
        expected = publication.get("corpus_sha256")
        if needed and (not expected or hashlib.sha256(data).hexdigest() != expected):
            raise ValueError("Corpus local exige corpus_sha256 correspondente ao manifesto para publicar novos conteúdos.")
        return data
    if not needed:
        return b"[]"
    url = f"https://raw.githubusercontent.com/anavvanzin/iconocracy-corpus/{publication['corpus_commit']}/corpus/corpus-data.json"
    with urllib.request.urlopen(url, timeout=30) as response:
        data = response.read()
    if hashlib.sha256(data).hexdigest() != publication.get("corpus_sha256"):
        raise ValueError("Corpus remoto diverge do corpus_sha256 do manifesto.")
    return data


def load_corpus(path: pathlib.Path | None, publication: dict, *, needed: bool) -> list[dict]:
    return json.loads(_load_corpus_bytes(path, publication, needed=needed))


def _encoded(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def _digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _manifest_digest(publication: dict) -> str:
    return _digest(json.dumps(publication, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8"))


def _projection_bundle(baseline_raw: dict[str, bytes], items: list[dict], stats: dict,
                       constellations: list[dict]) -> dict[str, bytes]:
    baseline = json.loads(baseline_raw["acervo.json"])
    # Supplements stay in the overlay. A withdrawal restores the original
    # catalogue/statistical bytes, including formatting and the final newline.
    return {
        "acervo.json": baseline_raw["acervo.json"] if len(items) == len(baseline) else _encoded(items),
        "stats.json": baseline_raw["stats.json"] if stats == json.loads(baseline_raw["stats.json"]) else _encoded(stats),
        "publication-overlay.json": _encoded(build_overlay(items, baseline)),
        "constellations.json": _encoded(constellations),
    }


def _baseline_bundle(baseline_raw: dict[str, bytes]) -> dict[str, bytes]:
    return {"acervo.json": baseline_raw["acervo.json"], "stats.json": baseline_raw["stats.json"],
            "publication-overlay.json": _encoded({"version": 1, "items": []}), "constellations.json": _encoded([])}


def _state_path(out: pathlib.Path) -> pathlib.Path:
    # Bind receipts to the actual output destination. Neither custom --out nor
    # history replay ever puts a private manifest/corpus snapshot in site/.
    return ROOT / "editorial/.publication-state" / (_digest(str(out.resolve()).encode("utf-8")) + ".json")


def _safe_output_paths(out: pathlib.Path, state_path: pathlib.Path) -> None:
    for path in (out, *out.parents):
        # macOS presents these system temp roots as aliases to /private. They
        # are trusted OS roots, unlike a project/output directory symlink.
        system_alias = str(path) in {"/var", "/tmp"} and str(path.resolve()) in {"/private/var", "/private/tmp"}
        if path.is_symlink() and not system_alias:
            raise ValueError(f"Diretório de saída não pode atravessar symlink: {path}")
        if path.exists() and not path.is_dir():
            raise ValueError(f"Raiz/ancestral de saída não é diretório: {path}")
    for name in OUTPUT_NAMES:
        path = out / name
        if path.is_symlink() or (path.exists() and not path.is_file()):
            raise ValueError(f"Saída inválida ou symlink: {path}")
    for path in (state_path, state_path.parent, state_path.parent.parent):
        if path.is_symlink() or (path.exists() and path == state_path and not path.is_file()):
            raise ValueError("Estado privado não pode atravessar symlink ou arquivo inválido.")
    if state_path.resolve().is_relative_to((ROOT / "site").resolve()):
        raise ValueError("Estado privado deve ficar fora de site/.")


def _receipt(publication: dict, corpus_bytes: bytes, out: pathlib.Path, bundle: dict[str, bytes]) -> dict:
    return {"version": 1, "output_root": str(out.resolve()), "baseline": copy.deepcopy(publication["baseline"]),
            "publication": copy.deepcopy(publication), "publication_sha256": _manifest_digest(publication),
            "corpus_b64": base64.b64encode(corpus_bytes).decode("ascii"),
            "outputs": {name: _digest(bundle[name]) for name in OUTPUT_NAMES}}


def _replay_receipt(receipt: dict, publication: dict, baseline_raw: dict[str, bytes], out: pathlib.Path, *,
                    schema_path: pathlib.Path = DEFAULT_SCHEMA) -> dict[str, bytes]:
    """Verify history by replay, rather than granting authority to recorded hashes.

Only this private history path omits checking that an old image still exists.
Its schema, author/rights approvals, safe path and declared SHA remain enforced.
The active manifest always checks the bytes of every newly published image.
The selected corpus schema applies to active and historical snapshots alike;
an incompatible schema change rejects the transition before any output write.
"""
    keys = {"version", "output_root", "baseline", "publication", "publication_sha256", "corpus_b64", "outputs"}
    if (not isinstance(receipt, dict) or set(receipt) != keys or receipt["version"] != 1
            or receipt["output_root"] != str(out.resolve()) or receipt["baseline"] != publication["baseline"]
            or not isinstance(receipt["publication"], dict) or not isinstance(receipt["outputs"], dict)
            or set(receipt["outputs"]) != set(OUTPUT_NAMES)):
        raise ValueError("Estado privado inválido, incompleto ou de outro destino/baseline.")
    previous = receipt["publication"]
    if previous.get("baseline") != publication["baseline"] or _manifest_digest(previous) != receipt["publication_sha256"]:
        raise ValueError("Manifesto anterior do estado privado foi alterado.")
    _schema_validate(previous)
    try:
        corpus_bytes = base64.b64decode(receipt["corpus_b64"], validate=True)
        records = json.loads(corpus_bytes)
    except (ValueError, TypeError) as error:
        raise ValueError("Snapshot do corpus anterior inválido.") from error
    needed = any(entry.get("editorial_status") == "published" for entry in previous.get("items", []))
    if (needed or corpus_bytes != b"[]") and _digest(corpus_bytes) != previous.get("corpus_sha256"):
        raise ValueError("Snapshot do corpus anterior não corresponde ao hash fixado.")
    _validate_corpus_records(records, schema_path)
    prior = _generate(records, previous, json.loads(baseline_raw["acervo.json"]),
                      baseline_stats=json.loads(baseline_raw["stats.json"]),
                      baseline_records=json.loads(baseline_raw["corpus-data-enriched.json"]), _historical=True)
    bundle = _projection_bundle(baseline_raw, *prior)
    if {name: _digest(bundle[name]) for name in OUTPUT_NAMES} != receipt["outputs"]:
        raise ValueError("Hashes do estado privado não correspondem à projeção anterior recalculada.")
    return bundle


def _publish_bundle(out: pathlib.Path, bundle: dict[str, bytes], publication: dict, corpus_bytes: bytes,
                    baseline_raw: dict[str, bytes], *, check: bool = False,
                    schema_path: pathlib.Path = DEFAULT_SCHEMA) -> None:
    """Check the complete destination and receipt before the first public write."""
    state_path = _state_path(out)
    _safe_output_paths(out, state_path)
    baseline = _baseline_bundle(baseline_raw)
    current = {name: (out / name).read_bytes() if (out / name).exists() else None for name in OUTPUT_NAMES}
    previous = None
    if state_path.exists():
        previous = _replay_receipt(load_json(state_path), publication, baseline_raw, out, schema_path=schema_path)
        # A stateful release is always a complete four-file package. A partial
        # write/missing file must be repaired from a trusted snapshot explicitly.
        if any(data is None for data in current.values()) or current not in (previous, bundle, baseline):
            raise ValueError("Outputs contêm mudanças fora desta projeção ou estado parcial; nenhuma saída será sobrescrita.")
    else:
        empty = all(data is None for data in current.values())
        initial = all(current[name] == baseline[name] for name in ("acervo.json", "stats.json")) and all(
            current[name] in (None, baseline[name]) for name in ("publication-overlay.json", "constellations.json"))
        # A fresh checkout can prove its already committed desired package by
        # replaying the active approved manifest, without a local ignored state.
        if not empty and not initial and current != bundle:
            raise ValueError("Estado privado ausente ou destino alterado; restaure um recibo/snapshot confiável, sem adotar JSON vivo arbitrário.")
    # Validate the new receipt by independent replay before granting it mutation
    # authority. This also rejects an unpinned local corpus snapshot.
    next_receipt = _receipt(publication, corpus_bytes, out, bundle)
    if bundle != baseline or previous is not None:
        _replay_receipt(next_receipt, publication, baseline_raw, out, schema_path=schema_path)
    if check:
        return
    keep_receipt = bundle != baseline or previous is not None
    temporary_state = None
    try:
        if keep_receipt:
            state_path.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(dir=state_path.parent, prefix="publication-", suffix=".tmp", delete=False) as staged:
                staged.write(_encoded(next_receipt))
                temporary_state = pathlib.Path(staged.name)
        out.mkdir(parents=True, exist_ok=True)
        for name in OUTPUT_NAMES:
            if current[name] != bundle[name]:
                (out / name).write_bytes(bundle[name])
        if temporary_state:
            temporary_state.replace(state_path)
            temporary_state = None
    finally:
        if temporary_state:
            temporary_state.unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--corpus", type=pathlib.Path, help="Corpus local; publicação exige corpus_sha256 no manifesto.")
    parser.add_argument("--publication", type=pathlib.Path, default=DEFAULT_PUBLICATION)
    parser.add_argument("--schema", type=pathlib.Path, default=DEFAULT_SCHEMA)
    parser.add_argument("--out", type=pathlib.Path, default=DEFAULT_OUT)
    parser.add_argument("--check", action="store_true", help="Validar e projetar sem escrever arquivos.")
    parser.add_argument("--include-review", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()
    try:
        if args.include_review:
            raise ValueError("--include-review foi removido: revisão não produz preview público.")
        if args.publication.resolve().is_relative_to((ROOT / "site").resolve()):
            raise ValueError("O manifesto editorial privado deve ficar fora de site/.")
        _corpus_schema_validator(args.schema)
        publication = load_json(args.publication)
        validate_publication(publication)
        baseline_raw = validate_baseline(publication)
        baseline, baseline_stats = json.loads(baseline_raw["acervo.json"]), json.loads(baseline_raw["stats.json"])
        needed = any(entry["editorial_status"] == "published" for entry in publication["items"])
        corpus_bytes = _load_corpus_bytes(args.corpus, publication, needed=needed)
        records = json.loads(corpus_bytes)
        _validate_corpus_records(records, args.schema)
        items, stats, constellations = generate(records, publication, baseline, baseline_stats=baseline_stats,
                                               baseline_records=json.loads(baseline_raw["corpus-data-enriched.json"]))
        bundle = _projection_bundle(baseline_raw, items, stats, constellations)
        _publish_bundle(args.out, bundle, publication, corpus_bytes, baseline_raw, check=args.check,
                        schema_path=args.schema)
        print(f"Preservados {len(baseline)} itens da base; {len(items) - len(baseline)} adições; "
              f"{len(build_overlay(items, baseline)['items'])} suplementos; {len(constellations)} constelações aprovadas.")
        return 0
    except (OSError, ValueError, json.JSONDecodeError, urllib.error.URLError) as error:
        print(f"[publication_sync] erro: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
