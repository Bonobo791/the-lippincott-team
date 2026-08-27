// Fails when the generated Tina schema (tina/__generated__/_schema.json)
// contains an empty `ui: {}` on any LEAF field — the residue left when a
// function (ui.validate, ...) is dropped during JSON serialization. Local
// codegen keeps the empty object while TinaCloud's indexer prunes it, so the
// schema-hash check then fails every credentialed build with
// ERR_CLOUD_CHECK_FAILED (see AGENTS.md "Key conventions").
//
// Only leaf fields (no nested `fields`/`templates`) are flagged: empty `ui`
// on collections and object/object-list fields serializes identically on both
// sides (empirically verified against TinaCloud's indexed schema), so it is
// benign there.
//
// Run after any tinacms codegen (build/dev). Wired into tina-lock.yml.
// Usage: node scripts/check-tina-schema.mjs [schemaPath]

import { readFileSync } from 'node:fs';

const schemaPath = process.argv[2] ?? 'tina/__generated__/_schema.json';
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

const offenders = [];

function visit(node, trail) {
	const isLeaf = !node.fields && !node.templates;
	if (isLeaf && node.ui && typeof node.ui === 'object' && !Array.isArray(node.ui) && Object.keys(node.ui).length === 0) {
		offenders.push(trail);
	}
	for (const field of node.fields ?? []) visit(field, `${trail} > ${field.name}`);
	for (const template of node.templates ?? []) visit(template, `${trail} > ${template.name}`);
}

for (const collection of schema.collections ?? []) {
	for (const field of collection.fields ?? []) visit(field, `${collection.name} > ${field.name}`);
	for (const template of collection.templates ?? []) visit(template, `${collection.name} > ${template.name}`);
}

if (offenders.length > 0) {
	console.error('Empty `ui: {}` in the generated Tina schema — a field/template likely carries a function (ui.validate, ui.itemProps, ...) that JSON serialization dropped. This breaks the TinaCloud schema-hash check (ERR_CLOUD_CHECK_FAILED) on credentialed builds. Move the constraint into the field description instead:');
	for (const offender of offenders) console.error(`  - ${offender}`);
	process.exit(1);
}

console.log(`Tina schema OK — no function residue (${schema.collections?.length ?? 0} collections).`);
