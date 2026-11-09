/**
 * ICONOCRACIA Corpus Converter - Phase 2
 * Non-destructive converter that splits corpus-data-enriched.json into:
 * - Object records (documentary catalog fields)
 * - Image records (image metadata)
 * - Source records (bibliographic sources)
 * - Claim records (interpretive layers)
 * 
 * Outputs to model/staging/ without modifying site/data/
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

// Configuration
const INPUT_FILE = resolve(PROJECT_ROOT, 'site/data/corpus-data-enriched.json');
const ACERVO_FILE = resolve(PROJECT_ROOT, 'site/data/acervo.json');
const CONSTELLATIONS_FILE = resolve(PROJECT_ROOT, 'site/data/constellations.json');
const OUTPUT_DIR = resolve(PROJECT_ROOT, 'model/staging');
const AUDIT_FILE = resolve(PROJECT_ROOT, 'model/staging/audit-report.json');

// Ensure output directory exists
mkdirSync(OUTPUT_DIR, { recursive: true });

/**
 * Generate a unique ID for claims
 */
function generateClaimId(objectId, index, prefix = 'CLAIM') {
  return `${prefix}-${objectId}-${String(index).padStart(3, '0')}`;
}

/**
 * Generate a unique ID for sources
 */
function generateSourceId(citation, index) {
  // Create a hash from the citation
  let hash = 0;
  for (let i = 0; i < citation.length; i++) {
    hash = (hash << 5) - hash + citation.charCodeAt(i);
    hash |= 0;
  }
  return `SRC-${Math.abs(hash).toString(36).substring(0, 8)}-${index}`;
}

/**
 * Map legacy regime to standard values
 */
function mapRegime(legacyRegime) {
  const regimeMap = {
    'FUNDACIONAL': 'fundacional',
    'NORMATIVO': 'normativo',
    'MILITAR': 'militar',
    'CONTRA-ALEGORIA': 'contra-alegoria'
  };
  return regimeMap[legacyRegime] || legacyRegime?.toLowerCase() || null;
}

/**
 * Map country names to codes
 */
const COUNTRY_CODES = {
  'Argentina': 'AR',
  'Áustria': 'AT',
  'Austrália': 'AU',
  'Bélgica': 'BE',
  'Brasil': 'BR',
  'Canadá': 'CA',
  'Chile': 'CL',
  'Colômbia': 'CO',
  'Costa Rica': 'CR',
  'Cuba': 'CU',
  'República Tcheca': 'CZ',
  'Dinamarca': 'DK',
  'Equador': 'EC',
  'Espanha': 'ES',
  'Estados Unidos': 'US',
  'Finlândia': 'FI',
  'França': 'FR',
  'Alemanha': 'DE',
  'Grécia': 'GR',
  'Haiti': 'HT',
  'Honduras': 'HN',
  'Hungria': 'HU',
  'Itália': 'IT',
  'Japão': 'JP',
  'México': 'MX',
  'Holanda': 'NL',
  'Paraguai': 'PY',
  'Peru': 'PE',
  'Polônia': 'PL',
  'Portugal': 'PT',
  'Reino Unido': 'GB',
  'Romênia': 'RO',
  'Rússia': 'RU',
  'Suécia': 'SE',
  'Suíça': 'CH',
  'Uruguai': 'UY',
  'Venezuela': 'VE'
};

/**
 * Map support/medium to standardized values
 */
function mapSupport(legacySupport) {
  const supportMap = {
    'selo': 'selo',
    'papel-moeda': 'papel-moeda',
    'moeda': 'moeda',
    'medalha': 'medalha',
    'monumento': 'monumento',
    'escultura': 'escultura',
    'pintura': 'pintura',
    'gravura': 'gravura',
    'litografia': 'litografia',
    'cartaz': 'cartaz',
    'fotografia': 'fotografia',
    'documento': 'documento-juridico',
    'documento jurídico': 'documento-juridico'
  };
  return supportMap[legacySupport?.toLowerCase()] || legacySupport?.toLowerCase() || 'outro';
}

/**
 * Extract motifs from various fields
 */
function extractMotifs(item) {
  const motifs = [];
  
  // From motif array
  if (Array.isArray(item.motif)) {
    motifs.push(...item.motif);
  }
  
  // From motif_str
  if (item.motif_str) {
    const strMotifs = item.motif_str.split(',').map(m => m.trim());
    motifs.push(...strMotifs);
  }
  
  // From tags
  if (Array.isArray(item.tags)) {
    motifs.push(...item.tags);
  }
  
  // From tags_str
  if (item.tags_str) {
    const strTags = item.tags_str.split(',').map(t => t.trim());
    motifs.push(...strTags);
  }
  
  // Deduplicate and filter
  return [...new Set(motifs.filter(m => m && m !== 'null' && m !== 'undefined'))];
}

/**
 * Parse date text to extract year range
 */
function parseDateRange(dateText, fallbackYear = null) {
  if (!dateText) return { start: null, end: null, text: dateText || '' };
  
  // Try to extract years
  const years = dateText.match(/\d{4}/g);
  if (years && years.length >= 2) {
    return {
      start: parseInt(years[0]),
      end: parseInt(years[years.length - 1]),
      text: dateText
    };
  } else if (years && years.length === 1) {
    return {
      start: parseInt(years[0]),
      end: parseInt(years[0]),
      text: dateText
    };
  }
  
  // Try fallback year
  // Note: item is not available here, we need to handle it differently
  // For now, just return null for start/end
  return { start: null, end: null, text: dateText };
  
  return { start: null, end: null, text: dateText };
}

/**
 * Extract standard Iconclass codes from motifs
 */
function extractIconclassCodes(motifs) {
  const iconclassMap = {
    'female': '31AA',
    'woman': '31AA',
    'figura feminina': '31AA',
    'female figure': '31AA',
    'justice': '44G0',
    'allegory': '44G0',
    'jury': '44G0',
    'law': '44B',
    'state': '44B',
    'sovereignty': '44B',
    'ruler': '44B',
    'sculpture': '48C24',
    'statue': '48C24',
    'coin': '48C24',
    'medal': '48C24',
    'engraving': '48C24'
  };
  
  const codes = [];
  for (const motif of motifs) {
    const normalized = motif.toLowerCase();
    for (const [key, code] of Object.entries(iconclassMap)) {
      if (normalized.includes(key)) {
        if (!codes.some(c => c.code === code)) {
          codes.push({ code, label: motif, axis_role: 'other' });
        }
        break;
      }
    }
  }
  
  return codes;
}

/**
 * Process the corpus data
 */
async function convertCorpus() {
  console.log('Starting ICONOCRACIA corpus conversion...');
  console.log('Input:', INPUT_FILE);
  console.log('Output:', OUTPUT_DIR);
  
  // Load input files
  console.log('\nLoading corpus data...');
  const corpusData = JSON.parse(readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`Loaded ${corpusData.length} records from corpus-data-enriched.json`);
  
  const acervoData = JSON.parse(readFileSync(ACERVO_FILE, 'utf-8'));
  console.log(`Loaded ${acervoData.length} records from acervo.json`);
  
  const constellationsData = JSON.parse(readFileSync(CONSTELLATIONS_FILE, 'utf-8'));
  console.log(`Loaded ${constellationsData.length} constellations`);
  
  // Initialize output arrays
  const objects = [];
  const images = [];
  const sources = [];
  const claims = [];
  const sourceMap = new Map(); // To deduplicate sources
  
  // Track statistics
  const stats = {
    totalProcessed: 0,
    objectsCreated: 0,
    imagesCreated: 0,
    sourcesCreated: 0,
    claimsExtracted: 0,
    legacyMetadataStripped: {
      coded_by: 0,
      regime_justificativa: 0,
      interpretations: 0
    }
  };
  
  // Process each item
  console.log('\nProcessing records...');
  for (const item of corpusData) {
    stats.totalProcessed++;
    
    // ====================
    // 1. Create Object record
    // ====================
    const objectId = item.id;
    const dateInfo = parseDateRange(item.date, item.year);
    const countryCode = COUNTRY_CODES[item.country] || COUNTRY_CODES[item.country_pt] || 'XX';
    const support = mapSupport(item.support || item.medium || item.medium_norm);
    const motifs = extractMotifs(item);
    const iconclassCodes = extractIconclassCodes(motifs);
    
    const object = {
      id: objectId,
      title: item.title || `Untitled ${objectId}`,
      display_title: item.title, // Can be overridden later
      support,
      object_type: support,
      date_text: item.date || String(item.year || ''),
      date_start: dateInfo.start,
      date_end: dateInfo.end,
      date_basis: null, // To be populated from sources
      makers: [],
      place: {
        country_code: countryCode,
        country_pt: item.country_pt || item.country || 'Desconhecido',
        city: null,
        jurisdiction: null,
        attribution_basis: null
      },
      holding: {
        institution_id: null,
        institution_name: null,
        accession_number: null,
        catalogue_url: item.url || null
      },
      observed_description: item.description || '',
      observed_motifs: motifs,
      standard_cataloging: {
        iconclass_codes: iconclassCodes.length > 0 ? iconclassCodes : [{ code: '0000', label: 'Unclassified', axis_role: 'other' }]
      },
      images: [],
      sources: [],
      strands: ['atlas-global'],
      editorial_status: 'draft',
      rights_status: 'unknown',
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Add to strands if it's in the thesis scope
    if (countryCode === 'BR' && object.date_start >= 1822 && object.date_start <= 1922) {
      object.strands.push('brasil-1822-1922');
    }
    
    objects.push(object);
    stats.objectsCreated++;
    
    // ====================
    // 2. Create Image records
    // ====================
    if (item.thumbnail_url || item.url_image_download || item.local_image_path) {
      const imageId = `${objectId}-main`;
      const image = {
        id: imageId,
        object_id: objectId,
        file: item.local_image_path || null,
        sha256: null, // To be computed later
        file_size_bytes: null,
        width_px: null,
        height_px: null,
        format: 'jpg', // Default, can be updated
        source_url: item.url_image_download || item.thumbnail_url || item.url || null,
        iiif_manifest: item.iiif_source || null,
        iiif_service: item.iiif_source || null,
        license: 'unknown',
        rights_status: 'link_only', // Default to link_only for safety
        rights_evidence_url: null,
        credit: null,
        credit_url: null,
        alt_text: `Image of ${item.title || objectId}`,
        caption: null,
        view: 'full',
        is_primary: true,
        sequence: 0,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      images.push(image);
      stats.imagesCreated++;
      
      // Reference the image from the object
      object.images.push(imageId);
    }
    
    // ====================
    // 3. Create Source record
    // ====================
    if (item.citation_abnt && item.citation_abnt !== item.title) {
      // Check if we already have this source
      let sourceKey = item.citation_abnt;
      if (!sourceMap.has(sourceKey)) {
        const sourceId = generateSourceId(item.citation_abnt, sourceMap.size);
        const source = {
          id: sourceId,
          source_type: 'catalogue_record', // Default, can be refined
          authors: [],
          institutional_author: null,
          title: item.citation_abnt,
          subtitle: null,
          edition: null,
          place: null,
          publisher: null,
          date: item.date || String(item.year || ''),
          date_year: item.year || null,
          periodical: null,
          volume: null,
          number: null,
          pages: null,
          e_locator: null,
          doi: null,
          url: item.url || null,
          accessed_on: null,
          isbn: null,
          issn: null,
          repository: null,
          fonds: null,
          call_number: null,
          court: null,
          case_number: null,
          relator: null,
          judged_on: null,
          legislation_type: null,
          legislation_number: null,
          legislation_date: null,
          citation_abnt: item.citation_abnt,
          citation_abnt_generated: false,
          verification: 'unverified',
          verification_note: 'Legacy citation from corpus-data-enriched.json',
          language: 'pt-BR',
          abstract: null,
          keywords: [],
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        sources.push(source);
        sourceMap.set(sourceKey, sourceId);
        stats.sourcesCreated++;
        
        // Reference the source from the object
        object.sources.push({
          source_id: sourceId,
          field_supported: 'all'
        });
      } else {
        const existingSourceId = sourceMap.get(sourceKey);
        object.sources.push({
          source_id: existingSourceId,
          field_supported: 'all'
        });
      }
    } else {
      // Flag for audit
      stats.legacyMetadataStripped.coded_by++;
    }
    
    // ====================
    // 4. Extract Claim records from interpretive fields
    // ====================
    const panofsky = item.iconographic_metadata?.panofsky;
    if (panofsky?.interpretation) {
      for (let i = 0; i < panofsky.interpretation.length; i++) {
        const interp = panofsky.interpretation[i];
        
        // Skip machine-generated confidence scores
        if (interp.confidence !== undefined) {
          stats.legacyMetadataStripped.interpretations++;
        }
        
        const claimId = generateClaimId(objectId, i);
        const claim = {
          id: claimId,
          statement: interp.claim_text,
          statement_pt: interp.claim_text, // Same for now
          epistemic_status: mapEpistemicStatus(interp.status),
          review_state: mapReviewState(interp.status),
          about: [objectId],
          deconstructs_iconclass: mapIconclassDeconstruction(interp.claim_type),
          matrix_triad_dimension: mapMatrixDimension(interp.claim_type),
          evidence: [],
          concepts: [],
          counter_evidence: [],
          open_questions: null,
          supersedes: null,
          superseded_by: [],
          related_claims: [],
          strands: ['atlas-global'],
          author_notes: `Extracted from panofsky.interpretation. Original type: ${interp.claim_type}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        claims.push(claim);
        stats.claimsExtracted++;
      }
    }
    
    // Extract claims from regime_justificativa
    if (item.regime_justificativa) {
      const regimeClaimId = generateClaimId(objectId, 100, 'REGIME');
      const regimeClaim = {
        id: regimeClaimId,
        statement: `Regime iconocrático justificado: ${item.regime_justificativa}`,
        epistemic_status: 'hypothesis',
        review_state: 'draft',
        about: [objectId],
        deconstructs_iconclass: null,
        matrix_triad_dimension: null,
        evidence: [],
        concepts: [],
        counter_evidence: [],
        open_questions: 'Regime classification needs editorial review',
        strands: ['atlas-global'],
        author_notes: 'Extracted from regime_justificativa field. Legacy pipeline metadata.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      claims.push(regimeClaim);
      stats.claimsExtracted++;
      stats.legacyMetadataStripped.regime_justificativa++;
    }
  }
  
  // ====================
  // 5. Process acervo.json
  // ====================
  console.log('\nProcessing acervo.json...');
  for (const acervoItem of acervoData) {
    // Check if this object already exists in corpus
    const existingObject = objects.find(o => o.id === acervoItem.id);
    if (!existingObject) {
      // Create a new object from acervo
      const object = {
        id: acervoItem.id,
        title: acervoItem.titulo,
        display_title: acervoItem.titulo,
        support: mapSupport(acervoItem.suporte),
        object_type: mapSupport(acervoItem.suporte),
        date_text: acervoItem.data || '',
        date_start: acervoItem.data ? parseInt(acervoItem.data.split('-')[0]) : null,
        date_end: acervoItem.data ? parseInt(acervoItem.data.split('-').pop()) : null,
        date_basis: null,
        makers: [],
        place: {
          country_code: COUNTRY_CODES[acervoItem.pais] || 'BR',
          country_pt: acervoItem.pais,
          city: null,
          jurisdiction: null,
          attribution_basis: null
        },
        holding: {
          institution_id: null,
          institution_name: acervoItem.instituicao,
          accession_number: null,
          catalogue_url: acervoItem.fonte_url || null
        },
        observed_description: acervoItem.descricao || '',
        observed_motifs: Array.isArray(acervoItem.motivos) ? acervoItem.motivos : [],
        standard_cataloging: {
          iconclass_codes: []
        },
        images: [],
        sources: [],
        strands: ['atlas-global'],
        editorial_status: 'published', // Acervo items are curated
        rights_status: 'unknown',
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Add to strands if Brazil 1822-1922
      if (object.place.country_code === 'BR' && object.date_start >= 1822 && object.date_start <= 1922) {
        object.strands.push('brasil-1822-1922');
      }
      
      objects.push(object);
      stats.objectsCreated++;
    }
  }
  
  // ====================
  // 6. Process constellations
  // ====================
  console.log('Processing constellations...');
  const processedConstellations = [];
  for (const constell of constellationsData) {
    const processed = {
      slug: constell.slug,
      title: constell.title,
      subtitle: constell.subtitle || null,
      question: null, // To be added later
      ghosted_formula: null,
      members: constell.cards ? constell.cards.map((card, index) => ({
        object_id: card.id || card.objectId || `constell-${constell.slug}-${index}`,
        role_label: card.role || 'member',
        caption: card.caption || null,
        alt_override: null,
        position: null
      })) : [],
      links: [],
      reading_claims: [],
      method_note: constell.method_note || 'Constellation from legacy data. Method note to be added.',
      editorial_status: 'draft',
      concepts: [],
      strands: ['atlas-global'],
      tags: [],
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Add item_ids as members if cards not present
    if (constell.item_ids && processed.members.length === 0) {
      processed.members = constell.item_ids.map((id, index) => ({
        object_id: id,
        role_label: 'member',
        caption: null,
        alt_override: null,
        position: null
      }));
    }
    
    processedConstellations.push(processed);
  }
  
  // ====================
  // 7. Write output files
  // ====================
  console.log('\nWriting output files...');
  
  writeFileSync(resolve(OUTPUT_DIR, 'objects.json'), JSON.stringify(objects, null, 2));
  console.log(`  Written ${objects.length} objects`);
  
  writeFileSync(resolve(OUTPUT_DIR, 'images.json'), JSON.stringify(images, null, 2));
  console.log(`  Written ${images.length} images`);
  
  writeFileSync(resolve(OUTPUT_DIR, 'sources.json'), JSON.stringify(sources, null, 2));
  console.log(`  Written ${sources.length} sources`);
  
  writeFileSync(resolve(OUTPUT_DIR, 'claims.json'), JSON.stringify(claims, null, 2));
  console.log(`  Written ${claims.length} claims`);
  
  writeFileSync(resolve(OUTPUT_DIR, 'constellations.json'), JSON.stringify(processedConstellations, null, 2));
  console.log(`  Written ${processedConstellations.length} constellations`);
  
  // ====================
  // 8. Generate audit report
  // ====================
  console.log('\nGenerating audit report...');
  
  const auditReport = {
    metadata: {
      generated_at: new Date().toISOString(),
      converter_version: '1.0.0',
      input_file: INPUT_FILE,
      input_records: corpusData.length,
      acervo_records: acervoData.length,
      constellations_records: constellationsData.length
    },
    statistics: {
      objects_created: stats.objectsCreated,
      images_created: stats.imagesCreated,
      sources_created: stats.sourcesCreated,
      claims_extracted: stats.claimsExtracted,
      constellations_processed: processedConstellations.length,
      legacy_metadata_stripped: stats.legacyMetadataStripped
    },
    validation: {
      all_object_ids_unique: checkUniqueIds(objects, 'id'),
      all_image_ids_unique: checkUniqueIds(images, 'id'),
      all_source_ids_unique: checkUniqueIds(sources, 'id'),
      all_claim_ids_unique: checkUniqueIds(claims, 'id'),
      all_constellation_slugs_unique: checkUniqueIds(processedConstellations, 'slug')
    },
    issues: [],
    recommendations: []
  };
  
  // Add recommendations
  if (stats.legacyMetadataStripped.coded_by > 0) {
    auditReport.recommendations.push(
      `Found ${stats.legacyMetadataStripped.coded_by} records with legacy coded_by metadata that was stripped. ` +
      'All claim authorship is now unified under project editorial gate.'
    );
  }
  
  if (stats.legacyMetadataStripped.regime_justificativa > 0) {
    auditReport.recommendations.push(
      `Found ${stats.legacyMetadataStripped.regime_justificativa} regime_justificativa entries extracted as claims with review_state='draft'. ` +
      'These need editorial review before approval.'
    );
  }
  
  if (stats.legacyMetadataStripped.interpretations > 0) {
    auditReport.recommendations.push(
      `Found ${stats.legacyMetadataStripped.interpretations} panofsky.interpretation entries. ` +
      'These were extracted as claims but may contain machine-generated content that needs review.'
    );
  }
  
  writeFileSync(AUDIT_FILE, JSON.stringify(auditReport, null, 2));
  console.log(`  Written audit report`);
  
  // ====================
  // 9. Print summary
  // ====================
  console.log('\n' + '='.repeat(60));
  console.log('CONVERSION COMPLETE');
  console.log('='.repeat(60));
  console.log(`Objects:   ${objects.length}`);
  console.log(`Images:    ${images.length}`);
  console.log(`Sources:   ${sources.length}`);
  console.log(`Claims:    ${claims.length}`);
  console.log(`Constellations: ${processedConstellations.length}`);
  console.log(`\nLegacy metadata stripped:`);
  console.log(`  coded_by: ${stats.legacyMetadataStripped.coded_by}`);
  console.log(`  regime_justificativa: ${stats.legacyMetadataStripped.regime_justificativa}`);
  console.log(`  interpretations: ${stats.legacyMetadataStripped.interpretations}`);
  console.log('\nOutput directory:', OUTPUT_DIR);
  console.log('Audit report:', AUDIT_FILE);
}

// Helper functions
function mapEpistemicStatus(legacyStatus) {
  const statusMap = {
    'supported': 'documented',
    'verified': 'documented',
    'confirmed': 'documented',
    'tentative': 'hypothesis',
    'hypothetical': 'hypothesis',
    'unsupported': 'hypothesis'
  };
  return statusMap[legacyStatus?.toLowerCase()] || 'hypothesis';
}

function mapReviewState(legacyStatus) {
  const statusMap = {
    'supported': 'reviewed',
    'verified': 'approved',
    'confirmed': 'approved',
    'tentative': 'draft',
    'hypothetical': 'draft',
    'unsupported': 'draft'
  };
  return statusMap[legacyStatus?.toLowerCase()] || 'draft';
}

function mapIconclassDeconstruction(claimType) {
  const typeMap = {
    'iconographic': { iconclass_code: '31AA', counter_code: '31AA::CSV', critical_label: 'Contrato Sexual Visual' },
    'legal_context': { iconclass_code: '44G0', counter_code: '44G0::FE', critical_label: 'Feminilidade de Estado' },
    'postcolonial_marker': { iconclass_code: '48C24', counter_code: '48C24::PC', critical_label: 'Purificação Clássica' },
    'racial_contract': { iconclass_code: '44B', counter_code: '44B::CRV', critical_label: 'Contrato Racial Visual' }
  };
  return typeMap[claimType] || null;
}

function mapMatrixDimension(claimType) {
  const typeMap = {
    'legal_context': 'hystera_tutelage',
    'iconographic': 'numismatic_die_matriz',
    'postcolonial_marker': 'digital_grid_matrix'
  };
  return typeMap[claimType] || null;
}

function checkUniqueIds(items, idField) {
  const ids = items.map(item => item[idField]);
  return new Set(ids).size === ids.length;
}

// Run the conversion
convertCorpus().catch(err => {
  console.error('Error during conversion:', err);
  process.exit(1);
});
