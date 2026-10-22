import test from "node:test";
import assert from "node:assert/strict";
import { islandFaces, containsUV } from "../src/editor/uv.js";
test("UV selection joins duplicated vertices on shared UV edges but stops at seams", () => {
  const positions = new Float32Array([
    -1, 0, 0, 0, 0, 0, 0, 1, 0, -1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0,
  ]);
  const uvs = new Float32Array([
    0, 0, 0.45, 0, 0.45, 1, 0, 1, 0.55, 0, 1, 0, 1, 1, 0.55, 1,
  ]);
  const ids = new Uint16Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
  assert.deepEqual(islandFaces(positions, uvs, ids, 0).sort(), [0, 1]);
  assert.deepEqual(islandFaces(positions, uvs, ids, 2).sort(), [2, 3]);
  const splitPositions = new Float32Array([
    -1, 0, 0, 0, 0, 0, 0, 1, 0, -1, 0, 0, 0, 1, 0, -1, 1, 0,
  ]);
  const splitUVs = new Float32Array([
    0, 0, 0.45, 0, 0.45, 1, 0, 0, 0.45, 1, 0, 1,
  ]);
  assert.deepEqual(
    islandFaces(
      splitPositions,
      splitUVs,
      new Uint16Array([0, 1, 2, 3, 4, 5]),
      0,
    ).sort(),
    [0, 1],
  );
});
test("UV hit testing handles either winding, boundaries and degenerate triangles", () => {
  const a = { x: 0, y: 0 },
    b = { x: 1, y: 0 },
    c = { x: 0, y: 1 };
  assert.ok(containsUV({ x: 0.2, y: 0.2 }, a, b, c));
  assert.ok(containsUV({ x: 0.2, y: 0.2 }, c, b, a));
  assert.ok(containsUV({ x: 0, y: 0.5 }, a, b, c));
  assert.ok(!containsUV({ x: 0.8, y: 0.8 }, a, b, c));
  assert.ok(!containsUV({ x: 0, y: 0 }, a, a, a));
});
