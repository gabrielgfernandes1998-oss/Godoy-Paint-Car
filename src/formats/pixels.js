// Original CPU implementation of the public D3D9/BC texture layouts.
export const FORMATS = new Map([
  [21, "BGRA8"],
  [22, "BGRX8"],
  [25, "ARGB1555"],
  [28, "A8"],
  [32, "RGBA8"],
  [50, "L8"],
  [0x31545844, "DXT1"],
  [0x33545844, "DXT3"],
  [0x35545844, "DXT5"],
  [0x31495441, "ATI1"],
  [0x32495441, "ATI2"],
  [0x20374342, "BC7"],
]);
const blockFormats = new Set(["DXT1", "DXT3", "DXT5", "ATI1", "ATI2"]);
export const supportedFormat = (format) =>
  FORMATS.has(format) && FORMATS.get(format) !== "BC7";
export function levelSize(width, height, format, stride = 0) {
  const name = FORMATS.get(format);
  if (blockFormats.has(name) || name === "BC7")
    return (
      Math.ceil(width / 4) *
      Math.ceil(height / 4) *
      (name === "DXT1" || name === "ATI1" ? 8 : 16)
    );
  const bpp = name === "ARGB1555" ? 2 : name === "A8" || name === "L8" ? 1 : 4;
  return Math.max(width * bpp, stride) * height;
}
const rgb565 = (n) =>
  [
    ((n >>> 11) * 255) / 31,
    (((n >>> 5) & 63) * 255) / 63,
    ((n & 31) * 255) / 31,
  ].map(Math.round);
function colorPalette(a, b, transparent) {
  const x = rgb565(a),
    y = rgb565(b);
  return [
    x,
    y,
    x.map((v, i) =>
      Math.round(transparent ? (v + y[i]) / 2 : (2 * v + y[i]) / 3),
    ),
    transparent ? [0, 0, 0] : x.map((v, i) => Math.round((v + 2 * y[i]) / 3)),
  ];
}
function alphaPalette(a, b) {
  const values = [a, b];
  if (a > b) {
    for (let i = 1; i <= 6; i++)
      values.push(Math.floor(((7 - i) * a + i * b) / 7));
  } else {
    for (let i = 1; i <= 4; i++)
      values.push(Math.floor(((5 - i) * a + i * b) / 5));
    values.push(0, 255);
  }
  return values;
}
function alphaBlock(data, offset) {
  const palette = alphaPalette(data[offset], data[offset + 1]),
    out = [];
  let bits = 0n;
  for (let i = 0; i < 6; i++)
    bits |= BigInt(data[offset + 2 + i]) << BigInt(8 * i);
  for (let i = 0; i < 16; i++)
    out.push(palette[Number((bits >> BigInt(i * 3)) & 7n)]);
  return out;
}
export function decodePixels(data, width, height, format, stride = 0) {
  const name = FORMATS.get(format);
  if (!supportedFormat(format))
    throw Error(
      `Formato de textura ${name || "0x" + format.toString(16)} ainda não suportado.`,
    );
  if (data.length < levelSize(width, height, format, stride))
    throw Error("Dados de textura truncados.");
  const out = new Uint8ClampedArray(width * height * 4),
    view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (!blockFormats.has(name)) {
    const bpp =
        name === "ARGB1555" ? 2 : name === "A8" || name === "L8" ? 1 : 4,
      row = Math.max(width * bpp, stride);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const source = y * row + x * bpp,
          target = (y * width + x) * 4;
        let rgba;
        if (name === "BGRA8" || name === "BGRX8")
          rgba = [
            data[source + 2],
            data[source + 1],
            data[source],
            name === "BGRX8" ? 255 : data[source + 3],
          ];
        else if (name === "RGBA8")
          rgba = Array.from(data.subarray(source, source + 4));
        else if (name === "L8")
          rgba = [data[source], data[source], data[source], 255];
        else if (name === "A8") rgba = [255, 255, 255, data[source]];
        else {
          const v = view.getUint16(source, true);
          rgba = [
            (((v >>> 10) & 31) * 255) / 31,
            (((v >>> 5) & 31) * 255) / 31,
            ((v & 31) * 255) / 31,
            v & 0x8000 ? 255 : 0,
          ];
        }
        out.set(rgba, target);
      }
    return out;
  }
  const blockBytes = name === "DXT1" || name === "ATI1" ? 8 : 16;
  let offset = 0;
  for (let by = 0; by < height; by += 4)
    for (let bx = 0; bx < width; bx += 4, offset += blockBytes) {
      const channels = name === "ATI1" || name === "ATI2";
      let palette, colorBits, alpha, red, green;
      if (channels) {
        red = alphaBlock(data, offset);
        if (name === "ATI2") green = alphaBlock(data, offset + 8);
      } else {
        const co = offset + (name === "DXT1" ? 0 : 8);
        const a = view.getUint16(co, true),
          b = view.getUint16(co + 2, true);
        palette = colorPalette(a, b, name === "DXT1" && a <= b);
        colorBits = view.getUint32(co + 4, true);
        if (name === "DXT5") alpha = alphaBlock(data, offset);
        if (name === "DXT3") {
          alpha = [];
          for (let i = 0; i < 16; i++)
            alpha.push(
              ((data[offset + (i >>> 1)] >>> ((i & 1) * 4)) & 15) * 17,
            );
        }
      }
      for (let py = 0; py < 4; py++)
        for (let px = 0; px < 4; px++) {
          const x = bx + px,
            y = by + py,
            i = py * 4 + px;
          if (x >= width || y >= height) continue;
          const dest = (y * width + x) * 4;
          if (channels) {
            out.set(
              [red[i], green ? green[i] : red[i], green ? 0 : red[i], 255],
              dest,
            );
          } else {
            const ci = (colorBits >>> (i * 2)) & 3;
            out.set(
              [
                ...palette[ci],
                alpha
                  ? alpha[i]
                  : name === "DXT1" &&
                      ci === 3 &&
                      view.getUint16(offset, true) <=
                        view.getUint16(offset + 2, true)
                    ? 0
                    : 255,
              ],
              dest,
            );
          }
        }
    }
  return out;
}
// Fixed-layout export preserves dimensions, format, mip count and all other resources.
export function encodePixels(rgba, width, height, format, stride = 0) {
  const name = FORMATS.get(format);
  if (!["BGRA8", "BGRX8", "RGBA8", "DXT1", "DXT3", "DXT5"].includes(name))
    throw Error(
      `Exportação YTD para ${name || "formato desconhecido"} ainda não disponível. Use PNG.`,
    );
  const out = new Uint8Array(levelSize(width, height, format, stride)),
    view = new DataView(out.buffer);
  if (!name.startsWith("DXT")) {
    const row = Math.max(width * 4, stride);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4,
          d = y * row + x * 4;
        out.set(
          name === "RGBA8"
            ? rgba.subarray(i, i + 4)
            : [
                rgba[i + 2],
                rgba[i + 1],
                rgba[i],
                name === "BGRX8" ? 255 : rgba[i + 3],
              ],
          d,
        );
      }
    return out;
  }
  const to565 = (c) =>
    (Math.round((c[0] * 31) / 255) << 11) |
    (Math.round((c[1] * 63) / 255) << 5) |
    Math.round((c[2] * 31) / 255);
  function writeAlpha(pixels, offset) {
    const values = pixels.map((p) => p[3]),
      a = Math.max(...values),
      b = Math.min(...values),
      palette = alphaPalette(a, b);
    out[offset] = a;
    out[offset + 1] = b;
    let bits = 0n;
    for (let i = 0; i < 16; i++) {
      let best = 0;
      for (let j = 1; j < 8; j++)
        if (
          Math.abs(values[i] - palette[j]) < Math.abs(values[i] - palette[best])
        )
          best = j;
      bits |= BigInt(best) << BigInt(i * 3);
    }
    for (let i = 0; i < 6; i++)
      out[offset + 2 + i] = Number((bits >> BigInt(i * 8)) & 255n);
  }
  let offset = 0;
  const blockBytes = name === "DXT1" ? 8 : 16;
  for (let by = 0; by < height; by += 4)
    for (let bx = 0; bx < width; bx += 4, offset += blockBytes) {
      const pixels = [];
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++) {
          const i =
            (Math.min(height - 1, by + y) * width +
              Math.min(width - 1, bx + x)) *
            4;
          pixels.push(Array.from(rgba.subarray(i, i + 4)));
        }
      const transparent = name === "DXT1" && pixels.some((p) => p[3] < 128),
        opaque = pixels.filter((p) => !transparent || p[3] >= 128);
      const lo = [0, 1, 2].map((c) =>
          opaque.length ? Math.min(...opaque.map((p) => p[c])) : 0,
        ),
        hi = [0, 1, 2].map((c) =>
          opaque.length ? Math.max(...opaque.map((p) => p[c])) : 0,
        );
      let a = to565(hi),
        b = to565(lo);
      if (transparent) [a, b] = [Math.min(a, b), Math.max(a, b)];
      else {
        if (a < b) [a, b] = [b, a];
        if (a === b) {
          if (a < 65535) a++;
          else b--;
        }
      }
      const palette = colorPalette(a, b, transparent),
        co = offset + (name === "DXT1" ? 0 : 8);
      view.setUint16(co, a, true);
      view.setUint16(co + 2, b, true);
      let bits = 0;
      for (let i = 0; i < 16; i++) {
        let best = 0;
        if (transparent && pixels[i][3] < 128) best = 3;
        else {
          let dist = Infinity;
          for (let j = 0; j < (transparent ? 3 : 4); j++) {
            const d = [0, 1, 2].reduce(
              (n, c) => n + (pixels[i][c] - palette[j][c]) ** 2,
              0,
            );
            if (d < dist) {
              dist = d;
              best = j;
            }
          }
        }
        bits = (bits | (best << (i * 2))) >>> 0;
      }
      view.setUint32(co + 4, bits, true);
      if (name === "DXT5") writeAlpha(pixels, offset);
      if (name === "DXT3")
        for (let i = 0; i < 16; i++)
          out[offset + (i >>> 1)] |=
            Math.round(pixels[i][3] / 17) << ((i & 1) * 4);
    }
  return out;
}
