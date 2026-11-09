#!/usr/bin/env python3
"""Curatorial & Editorial Steward CLI for Mnemosyne Viva (iconocracia.com).

Provides a read-first operational interface over the two-layer architecture:
- Layer I (Documentary Record): site/data/acervo.json & corpus-data-enriched.json
- Layer II (Editorial Overlay): editorial/publication.json & .publication-state
- Bilingual Surface Parity: site/*.html <-> site/en/*.html & src/index.js

Never writes directly to site/data/*; all public projections remain governed
exclusively by scripts/publication_sync.py and authorial approval receipts.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import re
import subprocess
import sys
import unicodedata
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts import publication_sync  # noqa: E402

ACERVO_PATH = ROOT / "site/data/acervo.json"
ENRICHED_PATH = ROOT / "site/data/corpus-data-enriched.json"
STATS_PATH = ROOT / "site/data/stats.json"
CONSTELLATIONS_PUBLIC_PATH = ROOT / "site/data/constellations.json"
PUBLICATION_PATH = ROOT / "editorial/publication.json"
WORKER_PATH = ROOT / "src/index.js"
HF_CARD_PATH = ROOT / "scripts/hf_dataset_card.md"

BILINGUAL_PAGES: tuple[tuple[str, str, str, str], ...] = (
    ("site/index.html", "site/en/index.html", "/", "/en"),
    ("site/acervo.html", "site/en/acervo.html", "/acervo", "/en/acervo"),
    ("site/constelacoes.html", "site/en/constelacoes.html", "/constelacoes", "/en/constelacoes"),
    (
        "site/marmore-a-margem.html",
        "site/en/marmore-a-margem.html",
        "/marmore-a-margem",
        "/en/marmore-a-margem",
    ),
    ("site/nachleben.html", "site/en/nachleben.html", "/nachleben", "/en/nachleben"),
    ("site/jogo.html", "site/en/jogo.html", "/jogo", "/en/jogo"),
    ("site/sobre.html", "site/en/sobre.html", "/sobre", "/en/sobre"),
)


def _load_json(path: pathlib.Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _slugify(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    cleaned = re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")
    return cleaned[:64].strip("-") or "item"


def item_readiness_blockers(entry: dict[str, Any], site_root: pathlib.Path = ROOT / "site") -> list[str]:
    """Return human-readable reasons why an editorial item cannot yet be 'published'."""
    blockers: list[str] = []
    if not publication_sync._approved(entry, author=True):
        blockers.append("missing authorial approval (approved_by='ana' + approved_at YYYY-MM-DD)")

    rights = entry.get("rights_approval")
    if not isinstance(rights, dict) or rights.get("status") != "approved" or not publication_sync._approved(rights):
        blockers.append("missing rights_approval (status='approved', approved_by, approved_at, evidence_url)")
    elif not publication_sync._http_url(rights.get("evidence_url")):
        blockers.append("rights_approval.evidence_url is not a valid http(s) URL")

    image = entry.get("image") or {}
    rel_path = str(image.get("path") or "").strip()
    if not rel_path:
        blockers.append("missing image.path in site/assets/acervo/")
    else:
        abs_img = site_root / rel_path
        if not abs_img.is_file():
            blockers.append(f"image.path does not exist on disk: site/{rel_path}")
        else:
            actual_sha = hashlib.sha256(abs_img.read_bytes()).hexdigest()
            declared_sha = str(image.get("sha256") or "")
            if not declared_sha:
                blockers.append(f"missing image.sha256 (computed: {actual_sha[:12]}…)")
            elif declared_sha != actual_sha:
                blockers.append("image.sha256 mismatch with file on disk")

    for field in ("source_url", "license", "credit", "alt"):
        if not str(image.get(field) or "").strip():
            blockers.append(f"missing image.{field}")

    analysis = entry.get("public_analysis")
    if isinstance(analysis, dict):
        if analysis.get("status") != "approved":
            blockers.append(f"public_analysis.status is {analysis.get('status')!r} (must be 'approved')")
        if not publication_sync._approved(analysis, author=True):
            blockers.append("public_analysis missing authorial approval (approved_by + approved_at)")
    else:
        blockers.append("missing public_analysis block")

    return blockers


def collect_status(
    *,
    acervo_path: pathlib.Path = ACERVO_PATH,
    stats_path: pathlib.Path = STATS_PATH,
    publication_path: pathlib.Path = PUBLICATION_PATH,
) -> dict[str, Any]:
    acervo = _load_json(acervo_path)
    stats = _load_json(stats_path)
    publication = _load_json(publication_path)

    br_items = [item for item in acervo if item.get("pais") == "Brasil"]
    with_img = sum(1 for item in acervo if item.get("tem_imagem"))

    items_by_status: dict[str, list[dict[str, Any]]] = {"published": [], "review": [], "withheld": []}
    for entry in publication.get("items", []):
        st = entry.get("editorial_status", "review")
        cid = entry.get("canonical_id") or entry.get("legacy_record_id") or "?"
        blockers = item_readiness_blockers(entry)
        items_by_status.setdefault(st, []).append(
            {
                "id": cid,
                "slug": entry.get("slug") or "",
                "analysis_status": (entry.get("public_analysis") or {}).get("status", "none"),
                "ready_to_publish": len(blockers) == 0,
                "blockers": blockers,
            }
        )

    constellations_summary = []
    for const in publication.get("constellations", []):
        constellations_summary.append(
            {
                "slug": const.get("slug"),
                "title": const.get("title"),
                "editorial_status": const.get("editorial_status"),
                "item_count": len(const.get("item_ids") or []),
                "approved_by": const.get("approved_by"),
                "approved_at": const.get("approved_at"),
            }
        )

    sync_proc = subprocess.run(
        [sys.executable, str(ROOT / "scripts/publication_sync.py"), "--check", "--publication", str(publication_path)],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )

    regimes_raw = stats.get("por_regime", [])
    regimes_map = (
        {entry["regime"]: entry["n"] for entry in regimes_raw if isinstance(entry, dict) and "regime" in entry}
        if isinstance(regimes_raw, list)
        else dict(regimes_raw)
    )

    return {
        "catalogue": {
            "total_items": len(acervo),
            "with_image": with_img,
            "doctoral_strand_brazil_1822_1922": int(stats.get("recorte_tese_brasil_1822_1922", len(br_items))),
            "brazil_total": len(br_items),
            "regimes": regimes_map,
        },
        "editorial": {
            "schema_version": publication.get("schema_version"),
            "corpus_commit": publication.get("corpus_commit"),
            "items": items_by_status,
            "constellations": constellations_summary,
        },
        "sync_gate": {
            "ok": sync_proc.returncode == 0,
            "message": (sync_proc.stdout or sync_proc.stderr).strip(),
        },
    }


def check_bilingual_parity(root: pathlib.Path = ROOT) -> dict[str, Any]:
    worker_src = (root / "src/index.js").read_text(encoding="utf-8")
    pairs_report: list[dict[str, Any]] = []
    issues: list[str] = []

    for pt_rel, en_rel, pt_route, en_route in BILINGUAL_PAGES:
        pt_file = root / pt_rel
        en_file = root / en_rel
        pair_issues: list[str] = []

        if not pt_file.is_file():
            pair_issues.append(f"missing PT file: {pt_rel}")
        if not en_file.is_file():
            pair_issues.append(f"missing EN file: {en_rel}")

        if pt_file.is_file() and en_file.is_file():
            pt_html = pt_file.read_text(encoding="utf-8")
            en_html = en_file.read_text(encoding="utf-8")

            if 'lang="pt-BR"' not in pt_html:
                pair_issues.append(f"{pt_rel}: missing lang=\"pt-BR\"")
            if 'lang="en"' not in en_html:
                pair_issues.append(f"{en_rel}: missing lang=\"en\"")

            pt_canon = f'rel="canonical" href="https://iconocracia.com{pt_route}"'
            en_canon = f'rel="canonical" href="https://iconocracia.com{en_route}"'
            if pt_canon not in pt_html:
                pair_issues.append(f"{pt_rel}: missing or mismatched canonical link ({pt_route})")
            if en_canon not in en_html:
                pair_issues.append(f"{en_rel}: missing or mismatched canonical link ({en_route})")

            for label, html in ((pt_rel, pt_html), (en_rel, en_html)):
                if f'hreflang="pt-BR" href="https://iconocracia.com{pt_route}"' not in html:
                    pair_issues.append(f"{label}: missing hreflang=\"pt-BR\" -> {pt_route}")
                if (
                    f'hreflang="en" href="https://iconocracia.com{en_route}"' not in html
                    and f'hreflang="en" href="https://iconocracia.com{en_route}/"' not in html
                ):
                    pair_issues.append(f"{label}: missing hreflang=\"en\" -> {en_route}")

                for landmark in ('class="ex-header"', 'class="ex-night"', 'class="ex-lang"', "<main", "<footer"):
                    if landmark not in html:
                        pair_issues.append(f"{label}: missing landmark {landmark}")

        for route in (pt_route, en_route):
            if route != "/" and f"'{route}'" not in worker_src and f'"{route}"' not in worker_src:
                pair_issues.append(f"Worker src/index.js missing route registration for {route}")

        issues.extend(pair_issues)
        pairs_report.append(
            {
                "pt_file": pt_rel,
                "en_file": en_rel,
                "pt_route": pt_route,
                "en_route": en_route,
                "ok": len(pair_issues) == 0,
                "issues": pair_issues,
            }
        )

    return {"ok": len(issues) == 0, "pair_count": len(pairs_report), "issues": issues, "pairs": pairs_report}


def inspect_target(
    query: str,
    *,
    acervo_path: pathlib.Path = ACERVO_PATH,
    enriched_path: pathlib.Path = ENRICHED_PATH,
    publication_path: pathlib.Path = PUBLICATION_PATH,
) -> dict[str, Any]:
    acervo = _load_json(acervo_path)
    enriched = _load_json(enriched_path) if enriched_path.is_file() else []
    publication = _load_json(publication_path)
    q = query.strip()

    for const in publication.get("constellations", []):
        if const.get("slug") == q:
            return {"kind": "constellation", "constellation": const}

    pub_entry = None
    for entry in publication.get("items", []):
        ids = {
            entry.get("canonical_id"),
            entry.get("legacy_record_id"),
            entry.get("slug"),
            *(entry.get("legacy_ids") or []),
        }
        if q in ids:
            pub_entry = entry
            break

    target_ids = {q}
    if pub_entry:
        for candidate in (
            pub_entry.get("canonical_id"),
            pub_entry.get("legacy_record_id"),
            *(pub_entry.get("legacy_ids") or []),
        ):
            if candidate:
                target_ids.add(str(candidate))

    for alias in publication.get("recovered_aliases", []):
        alias_ids = {alias.get("canonical_id"), *(alias.get("legacy_ids") or [])}
        if target_ids & alias_ids:
            target_ids |= {str(x) for x in alias_ids if x}

    layer1_item = next((item for item in acervo if str(item.get("id")) in target_ids), None)
    enriched_item = next((item for item in enriched if str(item.get("id")) in target_ids), None)

    if not layer1_item and not pub_entry and not enriched_item:
        raise ValueError(f"Item ou constelação não encontrado: {query!r}")

    return {
        "kind": "item",
        "query": q,
        "layer_1_record": layer1_item,
        "enriched_source_present": enriched_item is not None,
        "layer_2_overlay": pub_entry,
        "readiness_blockers": item_readiness_blockers(pub_entry) if pub_entry else ["no entry in editorial/publication.json"],
    }


def draft_overlay_entry(
    item_id: str,
    *,
    slug: str | None = None,
    constellation: str | None = None,
    acervo_path: pathlib.Path = ACERVO_PATH,
    publication_path: pathlib.Path = PUBLICATION_PATH,
    site_root: pathlib.Path = ROOT / "site",
    write: bool = False,
) -> dict[str, Any]:
    acervo = _load_json(acervo_path)
    publication = _load_json(publication_path)

    for existing in publication.get("items", []):
        if item_id in {
            existing.get("canonical_id"),
            existing.get("legacy_record_id"),
            *(existing.get("legacy_ids") or []),
        }:
            raise ValueError(f"O item {item_id!r} já possui entrada em editorial/publication.json.")

    record = next((item for item in acervo if str(item.get("id")) == item_id), None)
    if not record:
        raise ValueError(f"O item {item_id!r} não foi encontrado em {acervo_path.name}.")

    computed_slug = slug or _slugify(f"{record.get('titulo', item_id)}-{record.get('data', '')}")
    local_rel = f"assets/acervo/{item_id}.webp"
    local_abs = site_root / local_rel
    image_block: dict[str, Any] = {
        "path": local_rel if local_abs.is_file() else "",
        "source_url": str(record.get("imagem") or record.get("fonte_url") or ""),
        "catalog_url": str(record.get("fonte_url") or ""),
        "license": str(record.get("direitos") or ""),
        "credit": str(record.get("instituicao") or ""),
        "alt": str(record.get("descricao") or record.get("titulo") or ""),
    }
    if local_abs.is_file():
        image_block["sha256"] = hashlib.sha256(local_abs.read_bytes()).hexdigest()

    draft_entry: dict[str, Any] = {
        "canonical_id": item_id,
        "source_url": str(record.get("fonte_url") or ""),
        "slug": computed_slug,
        "image": image_block,
        "legacy_record_id": item_id,
        "legacy_ids": [],
        "editorial_status": "review",
    }
    if constellation:
        draft_entry["constellations"] = [constellation]

    draft_entry["public_analysis"] = {
        "status": "draft",
        "summary": "",
        "panofsky": {
            "level_1": "",
            "level_2": "",
            "level_3": "",
        },
        "indicators": {
            "desincorporacao": 0,
            "rigidez_postural": 0,
            "dessexualizacao": 0,
            "uniformizacao_facial": 0,
            "heraldizacao": 0,
            "enquadramento_arquitetonico": 0,
            "apagamento_narrativo": 0,
            "monocromatizacao": 0,
            "serialidade": 0,
            "inscricao_estatal": 0,
        },
        "scale": "0–3; não aplicável quando não há figura feminina",
        "method_note": (
            "Rascunho assistido seguido de adjudicação humana quando indicado. "
            "O índice composto histórico não é exibido nem recalculado."
        ),
    }

    if write:
        publication["items"].append(draft_entry)
        publication_sync.validate_publication(publication)
        publication_path.write_text(json.dumps(publication, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    return draft_entry


def run_preflight(*, hf_check: bool = False) -> dict[str, Any]:
    steps: list[dict[str, Any]] = []

    def _run_cmd(name: str, cmd: list[str]) -> bool:
        proc = subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True)
        combined = "\n".join(part.strip() for part in (proc.stdout, proc.stderr) if part and part.strip())
        steps.append(
            {
                "step": name,
                "ok": proc.returncode == 0,
                "returncode": proc.returncode,
                "summary": combined.splitlines()[-1] if combined else "",
            }
        )
        return proc.returncode == 0

    _run_cmd("publication_sync", [sys.executable, "scripts/publication_sync.py", "--check"])
    parity = check_bilingual_parity(ROOT)
    steps.append(
        {
            "step": "bilingual_parity",
            "ok": parity["ok"],
            "returncode": 0 if parity["ok"] else 1,
            "summary": f"{parity['pair_count']} route pairs verified ({len(parity['issues'])} issues)",
        }
    )
    _run_cmd("python_unit_tests", [sys.executable, "-m", "unittest", "discover", "-s", "tests"])
    _run_cmd(
        "node_route_tests",
        ["node", "--test", *[str(p.relative_to(ROOT)) for p in sorted((ROOT / "tests").glob("test_*.mjs"))]],
    )

    if hf_check:
        hf_ok = HF_CARD_PATH.is_file() and "license: cc-by-4.0" in HF_CARD_PATH.read_text(encoding="utf-8")
        steps.append(
            {
                "step": "hf_dataset_card",
                "ok": hf_ok,
                "returncode": 0 if hf_ok else 1,
                "summary": "scripts/hf_dataset_card.md frontmatter verified" if hf_ok else "missing or invalid HF card",
            }
        )

    all_ok = all(s["ok"] for s in steps)
    return {"ok": all_ok, "steps": steps}


def _print_status_human(data: dict[str, Any]) -> None:
    cat = data["catalogue"]
    ed = data["editorial"]
    gate = data["sync_gate"]
    print("=== MNEMOSYNE VIVA · CURATORIAL & EDITORIAL STEWARD ===")
    print(
        f"Catálogo Público (Camada I): {cat['total_items']} obras "
        f"({cat['with_image']} com imagem) · Fio Doutoral (Brasil 1822–1922): {cat['doctoral_strand_brazil_1822_1922']} "
        f"(Brasil total: {cat['brazil_total']})"
    )
    regimes_str = ", ".join(f"{k}: {v}" for k, v in cat["regimes"].items())
    print(f"Regimes: {regimes_str}")
    print(f"Recibo & Projeção Editorial: {'OK' if gate['ok'] else 'ERRO'} — {gate['message']}")
    print("\nFila Editorial (Camada II — editorial/publication.json):")
    for st in ("published", "review", "withheld"):
        entries = ed["items"].get(st, [])
        print(f"  • {st.upper()} ({len(entries)} itens):")
        for item in entries:
            ready_tag = "PRONTO P/ PUBLICAR" if item["ready_to_publish"] else f"{len(item['blockers'])} pendência(s)"
            print(f"      - {item['id']} [{item['slug']}] (análise={item['analysis_status']}) -> {ready_tag}")
    print("\nConstelações:")
    for c in ed["constellations"]:
        print(
            f"  • {c['slug']} ({c['editorial_status']}) — {c['title']} "
            f"[{c['item_count']} obras]"
        )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    p_status = sub.add_parser("status", help="Exibir painel curatorial e fila de publicação (Camadas I e II).")
    p_status.add_argument("--json", action="store_true", help="Saída em JSON.")

    p_parity = sub.add_parser("parity", help="Verificar paridade bilíngue PT/EN, hreflang, canonicals e Worker.")
    p_parity.add_argument("--json", action="store_true", help="Saída em JSON.")

    p_inspect = sub.add_parser("inspect", help="Inspecionar ficha (Camada I + Camada II) ou constelação por ID/slug.")
    p_inspect.add_argument("target", help="ID canônico, ID legado ou slug.")
    p_inspect.add_argument("--json", action="store_true", help="Saída em JSON.")

    p_draft = sub.add_parser(
        "draft-overlay",
        help="Gerar rascunho de entrada Camada II (status=review/draft) para editorial/publication.json.",
    )
    p_draft.add_argument("item_id", help="ID do item em site/data/acervo.json (ex.: BR-001).")
    p_draft.add_argument("--slug", help="Slug opcional (gerado automaticamente do título se omitido).")
    p_draft.add_argument("--constellation", help="Slug de constelação opcional para vincular o item.")
    p_draft.add_argument("--write", action="store_true", help="Gravar no manifesto editorial/publication.json.")

    p_pre = sub.add_parser("preflight", help="Executar bateria completa de validação (sync, paridade, Python e Node).")
    p_pre.add_argument("--hf-check", action="store_true", help="Incluir verificação do Dataset Card do Hugging Face.")
    p_pre.add_argument("--json", action="store_true", help="Saída em JSON.")

    args = parser.parse_args(argv)
    try:
        if args.command == "status":
            data = collect_status()
            if args.json:
                print(json.dumps(data, ensure_ascii=False, indent=2))
            else:
                _print_status_human(data)
            return 0 if data["sync_gate"]["ok"] else 1

        if args.command == "parity":
            report = check_bilingual_parity()
            if args.json:
                print(json.dumps(report, ensure_ascii=False, indent=2))
            else:
                print(f"Paridade bilíngue PT/EN: {'OK' if report['ok'] else 'FALHOU'} ({report['pair_count']} pares)")
                for issue in report["issues"]:
                    print(f"  [!] {issue}")
            return 0 if report["ok"] else 1

        if args.command == "inspect":
            info = inspect_target(args.target)
            print(json.dumps(info, ensure_ascii=False, indent=2))
            return 0

        if args.command == "draft-overlay":
            entry = draft_overlay_entry(
                args.item_id,
                slug=args.slug,
                constellation=args.constellation,
                write=args.write,
            )
            print(json.dumps(entry, ensure_ascii=False, indent=2))
            return 0

        if args.command == "preflight":
            result = run_preflight(hf_check=args.hf_check)
            if args.json:
                print(json.dumps(result, ensure_ascii=False, indent=2))
            else:
                for step in result["steps"]:
                    mark = "✔" if step["ok"] else "✖"
                    print(f"{mark} {step['step']}: {step['summary']}")
            return 0 if result["ok"] else 1

    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"[steward] erro: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
