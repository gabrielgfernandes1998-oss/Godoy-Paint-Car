import { openResource } from "./resource.js";
import { readDrawable } from "./ydd.js";

// GTA V Legacy FragType (v162): principal drawable at 0x30,
// optional drawable array at 0x38; FragDrawable name at 0x130.
export function parseYft(input) {
  const resource = openResource(input, 162);
  resource.range(0, 304);
  const main = resource.ptr(0x30, 336);
  const count = resource.u32(0x48);
  if (count > 512) throw Error("Quantidade de modelos YFT acima do limite.");
  const array = resource.ptr(0x38, count * 8);
  if (count && array === null) throw Error("Lista de modelos YFT sem ponteiro.");
  const pointers = main === null ? [] : [main];
  for (let i = 0; i < count; i++) {
    const p = resource.ptr(array + i * 8, 336);
    if (p !== null && !pointers.includes(p)) pointers.push(p);
  }
  if (!pointers.length) throw Error("O YFT não contém um modelo visualizável.");
  const drawables = pointers.map((p, i) => readDrawable(resource, p, i, 0x130));
  return { resource, drawables, format: "yft" };
}
