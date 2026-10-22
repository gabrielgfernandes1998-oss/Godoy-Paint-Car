import { readdir, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";
import { parseYdd } from "../src/formats/ydd.js";
import { parseYft } from "../src/formats/yft.js";
import { parseYtd, writeYtd } from "../src/formats/ytd.js";
const directory = process.argv[2];
if (!directory) throw Error("Uso: npm run test:assets -- /pasta/com/yft-ydd-ytd");
let models = 0, textures = 0, lods = 0;
for (const file of await readdir(directory, {recursive:true,withFileTypes:true})) {
  if (!file.isFile() || !/\.(ydd|yft|ytd)$/i.test(file.name)) continue;
  const input = await readFile(path.join(file.parentPath, file.name));
  if (/\.(ydd|yft)$/i.test(file.name)) {
    const doc = (/\.yft$/i.test(file.name) ? parseYft : parseYdd)(input);
    for (const drawable of doc.drawables) for (let i = 0; i < drawable.lods.length; i++) {
      const meshes = drawable.readLod(i);
      assert.ok(meshes.length && meshes.every(m => m.vertexCount > 0 && m.triangleCount > 0));
      lods++;
    }
    models++;
    console.log("Modelo OK:", file.name);
  } else {
    const doc = parseYtd(input);
    for (const entry of doc.textures) {
      assert.ok(entry.supported, `Formato não suportado: ${entry.formatName}`);
      assert.equal(entry.decode().length, entry.width * entry.height * 4);
      textures++;
    }
    assert.deepEqual(parseYtd(writeYtd(doc, new Map())).resource.data, doc.resource.data);
    console.log("YTD OK:", file.name);
  }
}
assert.ok(models && textures, "Forneça pelo menos um modelo YFT/YDD e um YTD.");
console.log(`PASS: ${models} modelos, ${lods} LODs e ${textures} texturas; exportação sem edições preserva bytes descomprimidos.`);
