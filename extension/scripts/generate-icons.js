const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// Helper to create an uncompressed RGBA PNG
function createPng(width, height, drawFn) {
  // RGBA buffer
  const rgba = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const idx = (y * width + x) * 4;
      rgba[idx] = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
      rgba[idx + 3] = a;
    }
  }

  // PNG filter type 0 (None) before each scanline
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    scanlines[y * (width * 4 + 1)] = 0; // Filter byte: None
    rgba.copy(scanlines, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressedData = zlib.deflateSync(scanlines);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression method: 0
  ihdr[11] = 0; // Filter method: 0
  ihdr[12] = 0; // Interlace: 0

  const ihdrChunk = createChunk("IHDR", ihdr);
  const idatChunk = createChunk("IDAT", compressedData);
  const iendChunk = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, "ascii");
  const typeAndData = Buffer.concat([typeBuf, data]);

  const crcBuf = Buffer.alloc(4);
  const crcVal = crc32(typeAndData);
  crcBuf.writeUInt32BE(crcVal >>> 0, 0);

  return Buffer.concat([length, typeAndData, crcBuf]);
}

// CRC32 implementation
function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

// Brand Indigo / Violet theme with central lightning bolt icon
function drawStructurAIIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const radius = w * 0.45;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist <= radius) {
    // Rounded gradient background (Deep Indigo to Electric Violet)
    const t = (x + y) / (w + h);
    const r = Math.round(99 + t * (124 - 99)); // #6366f1 to #7c3aed
    const g = Math.round(102 - t * 44);
    const b = Math.round(241 - t * 4);

    // Lightning bolt pattern
    const nx = (x - w * 0.25) / (w * 0.5);
    const ny = (y - h * 0.2) / (h * 0.6);

    // Check if inside bolt
    const isBolt = (nx >= 0.2 && nx <= 0.8 && ny >= 0.2 && ny <= 0.8) &&
      ((nx + ny > 0.6 && nx + ny < 1.1) || (nx > 0.35 && nx < 0.65 && ny > 0.35 && ny < 0.65));

    if (isBolt) {
      return [255, 255, 255, 255]; // White bolt
    }

    return [r, g, b, 255];
  }

  return [0, 0, 0, 0]; // Transparent outside
}

const iconsDir = path.join(__dirname, "..", "icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach((size) => {
  const pngBuf = createPng(size, size, drawStructurAIIcon);
  const filePath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(filePath, pngBuf);
  console.log(`Generated ${filePath} (${size}x${size}, ${pngBuf.length} bytes)`);
});
