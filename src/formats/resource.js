import { inflateSync, deflateSync } from "fflate";

export const MAX_RESOURCE_BYTES = 256 * 1024 * 1024;
const MAX_INPUT_BYTES = 80 * 1024 * 1024;
export function pageSize(flags) {
  const fields = [
    [27, 1, 1],
    [26, 1, 2],
    [25, 1, 4],
    [24, 1, 8],
    [17, 127, 16],
    [11, 63, 32],
    [7, 15, 64],
    [5, 3, 128],
    [4, 1, 256],
  ];
  return (
    fields.reduce(
      (sum, [shift, mask, weight]) => sum + ((flags >>> shift) & mask) * weight,
      0,
    ) *
    (512 * 2 ** (flags & 15))
  );
}
export function openResource(input, expectedVersion) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < 17 || bytes.length > MAX_INPUT_BYTES)
    throw Error("Recurso vazio, truncado ou maior que 80 MB.");
  const header = new DataView(bytes.buffer, bytes.byteOffset, 16);
  if (header.getUint32(0, true) !== 0x37435352)
    throw Error(
      "Arquivo não é um recurso RSC7. Recursos protegidos/criptografados e arquivos RPF não são suportados.",
    );
  const version = header.getUint32(4, true);
  if (version !== expectedVersion)
    throw Error(
      `Versão de recurso ${version} não suportada. Use arquivos GTA V Legacy/FiveM (versão ${expectedVersion}); Enhanced/Gen9 não é suportado.`,
    );
  const systemSize = pageSize(header.getUint32(8, true)),
    graphicsSize = pageSize(header.getUint32(12, true)),
    total = systemSize + graphicsSize;
  if (systemSize < 64 || total > MAX_RESOURCE_BYTES || total < systemSize)
    throw Error(
      "Tamanho de recurso inválido ou acima do limite de 256 MB descomprimidos.",
    );
  let data;
  try {
    data = inflateSync(bytes.subarray(16), { out: new Uint8Array(total + 1) });
  } catch {
    throw Error(
      "Não foi possível descomprimir o recurso RSC7. O arquivo pode estar corrompido ou protegido.",
    );
  }
  if (data.length !== total)
    throw Error(
      "O tamanho descomprimido não corresponde às páginas do recurso RSC7.",
    );
  return new Resource(data, systemSize, graphicsSize, bytes.slice(0, 16));
}
export class Resource {
  constructor(data, systemSize, graphicsSize, header) {
    this.data = data;
    this.systemSize = systemSize;
    this.graphicsSize = graphicsSize;
    this.header = header;
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }
  range(offset, length = 1) {
    if (
      !Number.isSafeInteger(offset) ||
      !Number.isSafeInteger(length) ||
      offset < 0 ||
      length < 0 ||
      offset + length > this.data.length
    )
      throw Error("Ponteiro ou tamanho fora dos limites do recurso.");
    return offset;
  }
  u8(o) {
    this.range(o);
    return this.view.getUint8(o);
  }
  u16(o) {
    this.range(o, 2);
    return this.view.getUint16(o, true);
  }
  u32(o) {
    this.range(o, 4);
    return this.view.getUint32(o, true);
  }
  f32(o) {
    this.range(o, 4);
    const n = this.view.getFloat32(o, true);
    if (!Number.isFinite(n)) throw Error("Coordenada inválida no modelo.");
    return n;
  }
  ptr(o, length = 1, nullable = true) {
    const lo = this.u32(o),
      hi = this.u32(o + 4);
    if (!lo && !hi && nullable) return null;
    if (hi !== 0) throw Error("Ponteiro de recurso de 64 bits inválido.");
    const region = lo >>> 28,
      offset = lo & 0x0fffffff;
    const limit =
      region === 5 ? this.systemSize : region === 6 ? this.graphicsSize : -1;
    if (limit < 0 || offset + length > limit)
      throw Error("Ponteiro fora das páginas de sistema/gráficos.");
    return this.range((region === 6 ? this.systemSize : 0) + offset, length);
  }
  stringAtPointer(o) {
    const start = this.ptr(o);
    if (start === null) return "";
    const limit = start < this.systemSize ? this.systemSize : this.data.length;
    let end = start;
    while (end < Math.min(start + 1024, limit) && this.data[end] !== 0) end++;
    if (end === Math.min(start + 1024, limit))
      throw Error("Nome sem terminação no recurso.");
    return new TextDecoder().decode(this.data.subarray(start, end));
  }
  list(o, max = 4096) {
    const count = this.u16(o + 8),
      capacity = this.u16(o + 10);
    if (count > max || capacity < count)
      throw Error("Lista de recursos inválida ou grande demais.");
    const p = this.ptr(o, count * 8);
    if (count && p === null) throw Error("Lista sem ponteiro.");
    return Array.from({ length: count }, (_, i) => this.ptr(p + i * 8));
  }
  pack(data = this.data) {
    if (data.length !== this.data.length)
      throw Error("A exportação não pode alterar o layout do recurso.");
    const compressed = deflateSync(data, { level: 6 });
    const result = new Uint8Array(16 + compressed.length);
    result.set(this.header);
    result.set(compressed, 16);
    return result;
  }
}
export function jenkins(name) {
  let hash = 0;
  for (const byte of new TextEncoder().encode(name.toLowerCase())) {
    hash = (hash + byte) >>> 0;
    hash = (hash + (hash << 10)) >>> 0;
    hash ^= hash >>> 6;
  }
  hash = (hash + (hash << 3)) >>> 0;
  hash ^= hash >>> 11;
  return (hash + (hash << 15)) >>> 0;
}
