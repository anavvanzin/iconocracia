/**
 * Apply Iconclass codes to objects based on motif mapping
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

console.log('Applying Iconclass codes to objects...\n');

// Load objects
const objectsFile = resolve(PROJECT_ROOT, 'model/staging/objects.json');
const objects = JSON.parse(readFileSync(objectsFile, 'utf-8'));

// Load Iconclass mapping
const mappingFile = resolve(PROJECT_ROOT, 'model/iconclass-mapping.json');
const mapping = JSON.parse(readFileSync(mappingFile, 'utf-8'));
const { motif_to_iconclass, iconclass_axis_roles } = mapping;

// Stats
let totalUpdated = 0;
let totalUnclassified = 0;
let totalMulti = 0;

// Process each object
for (const obj of objects) {
  const motifs = obj.observed_motifs || [];
  const codes = new Map(); // Use Map to deduplicate
  
  // Find matching Iconclass codes for each motif
  for (const motif of motifs) {
    const normalized = motif.toLowerCase().trim();
    
    // Direct match
    if (motif_to_iconclass[normalized]) {
      codes.set(motif_to_iconclass[normalized], {
        code: motif_to_iconclass[normalized],
        label: motif,
        axis_role: iconclass_axis_roles[motif_to_iconclass[normalized]] || 'other'
      });
    }
    
    // Try partial matches (for compound motifs like "balança e espada")
    for (const [motifKey, iconclass] of Object.entries(motif_to_iconclass)) {
      if (normalized.includes(motifKey)) {
        codes.set(iconclass, {
          code: iconclass,
          label: motif,
          axis_role: iconclass_axis_roles[iconclass] || 'other'
        });
      }
    }
  }
  
  // If we found codes, update the object
  if (codes.size > 0) {
    obj.standard_cataloging.iconclass_codes = Array.from(codes.values());
    if (codes.size > 1) totalMulti++;
    totalUpdated++;
  } else {
    // Keep existing or mark as unclassified
    if (!obj.standard_cataloging.iconclass_codes || 
        obj.standard_cataloging.iconclass_codes.length === 0 ||
        obj.standard_cataloging.iconclass_codes[0].code === '0000') {
      totalUnclassified++;
      obj.standard_cataloging.iconclass_codes = [
        { code: '0000', label: 'Unclassified', axis_role: 'other' }
      ];
    }
  }
}

// Write updated objects
writeFileSync(objectsFile, JSON.stringify(objects, null, 2));

console.log('Iconclass update complete!\n');
console.log(`Objects updated: ${totalUpdated}/${objects.length}`);
console.log(`Objects with multiple Iconclass codes: ${totalMulti}`);
console.log(`Objects still unclassified: ${totalUnclassified}`);

// Show samples
console.log('\nSample updates:');
const samples = objects.filter(o => o.standard_cataloging.iconclass_codes.length > 0).slice(0, 5);
samples.forEach(o => {
  console.log(`\n${o.id} (${o.place.country_code}):`);
  console.log(`  Motifs: ${o.observed_motifs.slice(0, 5).join(', ')}`);
  console.log(`  Iconclass: ${o.standard_cataloging.iconclass_codes.map(c => c.code).join(', ')}`);
});

// Show unclassified
if (totalUnclassified > 0) {
  console.log(`\nUnclassified samples (first 5):`);
  const unclassified = objects.filter(o => 
    o.standard_cataloging.iconclass_codes[0]?.code === '0000'
  ).slice(0, 5);
  unclassified.forEach(o => {
    console.log(`  ${o.id}: ${o.observed_motifs.slice(0, 3).join(', ')}`);
  });
}
