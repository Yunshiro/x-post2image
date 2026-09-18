import { deflateSync } from "node:zlib";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

function crc32(buffer) {
  let crc = ~0;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    rgba.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function roundedRect(px, py, size, radius) {
  const r = Math.max(2, Math.round(size * radius));
  return (x, y) => {
    const dx = x - px;
    const dy = y - py;
    if (dx < 0 || dy < 0 || dx >= size || dy >= size) {
      return false;
    }
    const cx = dx < r ? r - dx : dx >= size - r ? dx - (size - r - 1) : 0;
    const cy = dy < r ? r - dy : dy >= size - r ? dy - (size - r - 1) : 0;
    if (cx === 0 || cy === 0) {
      return true;
    }
    return cx * cx + cy * cy <= r * r;
  };
}

function inCircle(x, y, cx, cy, radius) {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function paintIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const inside = roundedRect(0, 0, size, 0.22);
  const body = roundedRect(Math.round(size * 0.18), Math.round(size * 0.38), Math.round(size * 0.64), 0.18);
  const bump = roundedRect(Math.round(size * 0.34), Math.round(size * 0.26), Math.round(size * 0.32), 0.2);
  const lensX = size * 0.5;
  const lensY = size * 0.58;
  const lensR = size * 0.16;
  const innerR = size * 0.08;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      if (inside(x, y)) {
        r = 15;
        g = 20;
        b = 25;
        a = 255;
      }
      if (body(x, y) || bump(x, y)) {
        r = 231;
        g = 233;
        b = 234;
        a = 255;
      }
      if (inCircle(x, y, lensX, lensY, lensR)) {
        r = 29;
        g = 155;
        b = 240;
        a = 255;
      }
      if (inCircle(x, y, lensX, lensY, innerR)) {
        r = 15;
        g = 20;
        b = 25;
        a = 255;
      }
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = a;
    }
  }
  return encodePng(size, size, rgba);
}

export async function generateIcons(directory) {
  await Promise.all(
    [16, 48, 128].map((size) => writeFile(join(directory, `icon${size}.png`), paintIcon(size))),
  );
}
