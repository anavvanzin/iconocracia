#!/usr/bin/env python3
"""RFC #52: deterministic catalogue boundary (opt-in until data review).

API: build() -> PacoteAcervo; CLI: --check validates without writing.
No network access unless --source-url is explicit. No editorial publication,
commit, PR, merge or deploy is performed by this module.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from dataclasses import dataclass

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_ROOT = ROOT / 'schemas'
__all__ = ['build', 'PacoteAcervo']
CONTRACT_VERSION = 'acervo/1'
PLACEHOLDER = re.compile(r'iconocracy(-corpus)?\.(local|corpus)', re.I)
COUNTRIES = {
    'France': 'França', 'Brazil': 'Brasil', 'United States': 'Estados Unidos',
    'Germany': 'Alemanha', 'United Kingdom': 'Reino Unido', 'Italy': 'Itália',
    'Portugal': 'Portugal', 'Belgium': 'Bélgica', 'Netherlands': 'Países Baixos',
    'Spain': 'Espanha', 'Austria': 'Áustria', 'Denmark': 'Dinamarca',
    'Mexico': 'México', 'Argentina': 'Argentina', 'Switzerland': 'Suíça',
    'Uruguay': 'Uruguai', 'Chile': 'Chile', 'CL': 'Chile',
    'EUA': 'Estados Unidos', 'USA': 'Estados Unidos', 'US': 'Estados Unidos',
}
STATUSES = {'published', 'review', 'draft', 'archived'}
# Only this explicit technical marker is excluded. Interpretative labels stay.
TECHNICAL_MOTIFS = {'descricao_pre_iconografica'}


def _json_bytes(value):
    return json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True, allow_nan=False).encode('utf-8')


def _digest(value):
    canonical = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False)
    return hashlib.sha256(canonical.encode('utf-8')).hexdigest()


def _fallback_validate(value, schema, location='<root>'):
    """Stdlib validator for the subset used by the two repository contracts.

    Unknown constraints fail closed instead of pretending to validate them.
    """
    supported = {'$schema', '$id', 'title', 'description', 'type', 'items', 'properties',
                 'required', 'additionalProperties', 'enum', 'minLength', 'maxItems'}
    unknown = set(schema) - supported
    if unknown:
        raise ValueError(f'Instale jsonschema para validar: {sorted(unknown)}')
    predicates = {'array': lambda x: isinstance(x, list), 'object': lambda x: isinstance(x, dict),
                  'string': lambda x: isinstance(x, str), 'boolean': lambda x: isinstance(x, bool),
                  'null': lambda x: x is None, 'integer': lambda x: type(x) is int,
                  'number': lambda x: type(x) in (int, float)}
    types = schema.get('type', [])
    if isinstance(types, str):
        types = [types]
    if types and not any(predicates[t](value) for t in types):
        raise ValueError(f'{location}: tipo inválido')
    if 'enum' in schema and value not in schema['enum']:
        raise ValueError(f'{location}: valor fora do enum')
    if isinstance(value, str) and len(value) < schema.get('minLength', 0):
        raise ValueError(f'{location}: texto muito curto')
    if isinstance(value, list):
        if len(value) > schema.get('maxItems', len(value)):
            raise ValueError(f'{location}: array muito longo')
        for i, item in enumerate(value):
            if 'items' in schema:
                _fallback_validate(item, schema['items'], f'{location}/{i}')
    if isinstance(value, dict):
        for name in schema.get('required', []):
            if name not in value:
                raise ValueError(f'{location}: campo obrigatório {name}')
        for name, item in value.items():
            if name in schema.get('properties', {}):
                _fallback_validate(item, schema['properties'][name], f'{location}/{name}')
            elif schema.get('additionalProperties') is False:
                raise ValueError(f'{location}: campo extra {name}')


def _validate(value, path, warnings):
    schema = json.loads(Path(path).read_text(encoding='utf-8'))
    try:
        import jsonschema
    except ModuleNotFoundError:
        _fallback_validate(value, schema)
        warning = 'jsonschema ausente: validação stdlib dos contratos suportados'
        if warning not in warnings:
            warnings.append(warning)
    else:
        try:
            jsonschema.Draft7Validator.check_schema(schema)
        except jsonschema.exceptions.SchemaError as error:
            raise ValueError(f'Schema inválido: {error.message}') from error
        errors = sorted(jsonschema.Draft7Validator(schema).iter_errors(value), key=lambda e: str(e.absolute_path))
        if errors:
            raise ValueError('; '.join(f'{list(e.absolute_path)}: {e.message}' for e in errors[:10]))


def _load(source, candidates):
    if source is None:
        source = next((p for p in candidates if p.is_file()), None)
        if source is None:
            raise ValueError('Nenhuma fonte de acervo encontrada')
    if isinstance(source, (str, Path)):
        records = json.loads(Path(source).read_text(encoding='utf-8'))
    else:
        records = copy.deepcopy(source)
    return records


def _validate_input(records, warnings):
    _validate(records, SCHEMA_ROOT / 'corpus-input.schema.json', warnings)
    seen = set()
    for item in records:
        if item['id'] in seen:
            raise ValueError(f"ID duplicado no corpus: {item['id']}")
        seen.add(item['id'])
        for name in ('files', 'iconographic_metadata'):
            value = item.get(name)
            if value is not None and not isinstance(value, list if name == 'files' else dict):
                raise ValueError(f'{name}: tipo inválido')
        if any(not isinstance(f, dict) for f in item.get('files') or []):
            raise ValueError('files: cada arquivo deve ser objeto')


def _country(value):
    raw = str(value or '').strip()
    for source, target in COUNTRIES.items():
        if raw.casefold() in (source.casefold(), target.casefold()) or raw.casefold().startswith(source.casefold() + ' ('):
            return target
    return raw or 'Outros'


def _url(value):
    raw = str(value or '').strip()
    try:
        parsed = urllib.parse.urlparse(raw)
        valid = (parsed.scheme in ('https', 'http') and parsed.hostname
                 and parsed.username is None and parsed.password is None
                 and not PLACEHOLDER.search(raw))
    except ValueError:
        return ''
    return raw if valid else ''


def _reject_credentials(value):
    """Fail closed for credential URLs in passthrough text and nested metadata.

    Do not include the offending value in errors/logs.
    """
    if isinstance(value, dict):
        for key, child in value.items():
            _reject_credentials(key)
            _reject_credentials(child)
    elif isinstance(value, list):
        for child in value:
            _reject_credentials(child)
    elif isinstance(value, str):
        for url in re.findall(r'https?://[^\s<>"\']+', value, re.I):
            try:
                parsed = urllib.parse.urlparse(url)
                credentials = parsed.username is not None or parsed.password is not None
            except ValueError:
                credentials = True
            if credentials:
                raise ValueError('URL com credenciais proibida na projeção')


def _local(value):
    raw = str(value or '')
    if not raw or urllib.parse.urlparse(raw).scheme or '\\' in raw:
        return ''
    site = (ROOT / 'site').resolve()
    path = (site / raw.lstrip('/')).resolve()
    if not path.is_relative_to(site) or not path.is_file() or path.stat().st_size == 0:
        return ''
    return path.relative_to(site).as_posix()


def _image(item):
    # IDs are validated strings; reject path separators before probing mirrors.
    key = item['id']
    mirror = _local(f'assets/acervo/{key}.webp') if '/' not in key and '\\' not in key else ''
    if mirror:
        return mirror
    # Alternative local paths require the optional editorial renderer.
    # Defer them until the consumer migration in RFC #52.
    for name in ('thumbnail_url', 'url_iiif', 'url_image_download'):
        remote = _url(item.get(name))
        if remote:
            return remote
    return ''


def _clean_metadata(value):
    if isinstance(value, dict):
        return {k: _clean_metadata(v) for k, v in value.items() if k != 'endurecimento_score'}
    if isinstance(value, list):
        return [_clean_metadata(v) for v in value]
    return value


def _item(source):
    image = _image(source)
    citation = source.get('citation_abnt') or ''
    if PLACEHOLDER.search(citation):
        citation = re.sub(r'\s*(Disponível em:|Acesso em:).*$','', citation, flags=re.S).rstrip()
    result = {
        'id': source['id'], 'titulo': source['title'],
        'pais': _country(source.get('country_pt') or source['country']),
        'autoria': source.get('creator') or source.get('author') or '',
        'instituicao': source.get('institution') or source.get('source_archive') or source.get('sourceInstitution') or '',
        'data': source['date'], 'suporte': source.get('medium') or source.get('support') or '',
        'regime': source['regime'].strip().lower().capitalize(),
        'motivos': copy.deepcopy(source.get('motif') or []),
        'descricao': (source.get('description') or source.get('shortDescription') or '')[:600],
        'descricao_longa': source.get('longDescription') or source.get('description') or '',
        'notas_curatoriais': source.get('curatorialNotes') or '',
        'direitos': source.get('rights') or '', 'fonte_url': _url(source.get('url')),
        'imagem': image, 'tem_imagem': bool(image), 'citacao': citation,
    }
    if source.get('iconographic_metadata'):
        result['iconographic_metadata'] = _clean_metadata(source['iconographic_metadata'])
    return result


def _rank(counter, label):
    return [{label: key, 'n': n} for key, n in sorted(counter.items(), key=lambda pair: (-pair[1], pair[0]))]


def _stats(items):
    countries = Counter(i['pais'] for i in items)
    regimes = Counter(i['regime'] or 'Não classificado' for i in items)
    motifs = Counter(m.strip() for i in items for m in i['motivos']
                     if m.strip() and m.strip().lower() not in TECHNICAL_MOTIFS)
    years = [int(y) for i in items for y in re.findall(r'(?<!\d)(1\d{3}|20\d{2}|2100)(?!\d)', i['data'])]
    return dict(total=len(items), paises=len(set(countries) - {'Outros'}),
                com_imagem=sum(i['tem_imagem'] for i in items),
                periodo={'min': min(years) if years else None, 'max': max(years) if years else None},
                por_pais=_rank(countries, 'pais'),
                por_regime=[{**r, 'chave': r['regime'].lower()} for r in _rank(regimes, 'regime')],
                motivos=_rank(motifs, 'motivo')[:10])


@dataclass(frozen=True)
class MetaBuild:
    source_sha256: str
    enriched_sha256: str
    source_count: int
    published_count: int
    contract_version: str = CONTRACT_VERSION
    warnings: tuple[str, ...] = ()
    validation_errors: tuple[str, ...] = ()

    def stable(self):
        return {name: getattr(self, name) for name in ('source_sha256', 'enriched_sha256',
                'source_count', 'published_count', 'contract_version')}


@dataclass(frozen=True)
class PacoteAcervo:
    itens: list[dict]
    stats: dict
    meta: MetaBuild
    status: str = 'published'

    def fichas(self):
        keys = ('id', 'titulo', 'data', 'pais', 'regime', 'motivos', 'suporte', 'citacao', 'fonte_url', 'imagem')
        return [{key: copy.deepcopy(item[key]) for key in keys} for item in self.itens]

    def escrever(self, out_dir: Path):
        """Stage both files before atomic replacement of each destination.

        Each file is atomic; this is not a two-file transactional filesystem.
        Editorial publication must validate the completed package before deploy.
        """
        out_dir = Path(out_dir)
        if self.status != 'published' and out_dir.resolve().is_relative_to((ROOT / 'site').resolve()):
            raise ValueError('Projeções não publicadas exigem saída fora de site/')
        _reject_credentials(self.itens)
        _reject_credentials(self.stats)
        outputs = {'acervo.json': _json_bytes(self.itens), 'stats.json': _json_bytes(self.stats)}
        out_dir.mkdir(parents=True, exist_ok=True)
        staged = []
        try:
            for name, content in outputs.items():
                with tempfile.NamedTemporaryFile(dir=out_dir, prefix='.' + name, delete=False) as file:
                    staged.append((Path(file.name), out_dir / name))
                    file.write(content)
                    file.flush()
                    os.fsync(file.fileno())
                os.chmod(file.name, 0o644)
            for temporary, destination in staged:
                os.replace(temporary, destination)
        finally:
            for temporary, _ in staged:
                temporary.unlink(missing_ok=True)
        return [out_dir / name for name in outputs]


def build(corpus=None, enriched=None, source_url=None, *, status='published', out_dir=None,
          incluir_meta=True, schema=None) -> PacoteAcervo:
    """Generate/validate a package; optional out_dir writes only after validation.

    schema overrides the OUTPUT contract. The input contract is always checked.
    Missing editorialStatus means published, even when selecting another status.
    enriched is a projection/subset: it cannot promote a private corpus record.
    """
    if status not in STATUSES:
        raise ValueError(f'Status editorial inválido: {status}')
    if source_url and corpus is not None:
        raise ValueError('Use corpus ou source_url, não ambos')
    if source_url:
        if not _url(source_url):
            raise ValueError('source_url exige URL HTTP(S) válida')
        with urllib.request.urlopen(source_url, timeout=30) as response:
            corpus = json.load(response)
    default = corpus is None
    records = _load(corpus, [ROOT / 'corpus/corpus-data.json', ROOT / 'site/data/corpus-data-enriched.json'])
    selected_source = _load(enriched, [ROOT / 'corpus/corpus-data-enriched.json', ROOT / 'site/data/corpus-data-enriched.json']) if default and enriched is None else _load(enriched if enriched is not None else records, [])
    warnings = []
    _validate_input(records, warnings)
    _validate_input(selected_source, warnings)
    by_id = {item['id']: item for item in records}
    for item in selected_source:
        if item['id'] not in by_id:
            raise ValueError(f"Item enriquecido ausente no corpus: {item['id']}")
    selected = [item for item in selected_source if item.get('editorialStatus', 'published') == status
                and by_id[item['id']].get('editorialStatus', 'published') == status]
    items = sorted((_item(item) for item in selected), key=lambda i: (not i['tem_imagem'], i['pais'], i['titulo'], i['id']))
    _validate(items, schema or SCHEMA_ROOT / 'acervo.schema.json', warnings)
    meta = MetaBuild(_digest(sorted(records, key=lambda i: i['id'])),
                     _digest(sorted(selected_source, key=lambda i: i['id'])), len(records), len(items),
                     warnings=tuple(warnings))
    stats = _stats(items)
    if incluir_meta:
        stats['meta'] = meta.stable()
    _reject_credentials(items)
    package = PacoteAcervo(items, stats, meta, status)
    if out_dir is not None:
        package.escrever(out_dir)
    return package


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--corpus', type=Path)
    parser.add_argument('--enriched', type=Path)
    parser.add_argument('--source-url')
    parser.add_argument('--schema', type=Path, help='Contrato de saída; entrada sempre validada')
    parser.add_argument('--out', type=Path, help='Saída explícita; status privado exige caminho fora de site/')
    parser.add_argument('--status', choices=sorted(STATUSES), default='published')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    try:
        if not args.check and args.status != 'published' and args.out is None:
            raise ValueError('Status não publicado exige --out explícito fora de site/')
        package = build(args.corpus, args.enriched, args.source_url, status=args.status, schema=args.schema)
        if not args.check:
            package.escrever(args.out if args.out is not None else ROOT / 'site/data')
        print(json.dumps({'check': args.check, **package.meta.stable(), 'warnings': package.meta.warnings}, ensure_ascii=False))
        return 0
    except (OSError, ValueError, TypeError, urllib.error.URLError) as error:
        print(f'[acervo] erro: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
