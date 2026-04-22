const fs = require('fs');
const path = 'webview-ui/public/assets/default-layout-1.json';
const layout = JSON.parse(fs.readFileSync(path, 'utf8'));

// We want to add furniture to Zone 3 (Bottom part of Left Room)
// 1. Sofa
// 2. Coffee Machine
// 3. Bin
// 4. Whiteboard

const zone3Furniture = [
  {
    "id": "sofa_zone_3",
    "type": "SOFA_FRONT",
    "x": 3,
    "y": 10,
    "state": "off"
  },
  {
    "id": "coffee_zone_3",
    "type": "COFFEE",
    "x": 1,
    "y": 10,
    "state": "off"
  },
  {
    "id": "bin_zone_3",
    "type": "BIN",
    "x": 1,
    "y": 12,
    "state": "off"
  },
  {
    "id": "whiteboard_zone_3",
    "type": "WHITEBOARD",
    "x": 8,
    "y": 11,
    "state": "off"
  }
];

// Append to existing furniture (which should be empty right now based on previous task)
layout.furniture = layout.furniture || [];
layout.furniture.push(...zone3Furniture);

// Increment revision to trigger browser refresh
layout.layoutRevision = (layout.layoutRevision || 13) + 1;

fs.writeFileSync(path, JSON.stringify(layout, null, 2));
console.log('Successfully placed Zone 3 furniture.');
