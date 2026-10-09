const sharp = require('sharp');
const fs = require('fs');

async function processPersona() {
  const inputPath = 'c:/Users/user/Desktop/LabControl/src/lib/img/persona.jpg';
  const outputPathPublic = 'c:/Users/user/Desktop/LabControl/public/persona.png';
  const outputPathSrc = 'c:/Users/user/Desktop/LabControl/src/lib/img/persona.png';

  const image = sharp(inputPath).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  // data is RGBA buffer: length = w * h * 4
  const visited = new Uint8Array(w * h);
  const isBg = new Uint8Array(w * h);

  // Check if a pixel is background:
  // Pure white or near white, or light blue ground shadow
  function isBackgroundPixel(x, y) {
    const idx = (y * w + x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    // White / near white
    if (r > 240 && g > 240 && b > 240) return true;

    // Light blue ground shadow beneath feet
    if (y > 520 && r > 190 && g > 205 && b > 230 && r < 245) return true;

    // Anti-aliased white fringe at boundary (bright background)
    if (r > 230 && g > 230 && b > 230) return true;

    return false;
  }

  // BFS Queue
  const queue = [];

  // Seed borders
  for (let x = 0; x < w; x++) {
    queue.push(x, 0);
    queue.push(x, h - 1);
    visited[x] = 1;
    visited[(h - 1) * w + x] = 1;
  }
  for (let y = 0; y < h; y++) {
    queue.push(0, y);
    queue.push(w - 1, y);
    visited[y * w] = 1;
    visited[y * w + (w - 1)] = 1;
  }

  let head = 0;
  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];

    if (isBackgroundPixel(x, y)) {
      isBg[y * w + x] = 1;

      // Check 4 neighbors
      const neighbors = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1]
      ];

      for (let i = 0; i < 4; i++) {
        const nx = neighbors[i][0];
        const ny = neighbors[i][1];
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const nidx = ny * w + nx;
          if (!visited[nidx]) {
            visited[nidx] = 1;
            queue.push(nx, ny);
          }
        }
      }
    }
  }

  // Set alpha = 0 for background pixels
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (isBg[y * w + x]) {
        data[idx + 3] = 0; // Transparent
      }
    }
  }

  // Save to public and src
  const pngBuffer = await sharp(data, {
    raw: {
      width: w,
      height: h,
      channels: 4
    }
  }).png().toBuffer();

  fs.writeFileSync(outputPathPublic, pngBuffer);
  fs.writeFileSync(outputPathSrc, pngBuffer);
  console.log('Successfully saved transparent persona to:', outputPathPublic);
}

processPersona().catch(console.error);
