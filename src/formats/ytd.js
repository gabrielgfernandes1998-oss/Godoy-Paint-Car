import { openResource } from "./resource.js";
import {
  FORMATS,
  levelSize,
  decodePixels,
  encodePixels,
  supportedFormat,
} from "./pixels.js";
export function readTextureDictionary(resource, offset = 0) {
  resource.range(offset, 64);
  const pointers = resource.list(offset + 0x30, 2048);
  return pointers
    .filter((p) => p !== null)
    .map((pointer, index) => {
      resource.range(pointer, 144);
      const name =
        resource.stringAtPointer(pointer + 0x28) || `texture_${index}`;
      const width = resource.u16(pointer + 0x50),
        height = resource.u16(pointer + 0x52),
        depth = resource.u16(pointer + 0x54),
        stride = resource.u16(pointer + 0x56),
        format = resource.u32(pointer + 0x58),
        levels = resource.u8(pointer + 0x5d);
      if (
        !width ||
        !height ||
        width > 8192 ||
        height > 8192 ||
        width * height > 16777216 ||
        depth !== 1 ||
        !levels ||
        levels > Math.floor(Math.log2(Math.max(width, height))) + 1
      )
        throw Error(
          `Dimensões, profundidade ou mipmaps inválidos em ${name}. Apenas texturas 2D de até 16 megapixels são suportadas.`,
        );
      let bytes = 0,
        w = width,
        h = height;
      const mipmaps = [];
      for (let level = 0; level < levels; level++) {
        const rowStride = level === 0 ? stride : 0;
        const length = levelSize(w, h, format, rowStride);
        mipmaps.push({
          width: w,
          height: h,
          offset: bytes,
          length,
          stride: rowStride,
        });
        bytes += length;
        w = Math.max(1, w >> 1);
        h = Math.max(1, h >> 1);
      }
      const dataOffset = resource.ptr(pointer + 0x70, bytes, false);
      const key = `${name.toLowerCase()}#${pointer.toString(16)}`;
      return {
        key,
        name,
        width,
        height,
        depth,
        stride,
        format,
        formatName: FORMATS.get(format) || `0x${format.toString(16)}`,
        levels,
        pointer,
        dataOffset,
        byteLength: bytes,
        mipmaps,
        supported: supportedFormat(format),
        decode() {
          return decodePixels(
            resource.data.subarray(dataOffset, dataOffset + mipmaps[0].length),
            width,
            height,
            format,
            stride,
          );
        },
      };
    });
}
export function parseYtd(input) {
  const resource = openResource(input, 13),
    textures = readTextureDictionary(resource);
  if (!textures.length) throw Error("O YTD não contém texturas.");
  return { resource, textures };
}
export function writeYtd(document, edits) {
  const data = document.resource.data.slice();
  for (const [key, mips] of edits) {
    const entry = document.textures.find((t) => t.key === key);
    if (!entry) throw Error("Textura editada não pertence ao YTD.");
    if (
      document.textures.some(
        (other) =>
          other.key !== key &&
          other.dataOffset < entry.dataOffset + entry.byteLength &&
          other.dataOffset + other.byteLength > entry.dataOffset,
      )
    )
      throw Error(
        "Texturas compartilham blocos de dados. Exporte PNG para evitar alterar outra textura.",
      );
    if (mips.length !== entry.levels)
      throw Error("A exportação precisa regenerar todos os mipmaps.");
    entry.mipmaps.forEach((mip, index) => {
      const pixels = mips[index];
      if (pixels.length !== mip.width * mip.height * 4)
        throw Error("Dimensões de mipmap incompatíveis.");
      const encoded = encodePixels(
        pixels,
        mip.width,
        mip.height,
        entry.format,
        mip.stride,
      );
      data.set(encoded, entry.dataOffset + mip.offset);
    });
  }
  return document.resource.pack(data);
}
export const canWriteTexture = (texture) =>
  ["BGRA8", "BGRX8", "RGBA8", "DXT1", "DXT3", "DXT5"].includes(
    texture.formatName,
  );
