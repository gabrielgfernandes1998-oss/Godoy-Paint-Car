import test from "node:test";
import assert from "node:assert/strict";
import { inflateRawSync } from "node:zlib";
import { makeResource, makeYtd, makeYdd } from "./fixtures.js";
import { openResource, pageSize, jenkins } from "../src/formats/resource.js";
import { parseYtd, writeYtd } from "../src/formats/ytd.js";
import { parseYdd, halfFloat } from "../src/formats/ydd.js";
import { decodePixels, encodePixels } from "../src/formats/pixels.js";

test("RSC7 pages, bounded decompression and version/type errors", () => {
  assert.equal(pageSize(0x08000004), 8192);
  assert.equal(jenkins("DiffuseSampler"), 0xf1fe2b71);
  assert.throws(() => parseYtd(makeYdd()), /Versão/);
  assert.throws(() => parseYdd(makeYtd()), /Versão/);
  assert.throws(() => parseYtd(new Uint8Array(20)), /RSC7/);
  const file = makeYtd();
  const truncated = file.subarray(0, file.length - 8);
  assert.throws(() => parseYtd(truncated));
  const malicious = file.slice();
  new DataView(malicious.buffer).setUint32(8, 0x0fffffff, true);
  assert.throws(() => parseYtd(malicious), /Tamanho/);
  const pointer = makeResource(13, ({ ptr, u16 }) => {
    ptr(0x30, 8190);
    u16(0x38, 2);
    u16(0x3a, 2);
  });
  assert.throws(() => parseYtd(pointer), /Ponteiro/);
  const r = openResource(file, 13);
  assert.throws(() => r.ptr(r.data.length - 4));
});
test("YTD lists multiple textures, decodes actual BC pixels and identifies BC7", () => {
  const doc = parseYtd(makeYtd());
  assert.equal(doc.textures.length, 3);
  assert.deepEqual(
    doc.textures.map((t) => t.name),
    ["cloth_diffuse", "second_diffuse", "bc7_not_supported"],
  );
  assert.deepEqual(
    Array.from(doc.textures[0].decode().slice(0, 4)),
    [255, 0, 0, 255],
  );
  assert.deepEqual(
    Array.from(doc.textures[1].decode().slice(0, 4)),
    [0, 0, 255, 255],
  );
  assert.equal(doc.textures[2].supported, false);
  assert.throws(() => doc.textures[2].decode(), /BC7/);
});
test("YTD export preserves header, untouched textures, metadata, and modified pixel content", () => {
  const original = makeYtd(),
    doc = parseYtd(original),
    entry = doc.textures[0],
    rgba = entry.decode();
  for (let i = 0; i < rgba.length; i += 4) rgba.set([0, 255, 0, 255], i);
  const exported = writeYtd(doc, new Map([[entry.key, [rgba]]]));
  assert.deepEqual(exported.slice(0, 16), original.slice(0, 16));
  const decoded = parseYtd(exported);
  assert.deepEqual(
    Array.from(decoded.textures[0].decode().slice(0, 4)),
    [0, 255, 0, 255],
  );
  const before = inflateRawSync(original.subarray(16)),
    after = inflateRawSync(exported.subarray(16));
  for (let i = 0; i < before.length; i++)
    if (i < entry.dataOffset || i >= entry.dataOffset + entry.byteLength)
      assert.equal(after[i], before[i], `unmodified resource byte ${i}`);
  assert.deepEqual(
    inflateRawSync(writeYtd(doc, new Map()).subarray(16)),
    before,
  );
  assert.deepEqual(doc.resource.data, new Uint8Array(before));
});
test("YDD resolves drawables, LODs, shader samplers, indexed triangles and UV orientation", () => {
  const doc = parseYdd(makeYdd());
  assert.equal(doc.drawables.length, 2);
  const first = doc.drawables[0];
  assert.deepEqual(first.lods, ["High", "Low"]);
  assert.equal(first.shaders[0].diffuseName, "cloth_diffuse");
  const mesh = first.readLod()[0];
  assert.equal(mesh.vertexCount, 3);
  assert.equal(mesh.triangleCount, 1);
  assert.deepEqual(Array.from(mesh.indices), [0, 1, 2]);
  assert.deepEqual(Array.from(mesh.uvs), [0, 0, 1, 0, 0.5, 1]);
  assert.equal(mesh.positions[7], 2);
  assert.equal(first.readLod(1)[0].positions[7], 2);
  assert.throws(() => first.readLod(2), /LOD/);
  assert.equal(halfFloat(0x3c00), 1);
  assert.equal(halfFloat(0xbc00), -1);
  assert.equal(halfFloat(1), 2 ** -24);
});
test("malformed YDD indices and missing UVs fail instead of producing invalid meshes", () => {
  const missing = makeResource(165, ({ ptr, u16, text, u32 }) => {
    ptr(0x30, 0x100);
    u16(0x38, 1);
    u16(0x3a, 1);
    ptr(0x100, 0x200);
    ptr(0x2a8, 0x400);
    text(0x400, "empty");
    u32(0x450, 1);
  });
  assert.throws(() => parseYdd(missing), /LOD/);
  const r = openResource(makeYdd(), 165);
  new DataView(r.data.buffer).setUint16(r.systemSize + 0x100, 99, true);
  assert.throws(() => parseYdd(r.pack()).drawables[0].readLod(), /Índice/);
  new DataView(r.data.buffer).setUint32(0x600, 9, true);
  assert.throws(() => parseYdd(r.pack()).drawables[0].readLod(), /UV0/);
});
test("BC1 transparency, BC2 explicit alpha and BC3 interpolated alpha", () => {
  const bc1 = new Uint8Array([0, 0, 255, 255, 255, 255, 255, 255]);
  assert.deepEqual(
    Array.from(decodePixels(bc1, 4, 4, 0x31545844).slice(0, 4)),
    [0, 0, 0, 0],
  );
  const bc2 = new Uint8Array(16);
  bc2.fill(0x88, 0, 8);
  bc2[8] = 0;
  bc2[9] = 0xf8;
  assert.deepEqual(
    Array.from(decodePixels(bc2, 4, 4, 0x33545844).slice(0, 4)),
    [255, 0, 0, 136],
  );
  const bc3 = new Uint8Array(16);
  bc3[0] = 220;
  bc3[1] = 20;
  bc3[2] = 2;
  bc3[8] = 0;
  bc3[9] = 0xf8;
  assert.equal(decodePixels(bc3, 4, 4, 0x35545844)[3], 191);
});
test("DXT encoders round-trip transparency, non-multiple block sizes, and RGB values", () => {
  for (const format of [0x31545844, 0x33545844, 0x35545844, 21, 22, 32]) {
    const w = 5,
      h = 3,
      rgba = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < rgba.length; i += 4)
      rgba.set([40, 180, 220, format === 22 ? 255 : 153], i);
    const encoded = encodePixels(rgba, w, h, format),
      decoded = decodePixels(encoded, w, h, format);
    for (let i = 0; i < decoded.length; i += 4) {
      assert.ok(Math.abs(decoded[i] - 40) <= 9);
      assert.ok(Math.abs(decoded[i + 1] - 180) <= 9);
      assert.ok(Math.abs(decoded[i + 2] - 220) <= 9);
      if (format !== 0x31545844)
        assert.ok(Math.abs(decoded[i + 3] - rgba[i + 3]) <= 9);
    }
  }
});

test("embedded YDD textures can be edited without changing geometry or resource type", () => {
  const before = parseYdd(makeYdd(true));
  const entry = before.drawables[0].textures[0];
  assert.equal(entry.name, "cloth_diffuse");
  assert.deepEqual(Array.from(entry.decode().slice(0, 4)), [255, 0, 0, 255]);
  const rgba = entry.decode();
  for (let i = 0; i < rgba.length; i += 4) rgba.set([0, 255, 0, 255], i);
  const saved = writeYtd(
    { resource: before.resource, textures: [entry] },
    new Map([[entry.key, [rgba]]]),
  );
  const after = parseYdd(saved);
  assert.deepEqual(
    Array.from(after.drawables[0].textures[0].decode().slice(0, 4)),
    [0, 255, 0, 255],
  );
  assert.deepEqual(
    after.drawables[0].readLod()[0].positions,
    before.drawables[0].readLod()[0].positions,
  );
  assert.deepEqual(
    after.drawables[0].readLod()[0].indices,
    before.drawables[0].readLod()[0].indices,
  );
});


test("YFT v162 resolves principal FragDrawable, LODs and rejects corrupt roots", async () => {
  const { parseYft } = await import("../src/formats/yft.js");
  const { makeYft } = await import("./fixtures.js");
  const bytes = makeYft();
  const doc = parseYft(bytes);
  assert.equal(doc.format, "yft");
  assert.equal(doc.drawables.length, 1);
  assert.equal(doc.drawables[0].name, "test_clothing_0");
  assert.equal(doc.drawables[0].readLod()[0].triangleCount, 1);
  const bad = doc.resource;
  bad.view.setUint32(0x48, 513, true);
  assert.throws(() => parseYft(bad.pack()), /limite/);
  bad.view.setUint32(0x48, 0, true);
  bad.view.setUint32(0x30, 0, true);
  assert.throws(() => parseYft(bad.pack()), /visualizável/);
  assert.throws(() => parseYft(makeYdd()), /Versão/);
});

test("YFT preserves secondary sampler and distinct UV1 used by liveries", async () => {
  const { parseYft } = await import("../src/formats/yft.js");
  const { makeYft } = await import("./fixtures.js");
  const r = parseYft(makeYft()).resource;
  const view = r.view, system = r.systemSize;
  const vertices = r.data.slice(system, system + 96);
  view.setUint16(0x508, 40, true);
  view.setUint32(0x600, 0xc9, true);
  view.setUint32(0x608, 0x55006006, true);
  for (let i = 0; i < 3; i++) {
    r.data.set(vertices.subarray(i * 32, i * 32 + 32), system + i * 40);
    view.setFloat32(system + i * 40 + 32, 0.25, true);
    view.setFloat32(system + i * 40 + 36, 0.75, true);
  }
  view.setUint8(0x1910, 2);
  view.setUint32(0x1a10, 0, true);
  view.setUint32(0x1a18, 0x50001b80, true);
  view.setUint32(0x1a20, jenkins("DiffuseSampler"), true);
  view.setUint32(0x1a24, jenkins("DiffuseSampler2"), true);
  view.setUint32(0x1ba8, 0x50001cc0, true);
  r.data.set(new TextEncoder().encode("vehicle_sign_1\0"), 0x1cc0);
  const doc = parseYft(r.pack()), drawable = doc.drawables[0];
  assert.equal(drawable.shaders[0].diffuseName, "cloth_diffuse");
  assert.equal(drawable.shaders[0].liveryName, "vehicle_sign_1");
  const mesh = drawable.readLod()[0];
  assert.deepEqual([...mesh.uvs1], [0.25, 0.25, 0.25, 0.25, 0.25, 0.25]);
  assert.notDeepEqual(mesh.uvs, mesh.uvs1);
});
