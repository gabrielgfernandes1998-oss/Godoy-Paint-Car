const topologyCache = new WeakMap();
const vertexKey = (positions, uvs, i) =>
  [
    positions[i * 3],
    positions[i * 3 + 1],
    positions[i * 3 + 2],
    uvs[i * 2],
    uvs[i * 2 + 1],
  ]
    .map((v) => Math.round(v * 100000))
    .join(",");
export function islandFaces(positions, uvs, indices, face) {
  const count = indices.length / 3;
  if (face < 0 || face >= count) return [];
  const edges = new Map(),
    adj = Array.from({ length: count }, () => []),
    keys = Array.from({ length: positions.length / 3 }, (_, i) =>
      vertexKey(positions, uvs, i),
    );
  for (let t = 0; t < count; t++)
    for (let e = 0; e < 3; e++) {
      const a = keys[indices[t * 3 + e]],
        b = keys[indices[t * 3 + ((e + 1) % 3)]],
        key = a < b ? a + "|" + b : b + "|" + a;
      const prior = edges.get(key);
      if (prior !== undefined) {
        adj[t].push(prior);
        adj[prior].push(t);
      } else edges.set(key, t);
    }
  const visited = new Uint8Array(count),
    stack = [face],
    result = [];
  visited[face] = 1;
  while (stack.length) {
    const t = stack.pop();
    result.push(t);
    for (const n of adj[t])
      if (!visited[n]) {
        visited[n] = 1;
        stack.push(n);
      }
  }
  return result;
}
function indices(geometry) {
  return (
    geometry.index?.array ||
    Uint32Array.from(
      { length: geometry.attributes.position.count },
      (_, i) => i,
    )
  );
}
export function meshIsland(mesh, face) {
  const g = mesh.geometry;
  let cache = topologyCache.get(g);
  if (!cache) {
    cache = new Map();
    topologyCache.set(g, cache);
  }
  if (cache.has(face)) return cache.get(face);
  const result = islandFaces(
    g.attributes.position.array,
    g.attributes.uv.array,
    indices(g),
    face,
  );
  for (const f of result) cache.set(f, result);
  return result;
}
export function triangleUV(mesh, face) {
  const g = mesh.geometry,
    uv = g.attributes.uv;
  return [0, 1, 2].map((i) => {
    const v = g.index ? g.index.getX(face * 3 + i) : face * 3 + i;
    return { x: uv.getX(v), y: uv.getY(v) };
  });
}
export function containsUV(p, a, b, c) {
  const cross = (x, y, z) =>
    (x.x - z.x) * (y.y - z.y) - (y.x - z.x) * (x.y - z.y);
  const d1 = cross(p, a, b),
    d2 = cross(p, b, c),
    d3 = cross(p, c, a);
  return (
    !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)) &&
    Math.abs(cross(a, b, c)) > 1e-10
  );
}
export function findUVFace(meshes, uv) {
  for (const mesh of meshes) {
    const g = mesh.geometry;
    if (!g.attributes.uv) continue;
    const count = (g.index?.count || g.attributes.position.count) / 3;
    for (let t = 0; t < count; t++) {
      const tri = triangleUV(mesh, t),
        minX = Math.floor(Math.min(...tri.map((p) => p.x))),
        maxX = Math.floor(Math.max(...tri.map((p) => p.x))),
        minY = Math.floor(Math.min(...tri.map((p) => p.y))),
        maxY = Math.floor(Math.max(...tri.map((p) => p.y)));
      if (maxX - minX > 8 || maxY - minY > 8) continue;
      for (let x = minX; x <= maxX; x++)
        for (let y = minY; y <= maxY; y++)
          if (containsUV({ x: uv.x + x, y: uv.y + y }, ...tri))
            return { mesh, face: t };
    }
  }
  return null;
}
export function uvMask(width, height, items) {
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const c = out.getContext("2d");
  c.fillStyle = "#ffffff";
  for (const { mesh, faces } of items)
    for (const face of faces) {
      const p = triangleUV(mesh, face),
        minX = Math.floor(Math.min(...p.map((v) => v.x))),
        maxX = Math.floor(Math.max(...p.map((v) => v.x))),
        minY = Math.floor(Math.min(...p.map((v) => v.y))),
        maxY = Math.floor(Math.max(...p.map((v) => v.y)));
      if (maxX - minX > 8 || maxY - minY > 8)
        throw Error(
          "UV muito repetido para esta seleção; escolha outra superfície.",
        );
      for (let x = minX; x <= maxX; x++)
        for (let y = minY; y <= maxY; y++) {
          c.beginPath();
          p.forEach((v, i) => {
            const px = (v.x - x) * width,
              py = (1 - v.y + y) * height;
            i ? c.lineTo(px, py) : c.moveTo(px, py);
          });
          c.closePath();
          c.fill();
        }
    }
  return out;
}
export function allFaces(mesh) {
  return Array.from(
    {
      length:
        (mesh.geometry.index?.count ||
          mesh.geometry.attributes.position.count) / 3,
    },
    (_, i) => i,
  );
}
