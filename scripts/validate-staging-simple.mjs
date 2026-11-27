/**
 * Simple validation of staging data against JSON schemas
 * Uses direct comparison instead of Ajv for simplicity
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

console.log('Validating staging data...\n');

// Load staging data
const stagingDir = resolve(PROJECT_ROOT, 'model/staging');

const objects = JSON.parse(readFileSync(resolve(stagingDir, 'objects.json'), 'utf-8'));
const images = JSON.parse(readFileSync(resolve(stagingDir, 'images.json'), 'utf-8'));
const sources = JSON.parse(readFileSync(resolve(stagingDir, 'sources.json'), 'utf-8'));
const claims = JSON.parse(readFileSync(resolve(stagingDir, 'claims.json'), 'utf-8'));
const constellations = JSON.parse(readFileSync(resolve(stagingDir, 'constellations.json'), 'utf-8'));

console.log('Staging data loaded:');
console.log(`  Objects: ${objects.length}`);
console.log(`  Images: ${images.length}`);
console.log(`  Sources: ${sources.length}`);
console.log(`  Claims: ${claims.length}`);
console.log(`  Constellations: ${constellations.length}`);

// Check basic structure
console.log('\nBasic structure validation:');

let missingRequired = false;

function reportRequired(label, found, total) {
  console.log(`  ${label} with required fields: ${found}/${total}`);
  if (found !== total) missingRequired = true;
}

// Objects store country under place, matching model/schemas/object.json.
const objectsWithRequired = objects.filter(o =>
  o.id && o.title && o.support && o.date_text && o.place?.country_pt && o.place?.country_code && o.observed_description
).length;
reportRequired('Objects', objectsWithRequired, objects.length);

// Images
const imagesWithRequired = images.filter(i =>
  i.id && i.object_id && i.source_url && i.rights_status && i.alt_text
).length;
reportRequired('Images', imagesWithRequired, images.length);

// Sources
const sourcesWithRequired = sources.filter(s =>
  s.id && s.source_type && s.title && s.date && s.verification
).length;
reportRequired('Sources', sourcesWithRequired, sources.length);

// Claims
const claimsWithRequired = claims.filter(c =>
  c.id && c.statement && c.epistemic_status && c.review_state && c.about && c.concepts
).length;
reportRequired('Claims', claimsWithRequired, claims.length);

// Constellations
const constellationsWithRequired = constellations.filter(c =>
  c.slug && c.title && c.question && c.members && c.editorial_status
).length;
reportRequired('Constellations', constellationsWithRequired, constellations.length);

// Check for legacy metadata
console.log('\nLegacy metadata check:');
const objectsWithCodedBy = objects.filter(o => o.coded_by).length;
console.log(`  Objects with coded_by: ${objectsWithCodedBy} (should be 0)`);

const claimsWithCodedBy = claims.filter(c => c.coded_by).length;
console.log(`  Claims with coded_by: ${claimsWithCodedBy} (should be 0)`);

// Check for review states
console.log('\nClaim review states:');
const claimStates = {};
claims.forEach(c => {
  claimStates[c.review_state] = (claimStates[c.review_state] || 0) + 1;
});
for (const [state, count] of Object.entries(claimStates)) {
  console.log(`  ${state}: ${count}`);
}

// Check for epistemic states
console.log('\nClaim epistemic states:');
const epistemicStates = {};
claims.forEach(c => {
  epistemicStates[c.epistemic_status] = (epistemicStates[c.epistemic_status] || 0) + 1;
});
for (const [state, count] of Object.entries(epistemicStates)) {
  console.log(`  ${state}: ${count}`);
}

// Check for strands
console.log('\nObject strands:');
const strandCounts = {};
objects.forEach(o => {
  (o.strands || []).forEach(s => {
    strandCounts[s] = (strandCounts[s] || 0) + 1;
  });
});
for (const [strand, count] of Object.entries(strandCounts)) {
  console.log(`  ${strand}: ${count}`);
}

// Sample object
console.log('\nSample object:');
console.log(JSON.stringify(objects[0], null, 2).substring(0, 500) + '...');

// Sample claim
console.log('\nSample claim:');
console.log(JSON.stringify(claims[0], null, 2).substring(0, 500) + '...');

if (missingRequired) {
  console.error('\nValidation failed: one or more records are missing required fields.');
  process.exit(1);
}

console.log('\n✓ Validation complete!');
