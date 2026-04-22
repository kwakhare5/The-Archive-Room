const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const imgPath = 'webview-ui/public/assets/walls/wall_0.png';
const outDir = 'webview-ui/public/assets/walls/extracted';

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

const data = fs.readFileSync(imgPath);
const src = PNG.sync.read(data);

const tileSizeW = 16;
const tileSizeH = 32;
const cols = 4;
const rows = 4;

for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
        const index = r * cols + c;
        const dst = new PNG({ width: tileSizeW, height: tileSizeH });
        
        for (let y = 0; y < tileSizeH; y++) {
            for (let x = 0; x < tileSizeW; x++) {
                const srcX = c * tileSizeW + x;
                const srcY = r * tileSizeH + y;
                const srcIdx = (src.width * srcY + srcX) << 2;
                const dstIdx = (dst.width * y + x) << 2;
                
                dst.data[dstIdx] = src.data[srcIdx];
                dst.data[dstIdx + 1] = src.data[srcIdx + 1];
                dst.data[dstIdx + 2] = src.data[srcIdx + 2];
                dst.data[dstIdx + 3] = src.data[srcIdx + 3];
            }
        }
        
        const outPath = path.join(outDir, `wall_0_tile_${index}.png`);
        fs.writeFileSync(outPath, PNG.sync.write(dst));
        console.log(`Saved: ${outPath}`);
    }
}
