#!/usr/bin/env node
/**
 * TL-03 — Corpus build generator
 *
 * Reads canonical corpus sources from the hub repository:
 *   - data/processed/records.jsonl
 *   - corpus/corpus-data.json
 *
 * Optionally validates each record against:
 *   - tools/schemas/master-record.schema.json
 *
 * Emits site assets:
 *   - src/data/corpus.json
 *   - src/data/stats.json
 *
 * If canonical sources are missing, falls back to src/data/seed-corpus.json
 * with a console warning and exits successfully.
 *
 * Usage:
 *   node scripts/build-corpus-data.js
 */

const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const HUB_ROOT = path.resolve(PROJECT_ROOT, "..", "..", "hub", "iconocracy-corpus");

const SOURCES = {
  records: path.join(HUB_ROOT, "data", "processed", "records.jsonl"),
  corpusMeta: path.join(HUB_ROOT, "corpus", "corpus-data.json"),
  schema: path.join(HUB_ROOT, "tools", "schemas", "master-record.schema.json"),
};

const OUTPUT = {
  corpus: path.join(PROJECT_ROOT, "src", "data", "corpus.json"),
  stats: path.join(PROJECT_ROOT, "src", "data", "stats.json"),
  seed: path.join(PROJECT_ROOT, "src", "data", "seed-corpus.json"),
};

// Data contract keys used by Atlas / Atlas Lab.
const SITE_INDICATOR_KEYS = [
  "FEI", "CII", "PRI", "LEG", "AUT", "JUD", "SEN", "SEM", "COM", "ABS",
];
const PANOFSKY_KEYS = ["pre", "icono", "iconology"];

function log(...args) {
  // eslint-disable-next-line no-console
  console.log("[build-corpus]", ...args);
}

function warn(...args) {
  // eslint-disable-next-line no-console
  console.warn("[build-corpus]", ...args);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function readJsonLines(filePath) {
  const lines = fs
    .readFileSync(filePath, "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (err) {
      warn(`Malformed JSON at ${filePath}:${index + 1} — skipping line.`, err.message);
      return null;
    }
  }).filter(Boolean);
}

function loadValidator() {
  try {
    // master-record.schema.json declares $schema "draft/2020-12"; the plain
    // `require("ajv")` constructor only supports draft-07 and rejects the
    // 2020-12 $schema with "no schema with key or ref". Use the 2020 build.
    const Ajv2020 = require("ajv/dist/2020");
    return new Ajv2020({ strict: false, allErrors: true });
  } catch {
    return null;
  }
}

// Collect relative $ref targets (e.g. "webscout-output.schema.json") so we can
// register sibling schemas ajv cannot resolve from disk on its own.
function collectExternalRefs(schema) {
  const refs = new Set();
  function walk(obj) {
    if (Array.isArray(obj)) {
      obj.forEach(walk);
    } else if (obj && typeof obj === "object") {
      for (const [k, v] of Object.entries(obj)) {
        if (k === "$ref" && typeof v === "string" && !v.startsWith("#")) {
          refs.add(v);
        } else {
          walk(v);
        }
      }
    }
  }
  walk(schema);
  return [...refs];
}

function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function normalizeYear(value) {
  if (value === null || value === undefined || value === "") return null;
  const s = String(value).trim();
  // "s/d" or ranges are not parseable as a single year.
  if (/^s\/?d$/i.test(s)) return null;
  const match = s.match(/(\d{3,4})/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  return Number.isFinite(year) ? year : null;
}

function deriveId(record) {
  // Prefer explicit id from corpus-data.json; otherwise build from fields.
  return record.id || record.item_id;
}

function deriveCountry(record) {
  let candidate =
    record.country ||
    record.input?.place_hint ||
    record.place_hint ||
    "";
  if (Array.isArray(candidate)) candidate = candidate[0] || "";
  if (!candidate || typeof candidate !== "string") return null;

  // Some records store place_hint as a serialized array or bracketed code.
  candidate = candidate
    .replace(/[[\]']/g, "")
    .replace(/,/g, " ")
    .trim();

  const normalized = candidate
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Exact-match map (lowercase country names and ISO 3166-1 alpha-2 codes).
  const map = {
    // names
    "brazil": "BR",
    "brasil": "BR",
    "france": "FR",
    "franca": "FR",
    "germany": "DE",
    "alemanha": "DE",
    "united kingdom": "UK",
    "reino unido": "UK",
    "uk": "UK",
    "great britain": "UK",
    "belgium": "BE",
    "belgica": "BE",
    "united states": "US",
    "estados unidos": "US",
    "usa": "US",
    "us": "US",
    "italy": "IT",
    "italia": "IT",
    "portugal": "PT",
    "spain": "ES",
    "espanha": "ES",
    "netherlands": "NL",
    "holanda": "NL",
    "austria": "AT",
    "argentina": "AR",
    "mexico": "MX",
    "mexique": "MX",
    "switzerland": "CH",
    "suica": "CH",
    "sweden": "SE",
    "suecia": "SE",
    "canada": "CA",
    "russia": "RU",
    "uruguay": "UY",
    "uruguai": "UY",
    "chile": "CL",
    "colombia": "CO",
    "venezuela": "VE",
    "peru": "PE",
    "bolivia": "BO",
    "paraguay": "PY",
    "ecuador": "EC",
    "guatemala": "GT",
    "honduras": "HN",
    "nicaragua": "NI",
    "costa rica": "CR",
    "panama": "PA",
    "cuba": "CU",
    "puerto rico": "PR",
    "haiti": "HT",
    "dominican republic": "DO",
    "jamaica": "JM",
    "trinidad and tobago": "TT",
    "greece": "GR",
    "turkey": "TR",
    "turquia": "TR",
    "egypt": "EG",
    "egito": "EG",
    "japan": "JP",
    "japao": "JP",
    "china": "CN",
    "india": "IN",
    "poland": "PL",
    "polonia": "PL",
    "hungary": "HU",
    "hungria": "HU",
    "romania": "RO",
    "romenia": "RO",
    "czech republic": "CZ",
    "czechia": "CZ",
    "slovakia": "SK",
    "slovenia": "SI",
    "croatia": "HR",
    "serbia": "RS",
    "bulgaria": "BG",
    "bosnia and herzegovina": "BA",
    "ukraine": "UA",
    "belarus": "BY",
    "lithuania": "LT",
    "latvia": "LV",
    "estonia": "EE",
    "finland": "FI",
    "norway": "NO",
    "denmark": "DK",
    "ireland": "IE",
    "iceland": "IS",
    "australia": "AU",
    "new zealand": "NZ",
    "south africa": "ZA",
    "algeria": "DZ",
    "morocco": "MA",
    "tunisia": "TN",
    "libya": "LY",
    "ethiopia": "ET",
    "kenya": "KE",
    "nigeria": "NG",
    "ghana": "GH",
    "senegal": "SN",
    "congo": "CD",
    "democratic republic of the congo": "CD",
    "angola": "AO",
    "mozambique": "MZ",
    "madagascar": "MG",
    "zimbabwe": "ZW",
    "botswana": "BW",
    "namibia": "NA",
    "zambia": "ZM",
    "tanzania": "TZ",
    "uganda": "UG",
    "rwanda": "RW",
    "cameroon": "CM",
    "ivory coast": "CI",
    "mali": "ML",
    "burkina faso": "BF",
    "niger": "NE",
    "chad": "TD",
    "sudan": "SD",
    "south sudan": "SS",
    "somalia": "SO",
    "eritrea": "ER",
    "djibouti": "DJ",
    "mauritania": "MR",
    "western sahara": "EH",
    // ISO codes (records sometimes store place_hint as a 2-letter code)
    "br": "BR",
    "fr": "FR",
    "de": "DE",
    "uk": "UK",
    "be": "BE",
    "us": "US",
    "it": "IT",
    "pt": "PT",
    "es": "ES",
    "nl": "NL",
    "at": "AT",
    "ar": "AR",
    "mx": "MX",
    "ch": "CH",
    "se": "SE",
    "ca": "CA",
    "ru": "RU",
    "uy": "UY",
    "cl": "CL",
    "co": "CO",
    "ve": "VE",
    "pe": "PE",
    "bo": "BO",
    "py": "PY",
    "ec": "EC",
    "gt": "GT",
    "hn": "HN",
    "ni": "NI",
    "cr": "CR",
    "pa": "PA",
    "cu": "CU",
    "pr": "PR",
    "ht": "HT",
    "do": "DO",
    "jm": "JM",
    "tt": "TT",
    "gr": "GR",
    "tr": "TR",
    "eg": "EG",
    "jp": "JP",
    "cn": "CN",
    "in": "IN",
    "pl": "PL",
    "hu": "HU",
    "ro": "RO",
    "cz": "CZ",
    "sk": "SK",
    "si": "SI",
    "hr": "HR",
    "rs": "RS",
    "bg": "BG",
    "ba": "BA",
    "ua": "UA",
    "by": "BY",
    "lt": "LT",
    "lv": "LV",
    "ee": "EE",
    "fi": "FI",
    "no": "NO",
    "dk": "DK",
    "ie": "IE",
    "is": "IS",
    "au": "AU",
    "nz": "NZ",
    "za": "ZA",
    "dz": "DZ",
    "ma": "MA",
    "tn": "TN",
    "ly": "LY",
    "et": "ET",
    "ke": "KE",
    "ng": "NG",
    "gh": "GH",
    "sn": "SN",
    "cd": "CD",
    "ao": "AO",
    "mz": "MZ",
    "mg": "MG",
    "zw": "ZW",
    "bw": "BW",
    "na": "NA",
    "zm": "ZM",
    "tz": "TZ",
    "ug": "UG",
    "rw": "RW",
    "cm": "CM",
    "ci": "CI",
    "ml": "ML",
    "bf": "BF",
    "ne": "NE",
    "td": "TD",
    "sd": "SD",
    "ss": "SS",
    "so": "SO",
    "er": "ER",
    "dj": "DJ",
    "mr": "MR",
    "eh": "EH",
  };

  const code = map[normalized];
  if (code) return code;

  // Try matching a country name that appears anywhere in the string.
  for (const [name, code] of Object.entries(map)) {
    if (normalized.includes(name)) return code;
  }

  warn(`Unrecognized country "${candidate}" for record ${record.item_id || record.id || "unknown"}`);
  return null;
}

function deriveTitle(record) {
  return (
    record.title ||
    record.input?.title_hint ||
    record.title_hint ||
    "[sem título]"
  );
}

function deriveRegime(record) {
  let raw =
    record.regime ||
    record.purificacao?.regime_iconocratico ||
    extractRegimeFromInterpretation(record);
  if (!raw) {
    // Records without purification/interpretation are likely not allegorical;
    // classify them explicitly so they don't pollute NÃO CLASSIFICADO.
    const summary = (record.webscout?.summary_evidence || "").toLowerCase();
    if (summary.includes("ausencia alegorica")) return "NÃO ALEGÓRICO";

    // IconoCode sometimes emits "Regime pendente" for items awaiting classification.
    const claims = record.iconocode?.interpretation || [];
    if (claims.some((c) => /regime\s+pendente/i.test(c.claim_text || ""))) {
      return "PENDENTE";
    }

    return "NÃO CLASSIFICADO";
  }

  // Records still awaiting IconoCode classification (raw value itself is a pending marker).
  if (/pendente/i.test(String(raw))) return "PENDENTE";

  const normalized = String(raw)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[.,;]/g, "")
    .replace(/[-\s]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  const map = {
    FUNDACIONAL: "FUNDACIONAL",
    FUNDACIONAL_SACRIFICIAL: "FUNDACIONAL",
    NORMATIVO: "NORMATIVO",
    NORMATIVO_JURIDICO: "NORMATIVO",
    MILITAR: "MILITAR",
    MILITAR_IMPERIAL: "MILITAR",
    CONTRA_ALEGORIA: "CONTRA-ALEGORIA",
    CONTRAALEGORIA: "CONTRA-ALEGORIA",
    CRITICO: "CRÍTICO",
    NAO_ALEGORICO: "NÃO ALEGÓRICO",
    NAOALEGORICO: "NÃO ALEGÓRICO",
    AUSENCIA_ALEGORICA: "NÃO ALEGÓRICO",
  };
  return map[normalized] || "NÃO CLASSIFICADO";
}

function extractRegimeFromInterpretation(record) {
  const claims = record.iconocode?.interpretation || [];
  for (const claim of claims) {
    const text = claim.claim_text || "";
    const match = text.match(/Regime\s+iconocr[áa]tico:\s*([A-Za-zÀ-ÖØ-öø-ÿ\-]+)/i);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

function deriveImagePath(record, projectRoot) {
  const id = deriveId(record);
  const cleanId = String(id).replace(/[^a-zA-Z0-9_-]/g, "_");

  // 1. Prefer a local asset if it exists.
  const localCandidates = [
    path.join(projectRoot, "assets", "corpus", `${cleanId}.jpg`),
    path.join(projectRoot, "assets", "corpus", `${cleanId}.png`),
    path.join(projectRoot, "assets", "corpus", `${cleanId}.jpeg`),
  ];
  for (const candidate of localCandidates) {
    if (fileExists(candidate)) {
      return `assets/corpus/${path.basename(candidate)}`;
    }
  }

  // 2. Fall back to an external source URL.
  const external =
    record.url ||
    record.input?.input_url ||
    record.webscout?.search_results?.[0]?.url ||
    "";
  if (external) return external;

  // 3. Deterministic placeholder.
  return `assets/corpus/placeholder-${cleanId}.jpg`;
}

function deriveArchive(record) {
  return record.archive || record.description || "";
}

function deriveProvenance(record) {
  const evidence = record.webscout?.search_results?.[0];
  return (
    record.provenance ||
    evidence?.notes ||
    record.description ||
    ""
  );
}

function deriveAbnt(record) {
  const citations = record.exports?.abnt_citations || [];
  if (citations.length > 0) return citations[0];
  return record.citation_abnt || "";
}

function deriveSupport(record) {
  const support =
    record.support ||
    record.input?.support ||
    record.medium ||
    record.webscout?.search_results?.[0]?.notes ||
    "";
  if (!support) return "não informado";
  const normalized = String(support).toLowerCase().trim();

  // Normalize common Portuguese/English terms into corpus taxonomy.
  if (/selo|stamp|postage/.test(normalized)) return "selo";
  if (/moeda|coin/.test(normalized)) return "moeda";
  if (/cédula|banknote|paper.?money|note/.test(normalized)) return "papel-moeda";
  if (/gravura|estampa|print|engraving|etching/.test(normalized)) return "estampa/gravura";
  if (/pintura|painting|óleo|oil/.test(normalized)) return "pintura";
  if (/escultura|estátua|monumento|sculpture|statue/.test(normalized)) return "monumento/escultura";
  if (/fotografia|photograph|photo/.test(normalized)) return "fotografia";
  if (/cartaz|poster|affiche/.test(normalized)) return "cartaz";
  if (/frontispício|frontispiece/.test(normalized)) return "frontispício";
  if (/medalha|medal/.test(normalized)) return "medalha";
  if (/cerâmica|ceramic|pottery|porcelain/.test(normalized)) return "cerâmica";
  if (/texto|textual|manuscrito|document/.test(normalized)) return "texto";
  return "não informado";
}

function normalizeIndicators(record) {
  const raw = record.indicadores || record.purificacao;
  if (!raw) {
    return Object.fromEntries(SITE_INDICATOR_KEYS.map((k) => [k, 0]));
  }

  const sourceKeys = Object.keys(raw);
  const longToSite = {
    desincorporacao: "FEI",
    rigidez_postural: "PRI",
    dessexualizacao: "CII",
    uniformizacao_facial: "AUT",
    heraldizacao: "LEG",
    enquadramento_arquitetonico: "JUD",
    apagamento_narrativo: "SEM",
    monocromatizacao: "SEN",
    serialidade: "COM",
    inscricao_estatal: "ABS",
  };

  const alreadySite = sourceKeys.every((k) => SITE_INDICATOR_KEYS.includes(k));
  const result = Object.fromEntries(SITE_INDICATOR_KEYS.map((k) => [k, 0]));

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== "number" && typeof value !== "string") continue;
    const num = Number(value);
    if (!Number.isFinite(num)) continue;
    const target = alreadySite ? key : longToSite[key];
    if (target && result[target] !== undefined) {
      result[target] = num;
    }
  }
  return result;
}

function joinMotifs(list) {
  if (!list || list.length === 0) return "";
  return list.map((m) => m.motif).join("; ");
}

function joinCodes(list) {
  if (!list || list.length === 0) return "";
  return list.map((c) => `${c.notation} ${c.label || ""}`.trim()).join("; ");
}

function joinInterpretations(list) {
  if (!list || list.length === 0) return "";
  return list.map((i) => i.claim_text).join("; ");
}

function normalizePanofsky(record) {
  const pre =
    (record.panofsky && record.panofsky.pre) ||
    record.pre_iconografico ||
    joinMotifs(record.iconocode && record.iconocode.pre_iconographic) ||
    "";
  const icono =
    (record.panofsky && record.panofsky.icono) ||
    record.iconografico ||
    joinCodes(record.iconocode && record.iconocode.codes) ||
    "";
  const iconology =
    (record.panofsky && record.panofsky.iconology) ||
    record.iconologico ||
    joinInterpretations(record.iconocode && record.iconocode.interpretation) ||
    "";
  return { pre, icono, iconology };
}

function normalizeRecord(record) {
  const year = normalizeYear(record.year || record.date_hint || record.input?.date_hint);
  const item = {
    id: deriveId(record),
    title: deriveTitle(record),
    country: deriveCountry(record),
    year,
    regime: deriveRegime(record),
    support: deriveSupport(record),
    img: deriveImagePath(record, PROJECT_ROOT),
    archive: deriveArchive(record),
    indicators: normalizeIndicators(record),
    panofsky: normalizePanofsky(record),
    provenance: deriveProvenance(record),
    abnt: deriveAbnt(record),
  };
  return item;
}

function validateRecords(records, schema, schemaPath) {
  const ajv = loadValidator();
  if (!ajv) {
    warn("Ajv not available; skipping JSON-Schema validation.");
    return;
  }
  // Register sibling schemas referenced via relative $ref. ajv resolves a
  // relative ref against the parent $id and looks it up in its registry — it
  // does not read sibling files from disk. We load them from the schema's own
  // directory and addSchema under the resolved URI.
  const baseId = schema.$id || "";
  const schemaDir = path.dirname(schemaPath);
  for (const ref of collectExternalRefs(schema)) {
    if (/^(https?:|urn:|\/)/.test(ref)) continue; // skip absolute refs
    const siblingPath = path.join(schemaDir, ref);
    if (!fileExists(siblingPath)) {
      warn(`Referenced schema not found on disk: ${ref}`);
      continue;
    }
    try {
      const sibling = readJson(siblingPath);
      const resolvedUri = baseId ? baseId.replace(/[^/]+$/, ref) : ref;
      ajv.addSchema(sibling, resolvedUri);
    } catch (err) {
      warn(`Failed to load referenced schema ${ref}:`, err.message);
    }
  }
  const validate = ajv.compile(schema);
  let failures = 0;
  for (const record of records) {
    const valid = validate(record);
    if (!valid) {
      failures += 1;
      const id = record.item_id || record.id || "unknown";
      warn(`Schema validation failed for record ${id}:`, validate.errors?.map((e) => e.message).join("; "));
    }
  }
  if (failures > 0) {
    warn(`${failures} records failed schema validation; continuing with soft fail.`);
  } else {
    log(`Validated ${records.length} records against schema.`);
  }
}

function mergeSources(records, metaItems) {
  // Load optional id mapping that links UUID item_id to corpus_id.
  const mappingPath = path.join(HUB_ROOT, "data", "processed", "id-mapping.json");
  let mapping = new Map();
  if (fileExists(mappingPath)) {
    try {
      const data = readJson(mappingPath);
      for (const entry of data.mapping || []) {
        if (entry.item_id && entry.corpus_id) {
          mapping.set(entry.item_id, entry.corpus_id);
        }
      }
    } catch (err) {
      warn("Failed to load id-mapping.json:", err.message);
    }
  }

  const recordsByUuid = new Map(records.map((r) => [r.item_id, r]));
  const metaByCorpusId = new Map(metaItems.map((m) => [m.id, m]).filter(([id]) => id));

  const merged = [];

  for (const record of records) {
    const corpusId = mapping.get(record.item_id);
    const meta = corpusId ? metaByCorpusId.get(corpusId) || {} : {};

    const combined = { ...record };
    for (const key of Object.keys(meta)) {
      const value = meta[key];
      if (value !== null && value !== "" && !(Array.isArray(value) && value.length === 0)) {
        combined[key] = value;
      }
    }
    if (corpusId) combined.id = corpusId;
    merged.push(combined);
  }

  // Add any meta items that had no matching record.
  const seenCorpusIds = new Set(merged.map((m) => m.id).filter(Boolean));
  for (const meta of metaItems) {
    if (meta.id && !seenCorpusIds.has(meta.id)) {
      merged.push({ ...meta, id: meta.id });
    }
  }

  return merged;
}

function readCanonicalSources() {
  const hasRecords = fileExists(SOURCES.records);
  const hasMeta = fileExists(SOURCES.corpusMeta);

  if (!hasRecords && !hasMeta) {
    return null;
  }

  const records = hasRecords ? readJsonLines(SOURCES.records) : [];
  const meta = hasMeta ? readJson(SOURCES.corpusMeta) : [];

  if (!Array.isArray(meta)) {
    warn("corpus-data.json is not an array; ignoring metadata source.");
  }

  const merged = mergeSources(records, Array.isArray(meta) ? meta : []);
  return { records: merged, hasRecords, hasMeta };
}

function computeStats(corpus) {
  const byRegime = {};
  const byCountry = {};
  const bySupport = {};
  let yearMin = null;
  let yearMax = null;
  const decadeCounts = {};

  for (const item of corpus) {
    byRegime[item.regime] = (byRegime[item.regime] || 0) + 1;
    byCountry[item.country] = (byCountry[item.country] || 0) + 1;
    bySupport[item.support] = (bySupport[item.support] || 0) + 1;

    if (typeof item.year === "number") {
      if (yearMin === null || item.year < yearMin) yearMin = item.year;
      if (yearMax === null || item.year > yearMax) yearMax = item.year;
      const decade = Math.floor(item.year / 10) * 10;
      decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
    }
  }

  const histogram = Object.entries(decadeCounts)
    .map(([decade, count]) => ({ decade: Number(decade), count }))
    .sort((a, b) => a.decade - b.decade);

  return {
    total: corpus.length,
    byRegime,
    byCountry,
    bySupport,
    byYear: {
      min: yearMin,
      max: yearMax,
      histogram,
    },
  };
}

function fallbackToSeed() {
  if (!fileExists(OUTPUT.seed)) {
    throw new Error(
      `Canonical corpus sources are missing and no seed fallback exists at ${OUTPUT.seed}. ` +
        "Please run from a clone that includes src/data/seed-corpus.json or mount the hub repo."
    );
  }
  warn("Canonical corpus sources missing; falling back to seed-corpus.json.");
  const seed = readJson(OUTPUT.seed);
  if (!Array.isArray(seed)) {
    throw new Error(`Seed fallback ${OUTPUT.seed} must be a JSON array.`);
  }
  return seed;
}

function ensureOutputDir() {
  for (const dir of [path.dirname(OUTPUT.corpus), path.dirname(OUTPUT.stats)]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

function main() {
  log("Starting corpus build...");

  let corpus;
  let sourceInfo = { hasRecords: false, hasMeta: false };

  if (fileExists(SOURCES.records) || fileExists(SOURCES.corpusMeta)) {
    const loaded = readCanonicalSources();
    if (loaded) {
      sourceInfo = loaded;
      const rawRecords = loaded.records;
      log(`Loaded ${rawRecords.length} raw records from canonical sources.`);

      if (fileExists(SOURCES.schema)) {
        try {
          const schema = readJson(SOURCES.schema);
          validateRecords(rawRecords, schema, SOURCES.schema);
        } catch (err) {
          warn("Schema validation error:", err.message);
        }
      } else {
        warn("Schema file not found; skipping validation.");
      }

      corpus = rawRecords.map(normalizeRecord).filter((item) => {
        // Require at least a meaningful title and id.
        if (!item.id || !item.title) {
          warn("Skipping item without id or title.");
          return false;
        }
        return true;
      });
    } else {
      corpus = fallbackToSeed();
    }
  } else {
    corpus = fallbackToSeed();
  }

  const stats = computeStats(corpus);

  ensureOutputDir();
  fs.writeFileSync(OUTPUT.corpus, JSON.stringify(corpus, null, 2));
  fs.writeFileSync(OUTPUT.stats, JSON.stringify(stats, null, 2));

  log(`Wrote ${corpus.length} items to ${path.relative(PROJECT_ROOT, OUTPUT.corpus)}`);
  log(`Wrote stats to ${path.relative(PROJECT_ROOT, OUTPUT.stats)}`);
  log("Build complete.");
}

main();
