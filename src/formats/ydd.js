import { openResource, jenkins } from "./resource.js";
import { readTextureDictionary } from "./ytd.js";
const componentBytes = [0, 4, 4, 8, 0, 8, 12, 16, 4, 4, 4, 0, 0, 0, 0, 0];
const samplerHashes = new Set(
  ["DiffuseSampler", "DiffuseSampler2", "PlateBgSampler"].map(jenkins),
);
export function halfFloat(n) {
  const sign = n & 0x8000 ? -1 : 1,
    e = (n >>> 10) & 31,
    m = n & 1023;
  return e === 0
    ? sign * 2 ** -14 * (m / 1024)
    : e === 31
      ? m
        ? NaN
        : sign * Infinity
      : sign * 2 ** (e - 15) * (1 + m / 1024);
}
function declaration(resource, pointer, stride) {
  resource.range(pointer, 16);
  const flags = resource.u32(pointer),
    low = resource.u32(pointer + 8),
    high = resource.u32(pointer + 12),
    components = new Map();
  let offset = 0;
  for (let i = 0; i < 16; i++)
    if (flags & (1 << i)) {
      const type = ((i < 8 ? low : high) >>> ((i % 8) * 4)) & 15,
        length = componentBytes[type];
      if (!length)
        throw Error(`Componente de vértice ${type} ainda não suportado.`);
      components.set(i, { type, offset, length });
      offset += length;
    }
  if (
    offset > stride ||
    stride > 1024 ||
    !components.has(0) ||
    !components.has(6)
  )
    throw Error(
      "Geometria sem posição/UV0 ou com layout de vértices inválido.",
    );
  return components;
}
function vector(resource, pointer, component, count) {
  const { type, offset, length } = component,
    start = pointer + offset;
  resource.range(start, length);
  const values = [];
  if ([2, 5, 6, 7].includes(type)) {
    if (length < count * 4) throw Error("Componente de vértice incompleto.");
    for (let i = 0; i < count; i++) values.push(resource.f32(start + i * 4));
  } else if (type === 1 || type === 3) {
    if (length < count * 2) throw Error("Componente half incompleto.");
    for (let i = 0; i < count; i++)
      values.push(halfFloat(resource.u16(start + i * 2)));
  } else if (type === 10) {
    for (let i = 0; i < count; i++) {
      const n = resource.u8(start + i);
      values.push(Math.max(-1, (n > 127 ? n - 256 : n) / 127));
    }
  } else throw Error(`Tipo de posição/UV/normal ${type} não suportado.`);
  if (values.some((n) => !Number.isFinite(n) || Math.abs(n) > 1e8))
    throw Error("Coordenadas não finitas ou fora do limite.");
  return values;
}
function readGeometry(r, pointer, shaderIndex) {
  r.range(pointer, 152);
  const vb = r.ptr(pointer + 0x18, 128, false),
    ib = r.ptr(pointer + 0x38, 96, false),
    stride = r.u16(vb + 8),
    vertexCount = r.u32(vb + 0x18),
    indexCount = r.u32(ib + 8);
  if (
    !vertexCount ||
    vertexCount > 1000000 ||
    !indexCount ||
    indexCount > 6000000 ||
    indexCount % 3
  )
    throw Error("Contagem de vértices/triângulos inválida ou grande demais.");
  const vertices =
      r.ptr(vb + 0x10, vertexCount * stride) ??
      r.ptr(vb + 0x20, vertexCount * stride, false),
    indicesPointer = r.ptr(ib + 0x10, indexCount * 2, false),
    decl = declaration(r, r.ptr(vb + 0x30, 16, false), stride);
  const positions = new Float32Array(vertexCount * 3),
    uvs = new Float32Array(vertexCount * 2),
    uvs1 = decl.has(7) ? new Float32Array(vertexCount * 2) : null,
    normals = decl.has(3) ? new Float32Array(vertexCount * 3) : null,
    indices = new Uint16Array(indexCount);
  for (let i = 0; i < vertexCount; i++) {
    const p = vertices + i * stride,
      [x, y, z] = vector(r, p, decl.get(0), 3),
      [u, v] = vector(r, p, decl.get(6), 2);
    positions.set([x, z, -y], i * 3);
    uvs.set([u, 1 - v], i * 2);
    if (uvs1) {
      const [u1, v1] = vector(r, p, decl.get(7), 2);
      uvs1.set([u1, 1 - v1], i * 2);
    }
    if (normals) {
      const [nx, ny, nz] = vector(r, p, decl.get(3), 3);
      normals.set([nx, nz, -ny], i * 3);
    }
  }
  for (let i = 0; i < indexCount; i++) {
    const index = r.u16(indicesPointer + i * 2);
    if (index >= vertexCount)
      throw Error("Índice de triângulo fora dos vértices.");
    indices[i] = index;
  }
  return {
    positions,
    uvs,
    uvs1,
    normals,
    indices,
    shaderIndex,
    vertexCount,
    triangleCount: indexCount / 3,
  };
}
function readShaders(r, pointer) {
  if (pointer === null) return { shaders: [], textures: [] };
  r.range(pointer, 64);
  const shaderList = r.list(pointer + 0x10, 512),
    embedded = r.ptr(pointer + 8, 64);
  const shaders = shaderList.map((p) => {
    if (p === null) return { diffuseName: "", textures: [] };
    r.range(p, 48);
    const count = r.u8(p + 0x10),
      params = r.ptr(p, count * 16),
      textures = [];
    let valueBytes = 0;
    if (params === null) return { diffuseName: "", textures };
    for (let i = 0; i < count; i++) valueBytes += r.u8(params + i * 16) * 16;
    const hashes = params + count * 16 + valueBytes;
    r.range(hashes, count * 4);
    for (let i = 0; i < count; i++)
      if (r.u8(params + i * 16) === 0) {
        const tp = r.ptr(params + i * 16 + 8, 80);
        if (tp !== null) {
          const name = r.stringAtPointer(tp + 0x28);
          if (name) textures.push({ name, hash: r.u32(hashes + i * 4) });
        }
      }
    const diffuse = textures.find((t) => samplerHashes.has(t.hash));
    return { diffuseName: diffuse?.name || textures[0]?.name || "", liveryName: textures.find(t => t.hash === jenkins("DiffuseSampler2"))?.name || "", textures };
  });
  return {
    shaders,
    textures: embedded === null ? [] : readTextureDictionary(r, embedded),
  };
}
export function parseYdd(input) {
  const resource = openResource(input, 165),
    pointers = resource.list(0x30, 512);
  if (!pointers.length) throw Error("O YDD não contém drawables.");
  const drawables = pointers
    .filter((p) => p !== null)
    .map((p, index) => {
      return readDrawable(resource, p, index);
    });
  return { resource, drawables };
}

export function readDrawable(resource, p, index = 0, nameOffset = 0xa8) {
      resource.range(p, nameOffset + 8);
      const name = resource.stringAtPointer(p + nameOffset) || `drawable_${index}`,
        lods = [];
      for (const [offset, label] of [
        [0x50, "High"],
        [0x58, "Medium"],
        [0x60, "Low"],
        [0x68, "Very Low"],
      ]) {
        const list = resource.ptr(p + offset, 16);
        if (list !== null) {
          const models = resource.list(list, 1024).filter((v) => v !== null);
          if (models.length) lods.push({ label, models });
        }
      }
      if (!lods.length)
        throw Error(`O drawable ${name} não tem modelos de LOD.`);
      const shaderGroup = readShaders(resource, resource.ptr(p + 0x10, 64));
      return {
        name,
        lods: lods.map((l) => l.label),
        shaders: shaderGroup.shaders,
        textures: shaderGroup.textures,
        readLod(lodIndex = 0) {
          if (!lods[lodIndex]) throw Error("LOD não encontrado.");
          const result = [];
          let totalVertices = 0,
            totalIndices = 0;
          for (const m of lods[lodIndex].models) {
            resource.range(m, 48);
            const geometries = resource.list(m + 8, 1024),
              mapping = resource.ptr(m + 0x20, geometries.length * 2);
            for (let i = 0; i < geometries.length; i++) {
              if (geometries[i] === null) continue;
              const geometry = readGeometry(
                resource,
                geometries[i],
                mapping === null ? 0 : resource.u16(mapping + i * 2),
              );
              totalVertices += geometry.vertexCount;
              totalIndices += geometry.indices.length;
              if (totalVertices > 2000000 || totalIndices > 12000000)
                throw Error(
                  "O modelo ultrapassa o limite de geometria desta versão.",
                );
              result.push(geometry);
            }
          }
          if (!result.length) throw Error("O LOD não contém geometrias.");
          return result;
        },
      };
}
