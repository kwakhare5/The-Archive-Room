const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'public/assets/furniture-catalog.json');
const catalog = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const targets = ['BOOKSHELF', 'DOUBLE_BOOKSHELF', 'WHITEBOARD'];

for (const item of catalog) {
  if (targets.includes(item.id)) {
    item.canPlaceOnWalls = false;
  }
}

fs.writeFileSync(filePath, JSON.stringify(catalog, null, 2));
console.log('Catalog updated: Bookshelves and Whiteboards can now be placed on floor.');
