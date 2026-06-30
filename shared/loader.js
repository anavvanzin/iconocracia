// shared/loader.js
// Single source of truth: data/corpus.jsonld
// Projects to two legacy shapes (window.AtlasData and window.ATLAS_LAB)
// and one new shape (window.IconocraciaCorpus) for the canvas/ surface.
//
// Usage: <script src="../shared/loader.js"></script>
//        IconocraciaCorpus.load('../data/corpus.jsonld').then(() => render());

(function (global) {
  'use strict';

  function stripPrefix(uri, prefix) {
    if (typeof uri !== 'string') return uri;
    if (uri.startsWith(prefix)) return uri.slice(prefix.length);
    return uri;
  }

  function unwrapId(id) {
    return stripPrefix(id, 'ico:specimen/');
  }

  function unwrapRegime(r) {
    return stripPrefix(r, 'ico:regime/');
  }

  function unwrapCountry(c) {
    return stripPrefix(c, 'ico:country/');
  }

  function unwrapPath(p) {
    return stripPrefix(stripPrefix(p, 'ico:'), 'pathosformel/');
  }

  function asArray(x) {
    if (x == null) return [];
    return Array.isArray(x) ? x : [x];
  }

  function hasType(node, t) {
    return asArray(node.type || node['@type']).includes(t);
  }

  // -------------------------------------------------------------------
  // Parse the JSON-LD document into a typed in-memory model
  // -------------------------------------------------------------------
  function parse(doc) {
    const graph = doc.graph || doc['@graph'] || [];

    const specimens = [];
    const pathosformeln = [];
    const edges = [];
    const concepts = {};

    for (const node of graph) {
      if (hasType(node, 'ico:AllegoricalSpecimen')) {
        specimens.push(node);
      } else if (hasType(node, 'ico:Pathosformel')) {
        pathosformeln.push(node);
        concepts[node.id || node['@id']] = node;
      } else if (hasType(node, 'ico:NachlebenEdge')) {
        edges.push(node);
      } else if (hasType(node, 'skos:Concept') || hasType(node, 'skos:ConceptScheme')) {
        concepts[node.id || node['@id']] = node;
      }
    }

    return { meta: doc, specimens, pathosformeln, edges, concepts };
  }

  // -------------------------------------------------------------------
  // Legacy shape A — atlas/data.js (window.AtlasData.corpus)
  // -------------------------------------------------------------------
  function projectLegacyAtlas(model) {
    return model.specimens.map((s) => ({
      id: unwrapId(s.id || s['@id']),
      title: s.title || s['dc:title'],
      country: unwrapCountry(s.country),
      year: s.year,
      regime: unwrapRegime(s.regime),
      support: s.support,
      img: '../' + s.image,
      // new fields available transparently
      pathosformel: unwrapPath(s.instantiatesPathosformel),
      creator: s.creator,
      archive: s.archive,
    }));
  }

  // -------------------------------------------------------------------
  // Legacy shape B — atlas-lab/data.js (ICONOCRACY_DEMO_ENTRIES)
  // -------------------------------------------------------------------
  function projectLegacyLab(model) {
    // Map our 4 pathosformel-regimes to the 3-regime legacy lab axis
    const regimeMap = {
      FUNDACIONAL: '1',
      NORMATIVO: '2',
      MILITAR: '3',
      CONTRA_ALEGORIA: '2', // fold contra into normativo for legacy 3-axis
    };
    return model.specimens.map((s) => {
      const indicators = (s.iconometricScore && s.iconometricScore.indicators) || null;
      return {
        id: unwrapId(s.id || s['@id']),
        canonicalSource: { type: 'jsonld-corpus', key: unwrapId(s.id || s['@id']) },
        title: s.title || s['dc:title'],
        date: String(s.year || ''),
        country: unwrapCountry(s.country),
        medium: s.support,
        archive: s.archive,
        regime: regimeMap[unwrapRegime(s.regime)] || '2',
        img: '../' + s.image,
        panelIds: [], // populated later by panel mapper if needed
        note: s.creator ? `Atribuída a ${s.creator}.` : '',
        indicators: indicators || { FEI: 0, CII: 0, PRI: 0, SMI: 0, SMS: 0, AMCP: 0, MVI: 0, WI: 0, RI: 0, AI: 0 },
        pathosformel: unwrapPath(s.instantiatesPathosformel),
      };
    });
  }

  // -------------------------------------------------------------------
  // New shape — canvas/ topological surface
  // -------------------------------------------------------------------
  function projectCanvas(model) {
    const pIndex = {};
    for (const p of model.pathosformeln) {
      pIndex[p.id || p['@id']] = p;
    }

    const nodes = model.specimens.map((s) => {
      const path = s.instantiatesPathosformel;
      const xy = computeXY(s, pIndex);
      return {
        id: unwrapId(s.id || s['@id']),
        title: s.title || s['dc:title'],
        year: typeof s.year === 'number' ? s.year : null,
        country: unwrapCountry(s.country),
        regime: unwrapRegime(s.regime),
        support: s.support,
        img: s.image,
        creator: s.creator,
        archive: s.archive,
        pathosformel: unwrapPath(path),
        pathosLabel: pIndex[path] ? pIndex[path].label : unwrapPath(path),
        gestural: (s.gesturalEnergy && s.gesturalEnergy.value) || 0,
        postural: (s.posturalTension && s.posturalTension.value) || 0,
        objectLoad: (s.objectSymbolicLoad && s.objectSymbolicLoad.value) || 0,
        x: xy.x,
        y: xy.y,
      };
    });

    const edges = model.edges.map((e) => ({
      source: unwrapId(e.source),
      target: unwrapId(e.target),
      relation: stripPrefix(e.relation, 'ico:'),
    }));

    return { nodes, edges, pathosformeln: model.pathosformeln };
  }

  // -------------------------------------------------------------------
  // Precomputed XY: cluster centroids per pathosformel + bearing
  // -------------------------------------------------------------------
  const CLUSTER_CENTROIDS = {
    'ico:libertasArmata':   { cx: -0.7, cy:  0.7 },  // upper-left  (insurgent)
    'ico:respublicaCoroada':{ cx:  0.0, cy:  0.4 },  // upper-center (legitimacy)
    'ico:justitiaSerena':   { cx:  0.7, cy:  0.4 },  // upper-right (juridical)
    'ico:matriaDomestica':  { cx:  0.4, cy: -0.4 },  // lower-right (domestic)
    'ico:imperiumFeminae':  { cx: -0.4, cy: -0.4 },  // lower-left  (imperial)
    'ico:contraAlegoria':   { cx:  0.0, cy: -0.8 },  // bottom      (fracture)
  };

  function computeXY(s, pIndex) {
    const cluster = CLUSTER_CENTROIDS[s.instantiatesPathosformel] || { cx: 0, cy: 0 };
    const axis = (s.posturalTension && s.posturalTension.axis) || [0, 0];
    const ax = axis[0] || 0;
    const ay = axis[1] || 0;
    // Stable jitter via simple hash of specimen ID
    const idStr = s.id || s['@id'] || '';
    let h = 0;
    for (let i = 0; i < idStr.length; i++) h = ((h << 5) - h) + idStr.charCodeAt(i);
    const jx = ((h & 0xffff) / 0xffff - 0.5) * 0.12;
    const jy = (((h >> 16) & 0xffff) / 0xffff - 0.5) * 0.12;
    // Year drives subtle radial drift
    const year = typeof s.year === 'number' ? s.year : 1900;
    const radial = Math.min(1, Math.max(0, (year - 1750) / 250));
    return {
      x: cluster.cx + ax * 0.18 + jx + (radial - 0.5) * 0.04,
      y: cluster.cy + ay * 0.18 + jy + (radial - 0.5) * 0.04,
    };
  }

  // -------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------
  const IconocraciaCorpus = {
    model: null,
    legacyAtlas: null,
    legacyLab: null,
    canvas: null,

    async load(url) {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load ' + url + ' (' + res.status + ')');
      const doc = await res.json();
      this.hydrate(doc);
      return this;
    },

    hydrate(doc) {
      this.model = parse(doc);
      this.legacyAtlas = projectLegacyAtlas(this.model);
      this.legacyLab = projectLegacyLab(this.model);
      this.canvas = projectCanvas(this.model);
      return this;
    },

    byId(id) {
      return this.model.specimens.find((s) => unwrapId(s.id || s['@id']) === id) || null;
    },

    byPathosformel(pid) {
      const fullId = pid.startsWith('ico:') ? pid : 'ico:' + pid;
      return this.model.specimens.filter((s) => s.instantiatesPathosformel === fullId);
    },

    edgesFor(id) {
      return this.model.edges.filter((e) => unwrapId(e.source) === id || unwrapId(e.target) === id);
    },
  };

  global.IconocraciaCorpus = IconocraciaCorpus;
})(typeof window !== 'undefined' ? window : globalThis);
