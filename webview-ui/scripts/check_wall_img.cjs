const fs = require('fs');
const { PNG } = require('pngjs');

const imgPath = 'webview-ui/public/assets/walls/wall_0.png';
const data = fs.readFileSync(imgPath);
const png = PNG.sync.read(data);

console.log(`Width: ${png.width}, Height: ${png.height}`);

const tileSizeW = 16;
const tileSizeH = 32; // Assuming 16x32 for wall sets with baked depth
const cols = Math.floor(png.width / tileSizeW);
const rows = Math.floor(png.height / tileSizeH);

console.log(`Grid: ${cols}x${rows}`);
