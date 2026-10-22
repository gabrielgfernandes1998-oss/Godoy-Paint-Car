// Generated fixtures contain only original test triangles and solid-color pixels.
// Offsets and little-endian fields are written explicitly, independently of the readers.
import { openResource } from "../src/formats/resource.js";
import { deflateRawSync } from "node:zlib";
export function makeResource(version, fill) {
  const systemSize = 8192,
    graphicsSize = 8192,
    data = new Uint8Array(systemSize + graphicsSize),
    view = new DataView(data.buffer);
  const u8 = (o, n) => view.setUint8(o, n),
    u16 = (o, n) => view.setUint16(o, n, true),
    u32 = (o, n) => view.setUint32(o, n >>> 0, true),
    f32 = (o, n) => view.setFloat32(o, n, true),
    ptr = (o, p, graphics = false) => {
      u32(o, p === null ? 0 : (graphics ? 0x60000000 : 0x50000000) + p);
      u32(o + 4, 0);
    },
    text = (o, s) => data.set(new TextEncoder().encode(s + "\0"), o);
  fill({ data, view, u8, u16, u32, f32, ptr, text, systemSize });
  const header = new Uint8Array(16),
    h = new DataView(header.buffer);
  h.setUint32(0, 0x37435352, true);
  h.setUint32(4, version, true);
  h.setUint32(8, ((version >>> 4) << 28) | 0x08000004, true);
  h.setUint32(12, ((version & 15) << 28) | 0x08000004, true);
  return new Uint8Array(Buffer.concat([header, deflateRawSync(data)]));
}
export function makeYtd() {
  return makeResource(13, ({ u8, u16, u32, ptr, text, data, systemSize }) => {
    ptr(0x20, 0x100);
    u16(0x28, 3);
    u16(0x2a, 3);
    ptr(0x30, 0x180);
    u16(0x38, 3);
    u16(0x3a, 3);
    for (let i = 0; i < 3; i++) {
      const t = 0x200 + i * 0x100;
      ptr(0x180 + i * 8, t);
      u32(0x100 + i * 4, [0x1234, 0x5678, 0x9abc][i]);
      ptr(t + 0x28, 0x800 + i * 0x100);
      text(
        0x800 + i * 0x100,
        ["cloth_diffuse", "second_diffuse", "bc7_not_supported"][i],
      );
      u16(t + 0x50, 8);
      u16(t + 0x52, 4);
      u16(t + 0x54, 1);
      u16(t + 0x56, i === 1 ? 4 : 8);
      u32(t + 0x58, [0x35545844, 0x31545844, 0x20374342][i]);
      u8(t + 0x5d, 1);
      ptr(t + 0x70, i * 256, true);
      if (i !== 2) {
        for (let block = 0; block < 2; block++) {
          const p = systemSize + i * 256 + block * (i === 1 ? 8 : 16);
          if (i === 0) {
            data[p] = 255;
            data[p + 1] = 0;
          }
          u16(p + (i === 1 ? 0 : 8), i === 1 ? 0x001f : 0xf800);
          u16(p + (i === 1 ? 0 : 8) + 2, 0x07e0);
          u32(p + (i === 1 ? 0 : 8) + 4, 0);
        }
      }
    }
  });
}
export function makeYdd(embedded = false) {
  return makeResource(165, ({ u8, u16, u32, f32, ptr, text, systemSize }) => {
    ptr(0x20, 0x120);
    u16(0x28, 2);
    u16(0x2a, 2);
    ptr(0x30, 0x100);
    u16(0x38, 2);
    u16(0x3a, 2);
    ptr(0x100, 0x200);
    ptr(0x108, 0x900);
    for (const [i, p] of [0x200, 0x900].entries()) {
      ptr(p + 0xa8, 0x1200 + i * 256);
      text(0x1200 + i * 256, "test_clothing_" + i);
      ptr(p + 0x10, 0x1800);
      ptr(p + 0x50, 0x700);
      ptr(p + 0x60, 0x740);
    }
    ptr(0x700, 0x720);
    u16(0x708, 1);
    u16(0x70a, 1);
    ptr(0x720, 0x300);
    ptr(0x740, 0x760);
    u16(0x748, 1);
    u16(0x74a, 1);
    ptr(0x760, 0x300);
    ptr(0x308, 0x380);
    u16(0x310, 1);
    u16(0x312, 1);
    ptr(0x320, 0x390);
    ptr(0x380, 0x400);
    u16(0x390, 0);
    ptr(0x418, 0x500);
    ptr(0x438, 0x580);
    u32(0x458, 3);
    u32(0x45c, 1);
    u16(0x460, 3);
    u16(0x462, 3);
    u16(0x470, 32);
    ptr(0x478, 0, true);
    u16(0x508, 32);
    ptr(0x510, 0, true);
    u32(0x518, 3);
    ptr(0x530, 0x600);
    u32(0x588, 3);
    ptr(0x590, 0x100, true);
    u32(0x600, 0x49);
    u16(0x604, 32);
    u8(0x607, 3);
    u32(0x608, 0x05006006);
    u32(0x60c, 0);
    const vertices = [
      [-1, 0, 0, 0, -1, 0, 0, 1],
      [1, 0, 0, 0, -1, 0, 1, 1],
      [0, 0, 2, 0, -1, 0, 0.5, 0],
    ];
    vertices.forEach((v, i) =>
      v.forEach((n, j) => f32(systemSize + i * 32 + j * 4, n)),
    );
    [0, 1, 2].forEach((n, i) => u16(systemSize + 0x100 + i * 2, n));
    ptr(0x1810, 0x1840);
    u16(0x1818, 1);
    u16(0x181a, 1);
    ptr(0x1840, 0x1900);
    ptr(0x1900, 0x1a00);
    u8(0x1910, 1);
    u8(0x1a00, 0);
    ptr(0x1a08, 0x1b00);
    u32(0x1a10, 0xf1fe2b71);
    ptr(0x1b28, 0x1c00);
    text(0x1c00, "cloth_diffuse");
    if (embedded) {
      ptr(0x1808, 0x1400);
      ptr(0x1420, 0x1480);
      u16(0x1428, 1);
      u16(0x142a, 1);
      ptr(0x1430, 0x1440);
      u16(0x1438, 1);
      u16(0x143a, 1);
      ptr(0x1440, 0x1500);
      ptr(0x1528, 0x1600);
      text(0x1600, "cloth_diffuse");
      u16(0x1550, 4);
      u16(0x1552, 4);
      u16(0x1554, 1);
      u16(0x1556, 2);
      u32(0x1558, 0x31545844);
      u8(0x155d, 1);
      ptr(0x1570, 0x200, true);
      u16(systemSize + 0x200, 0xf800);
      u16(systemSize + 0x202, 0x07e0);
    }
  });
}

export function makeYft() {
  // Reuse original triangle geometry; place a FragDrawable independently from
  // the YDD dictionary header and use the YFT-specific name offset.
  const resource = openResource(makeYdd(), 165);
  const view = new DataView(resource.data.buffer);
  resource.data.copyWithin(0x1d00, 0x200, 0x2d0);
  view.setUint32(0x1d00 + 0x130, view.getUint32(0x200 + 0xa8, true), true);
  resource.data.fill(0, 0, 304);
  view.setUint32(0x30, 0x50001d00, true);
  view.setUint32(0x38, 0, true);
  view.setUint32(0x48, 0, true);
  new DataView(resource.header.buffer).setUint32(4, 162, true);
  return resource.pack();
}
