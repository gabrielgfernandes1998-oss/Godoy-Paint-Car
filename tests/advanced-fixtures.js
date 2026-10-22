import { makeYdd, makeYtd } from "./fixtures.js";
import { openResource } from "../src/formats/resource.js";
export function twoIslandsModel() {
  const r = openResource(makeYdd(), 165),
    v = r.view,
    s = r.systemSize;
  v.setUint32(0x518, 8, true);
  v.setUint32(0x588, 12, true);
  const positions = [
    [-1, 0, 0],
    [0, 0, 0],
    [0, 0, 2],
    [-1, 0, 2],
    [0, 0, 0],
    [1, 0, 0],
    [1, 0, 2],
    [0, 0, 2],
  ];
  const uv = [
    [0, 1],
    [0.45, 1],
    [0.45, 0],
    [0, 0],
    [0.55, 1],
    [1, 1],
    [1, 0],
    [0.55, 0],
  ];
  for (let i = 0; i < 8; i++)
    [...positions[i], 0, -1, 0, ...uv[i]].forEach((n, j) =>
      v.setFloat32(s + i * 32 + j * 4, n, true),
    );
  // Keep indices outside the larger vertex buffer.
  v.setUint32(0x590, 0x60000400, true);
  [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7].forEach((n, i) =>
    v.setUint16(s + 0x400 + i * 2, n, true),
  );
  return r.pack();
}
export function redTexture() {
  const r = openResource(makeYtd(), 13),
    v = r.view;
  for (const o of [0x28, 0x2a, 0x38, 0x3a]) v.setUint16(o, 1, true);
  v.setUint16(0x250, 64, true);
  v.setUint16(0x252, 32, true);
  v.setUint16(0x256, 256, true);
  v.setUint32(0x258, 21, true);
  for (let i = r.systemSize; i < r.data.length; i += 4)
    r.data.set([0, 0, 255, 255], i);
  return r.pack();
}
