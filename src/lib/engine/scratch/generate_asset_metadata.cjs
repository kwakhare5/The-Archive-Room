/**
 * generate_asset_metadata.cjs
 * 
 * Generates asset-index.json and furniture-catalog.json in public/assets/
 * by reading all furniture manifests from the filesystem.
 * 
 * Run from: webview-ui/ directory
 * Command:  node src/office/scratch/generate_asset_metadata.cjs
 */

const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.resolve(__dirname, '../../../public/assets');
const FURNITURE_DIR = path.join(ASSETS_DIR, 'furniture');

// ── 1. Build asset-index.json ─────────────────────────────────────────────

function buildAssetIndex() {
  const floors = fs.readdirSync(path.join(ASSETS_DIR, 'floors'))
    .filter(f => f.endsWith('.png'))
    .sort()
    .map(f => `floors/${f}`);

  const walls = fs.readdirSync(path.join(ASSETS_DIR, 'walls'))
    .filter(f => f.endsWith('.png'))
    .sort()
    .map(f => `walls/${f}`);

  const characters = fs.readdirSync(path.join(ASSETS_DIR, 'characters'))
    .filter(f => f.endsWith('.png'))
    .sort()
    .map(f => `characters/${f}`);

  return {
    floors,
    walls,
    characters,
    defaultLayout: 'default-layout-1.json',
  };
}

// ── 2. Build furniture-catalog.json ──────────────────────────────────────────

/**
 * Recursively flattens a manifest node into CatalogEntry objects.
 * A CatalogEntry is produced for every leaf "asset" type node.
 */
function flattenManifestNode(node, groupId, groupDefaults, furnitureDir, folderName) {
  const entries = [];

  // Inherit group-level defaults
  const inherited = {
    category: node.category || groupDefaults.category || 'misc',
    isDesk: node.isDesk ?? groupDefaults.isDesk ?? false,
    canPlaceOnWalls: node.canPlaceOnWalls ?? groupDefaults.canPlaceOnWalls ?? false,
    canPlaceOnSurfaces: node.canPlaceOnSurfaces ?? groupDefaults.canPlaceOnSurfaces ?? false,
    backgroundTiles: node.backgroundTiles ?? groupDefaults.backgroundTiles ?? 0,
    rotationScheme: node.rotationScheme || groupDefaults.rotationScheme || undefined,
    mirrorSide: node.mirrorSide ?? groupDefaults.mirrorSide ?? false,
  };

  if (node.type === 'asset') {
    // Leaf node → produce a CatalogEntry
    const file = node.file || `${node.id}.png`;
    const furniturePath = `furniture/${folderName}/${file}`;

    const entry = {
      id: node.id,
      name: node.name || groupDefaults.name || node.id,
      label: node.label || groupDefaults.name || node.id,
      category: inherited.category,
      file: file,
      furniturePath: furniturePath,
      width: node.width,
      height: node.height,
      footprintW: node.footprintW,
      footprintH: node.footprintH,
      isDesk: inherited.isDesk,
      canPlaceOnWalls: inherited.canPlaceOnWalls,
    };

    // Optional fields (only include if truthy / non-zero)
    if (inherited.canPlaceOnSurfaces) entry.canPlaceOnSurfaces = true;
    if (inherited.backgroundTiles) entry.backgroundTiles = inherited.backgroundTiles;
    if (node.orientation) entry.orientation = node.orientation;
    if (node.state) entry.state = node.state;
    if (inherited.mirrorSide) entry.mirrorSide = true;
    if (inherited.rotationScheme) entry.rotationScheme = inherited.rotationScheme;
    if (node.animationGroup) entry.animationGroup = node.animationGroup;
    if (node.frame !== undefined) entry.frame = node.frame;
    if (groupId) entry.groupId = groupId;

    entries.push(entry);

  } else if (node.type === 'group') {
    // Group node → recurse into members
    const newGroupId = node.id || groupId || node.id;
    const newDefaults = {
      ...groupDefaults,
      ...inherited,
      name: node.name || groupDefaults.name,
      // Pass down orientation from group if set
      ...(node.orientation ? { orientation: node.orientation } : {}),
    };

    // For rotation groups, pass the rotation scheme to each member
    if (node.groupType === 'rotation' && node.rotationScheme) {
      newDefaults.rotationScheme = node.rotationScheme;
    }

    for (const member of (node.members || [])) {
      const memberWithOrientation = node.orientation && !member.orientation
        ? { ...member, orientation: node.orientation }
        : member;
      entries.push(...flattenManifestNode(memberWithOrientation, newGroupId, newDefaults, furnitureDir, folderName));
    }
  }

  return entries;
}

function buildFurnitureCatalog() {
  const catalog = [];

  const folders = fs.readdirSync(FURNITURE_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();

  for (const folderName of folders) {
    const manifestPath = path.join(FURNITURE_DIR, folderName, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      console.warn(`  ⚠ No manifest.json in ${folderName}, skipping`);
      continue;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const groupDefaults = {
      name: manifest.name || folderName,
      category: manifest.category || 'misc',
      isDesk: manifest.isDesk ?? false,
      canPlaceOnWalls: manifest.canPlaceOnWalls ?? false,
      canPlaceOnSurfaces: manifest.canPlaceOnSurfaces ?? false,
      backgroundTiles: manifest.backgroundTiles ?? 0,
      rotationScheme: manifest.rotationScheme || undefined,
      mirrorSide: manifest.mirrorSide ?? false,
    };

    const furnitureDir = path.join(FURNITURE_DIR, folderName);
    const entries = flattenManifestNode(manifest, null, groupDefaults, furnitureDir, folderName);
    console.log(`  ✓ ${folderName}: ${entries.length} entry/entries → [${entries.map(e => e.id).join(', ')}]`);
    catalog.push(...entries);
  }

  return catalog;
}

// ── 3. Main ───────────────────────────────────────────────────────────────────

console.log('\n🔧 Generating asset metadata...\n');

// --- asset-index.json ---
console.log('📋 Building asset-index.json...');
const assetIndex = buildAssetIndex();
fs.writeFileSync(
  path.join(ASSETS_DIR, 'asset-index.json'),
  JSON.stringify(assetIndex, null, 2),
  'utf-8'
);
console.log(`  ✓ Floors: ${assetIndex.floors.length}`);
console.log(`  ✓ Walls: ${assetIndex.walls.length}`);
console.log(`  ✓ Characters: ${assetIndex.characters.length}`);
console.log(`  ✓ Default layout: ${assetIndex.defaultLayout}`);

// --- furniture-catalog.json ---
console.log('\n🪑 Building furniture-catalog.json...');
const catalog = buildFurnitureCatalog();
fs.writeFileSync(
  path.join(ASSETS_DIR, 'furniture-catalog.json'),
  JSON.stringify(catalog, null, 2),
  'utf-8'
);
console.log(`\n✅ Done! Generated ${catalog.length} total catalog entries.`);
console.log(`   → ${path.join(ASSETS_DIR, 'asset-index.json')}`);
console.log(`   → ${path.join(ASSETS_DIR, 'furniture-catalog.json')}`);
