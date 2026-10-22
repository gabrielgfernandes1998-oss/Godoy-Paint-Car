import { chromium } from "playwright";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { twoIslandsModel, redTexture } from "./advanced-fixtures.js";
import { parseYtd } from "../src/formats/ytd.js";
const output = await fs.mkdtemp(path.join(os.tmpdir(), "godoy-advanced-")),
  port = 4201;
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--strictPort",
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let logs = "",
  browser;
server.stdout.on("data", (d) => (logs += d));
server.stderr.on("data", (d) => (logs += d));
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw Error(logs);
    try {
      if ((await fetch(`http://127.0.0.1:${port}`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  assert.ok(ready);
  browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    headless: true,
    args: [
      "--no-sandbox",
      "--enable-unsafe-swiftshader",
      "--use-gl=angle",
      "--use-angle=swiftshader",
    ],
  });
  const page = await browser.newPage({
      viewport: { width: 1600, height: 1150 },
      acceptDownloads: true,
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto(`http://127.0.0.1:${port}`);
  const input = async (id, v) =>
    page.locator(id).evaluate((el, v) => {
      el.value = String(v);
      el.dispatchEvent(new Event("input"));
    }, v);
  const color = (v) => input("#color", v);
  async function load() {
    await page.locator("#model-file").setInputFiles({
      name: "two-islands.ydd",
      mimeType: "application/octet-stream",
      buffer: Buffer.from(twoIslandsModel()),
    });
    await page.waitForFunction(() =>
      document.querySelector("#asset-type").textContent.includes("YDD NATIVO"),
    );
    await page.locator("#ytd-file").setInputFiles({
      name: "red.ytd",
      mimeType: "application/octet-stream",
      buffer: Buffer.from(redTexture()),
    });
    await page.waitForFunction(
      () =>
        document.querySelector("#texture-name").textContent === "cloth_diffuse",
    );
    await page.click("#tab-uv");
  }
  const point = async (x, y) =>
    page.locator("#uv-view").evaluate(
      (c, [u, v]) => {
        const r = c.getBoundingClientRect(),
          s = Math.min(r.width / c.width, r.height / c.height),
          w = c.width * s,
          h = c.height * s;
        return {
          x: r.left + (r.width - w) / 2 + u * w,
          y: r.top + (r.height - h) / 2 + v * h,
        };
      },
      [x, y],
    );
  async function click(x, y) {
    const p = await point(x, y);
    await page.mouse.click(p.x, p.y);
  }
  async function drag(x, y, x2, y2) {
    const a = await point(x, y),
      b = await point(x2, y2);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 5 });
    await page.mouse.up();
  }
  const pixel = (x, y) =>
    page
      .locator("#uv-view")
      .evaluate(
        (c, [u, v]) => [
          ...c
            .getContext("2d")
            .getImageData(
              Math.floor(u * c.width),
              Math.floor(v * c.height),
              1,
              1,
            ).data,
        ],
        [x, y],
      );
  const near = (a, b) =>
    assert.ok(
      a.every((v, i) => Math.abs(v - b[i]) <= 2),
      `${a} != ${b}`,
    );
  async function save(name) {
    const d = page.waitForEvent("download");
    await page.click("#save-project");
    const file = path.join(output, name + ".paintfive");
    await (await d).saveAs(file);
    return { file, json: JSON.parse(await fs.readFile(file, "utf8")) };
  }
  await load();
  await page.click("[data-tool=line]");
  await color("#00ffff");
  await input("#size", 2);
  await drag(0.2, 0.9, 0.8, 0.9);
  near(await pixel(0.3, 0.9), [0, 255, 255, 255]);
  near(await pixel(0.7, 0.9), [0, 255, 255, 255]);
  await page.click("#undo");
  await page.click("[data-tool=rect]");
  await color("#0000ff");
  await page.check("#shape-fill");
  await input("#shape-stroke", 1);
  await drag(0.15, 0.15, 0.85, 0.85);
  near(await pixel(0.5, 0.5), [0, 0, 255, 255]);
  assert.equal(await page.locator("[data-layer-type=shape]").count(), 1);
  await page.selectOption("#layer-blend", "multiply");
  near(await pixel(0.5, 0.5), [0, 0, 0, 255]);
  await page.selectOption("#layer-blend", "screen");
  near(await pixel(0.5, 0.5), [255, 0, 255, 255]);
  await page.selectOption("#layer-blend", "overlay");
  near(await pixel(0.5, 0.5), [255, 0, 0, 255]);
  await page.selectOption("#layer-blend", "source-over");
  await input("#layer-opacity", 50);
  near(await pixel(0.5, 0.5), [128, 0, 128, 255]);
  await input("#layer-opacity", 100);
  await input("#layer-brightness", 50);
  near(await pixel(0.5, 0.5), [0, 0, 128, 255]);
  await input("#layer-brightness", 100);
  await input("#layer-contrast", 0);
  near(await pixel(0.5, 0.5), [128, 128, 128, 255]);
  await input("#layer-contrast", 100);
  // Flood fill stops at the blue rectangle instead of replacing the whole material.
  await page.click("[data-tool=bucket]");
  await color("#00ff00");
  await page.selectOption("#bucket-mode", "contiguous");
  await click(0.03, 0.03);
  near(await pixel(0.03, 0.03), [0, 255, 0, 255]);
  near(await pixel(0.5, 0.5), [0, 0, 255, 255]);
  await page.click("#undo");
  near(await pixel(0.03, 0.03), [255, 0, 0, 255]);
  await page.click("#redo");
  near(await pixel(0.03, 0.03), [0, 255, 0, 255]);
  console.log(
    "PASS: Normal/Multiply/Screen/Overlay, opacidade, brilho, contraste, preenchimento delimitado e histórico.",
  );
  // A fresh texture lets us prove masks prevent writes into an adjacent UV island.
  await page.locator("#ytd-file").setInputFiles({
    name: "mask-test.ytd",
    mimeType: "application/octet-stream",
    buffer: Buffer.from(redTexture()),
  });
  await page.click("[data-tool=island]");
  await click(0.2, 0.5);
  assert.match(
    await page.locator("#selection-info").textContent(),
    /Máscara ativa/,
  );
  await page.click("[data-tool=brush]");
  await color("#0000ff");
  await input("#opacity", 50);
  await input("#softness", 0);
  await input("#size", 6);
  await click(0.2, 0.5);
  near(await pixel(0.2, 0.5), [128, 0, 128, 255]);
  await page.click("#undo");
  await page.click("[data-tool=bucket]");
  await color("#00ff00");
  await page.selectOption("#bucket-mode", "material");
  await click(0.2, 0.5);
  near(await pixel(0.2, 0.5), [128, 128, 0, 255]);
  await page.click("#undo");
  await input("#opacity", 100);
  await click(0.2, 0.5);
  near(await pixel(0.2, 0.5), [0, 255, 0, 255]);
  near(await pixel(0.8, 0.5), [255, 0, 0, 255]);
  await page.click("[data-tool=brush]");
  await color("#0000ff");
  await input("#size", 12);
  await input("#softness", 0);
  await drag(0.1, 0.7, 0.9, 0.7);
  near(await pixel(0.2, 0.7), [0, 0, 255, 255]);
  near(await pixel(0.8, 0.7), [255, 0, 0, 255]);
  await page.click("#clear-selection");
  await page.click("[data-tool=bucket]");
  await color("#ffffff");
  await page.selectOption("#bucket-mode", "material");
  await click(0.8, 0.5);
  near(await pixel(0.2, 0.5), [255, 255, 255, 255]);
  near(await pixel(0.8, 0.5), [255, 255, 255, 255]);
  near(await pixel(0.5, 0.5), [255, 0, 0, 255]);
  console.log(
    "PASS: seleção de ilha UV, máscara de pintura e preenchimento restrito ao material.",
  );
  // New text remains an object after apply, and can be re-edited and moved.
  await page.click("[data-tool=text]");
  await page.fill("#text-content", "GPC");
  await page.fill("#text-size", "12");
  await color("#000000");
  await click(0.35, 0.35);
  await page.click("#apply-decal");
  await page.click("[data-layer-type=text]");
  await page.fill("#text-content", "SAMU");
  await input("#text-stroke", 1);
  await input("#text-stroke-color", "#ffffff");
  await input("#text-shadow-blur", 2);
  await input("#text-shadow-x", 2);
  await input("#text-shadow-y", 1);
  await input("#object-x", 24);
  await input("#object-y", 12);
  const fontPath = [
    process.env.TEST_FONT_PATH,
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
  ].find((p) => p && existsSync(p));
  assert.ok(
    fontPath,
    "Defina TEST_FONT_PATH com uma fonte TTF/OTF para validar fontes locais.",
  );
  if (existsSync(fontPath)) {
    await page.locator("#font-file").setInputFiles(fontPath);
    await page.waitForFunction(() =>
      document.querySelector("#text-font").value.startsWith("GodoyFont_"),
    );
  }
  const textBefore = await save("text-editable");
  assert.equal(textBefore.json.version, 3);
  const textLayer = textBefore.json.textureEdits[0].layers.layers.find(
    (l) => l.type === "text",
  );
  assert.equal(textLayer.text, "SAMU");
  assert.equal(textLayer.x, 24);
  assert.equal(textLayer.strokeWidth, 1);
  assert.equal(textLayer.shadowBlur, 2);
  if (existsSync(fontPath)) {
    assert.equal(textBefore.json.fonts.length, 1);
    assert.equal(textLayer.font, textBefore.json.fonts[0].family);
    assert.ok(
      Buffer.from(textBefore.json.fonts[0].data, "base64").equals(
        await fs.readFile(fontPath),
      ),
    );
  }
  // Actual pointer movement, rather than only editing the coordinate fields.
  const beforeX = Number(await page.locator("#object-x").inputValue());
  await drag(24 / 64, 12 / 32, 28 / 64, 14 / 32);
  assert.ok(Number(await page.locator("#object-x").inputValue()) > beforeX + 2);
  await page.reload();
  await page.locator("#model-file").setInputFiles(textBefore.file);
  await page.waitForFunction(
    () =>
      document.querySelector("#toast").textContent === "Projeto restaurado.",
  );
  await page.click("[data-layer-type=text]");
  assert.equal(await page.locator("#text-content").inputValue(), "SAMU");
  assert.equal(Number(await page.locator("#object-x").inputValue()), 24);
  if (existsSync(fontPath)) {
    const family = await page.locator("#text-font").inputValue();
    assert.ok(family.startsWith("GodoyFont_"));
    assert.ok(
      await page.evaluate(
        (f) =>
          [...document.fonts].some(
            (x) => x.family === f && x.status === "loaded",
          ),
        family,
      ),
    );
  }
  await page.fill("#text-content", "POL");
  await input("#object-x", 30);
  await page.click("#tab-uv");
  console.log(
    "PASS: texto editável, movimento, contorno, sombra e fonte local persistidos após recarregar o projeto.",
  );
  // Editable ellipse, image and Bézier path, including a handle edit.
  await page.click("[data-tool=ellipse]");
  await color("#ff00ff");
  await page.uncheck("#shape-fill");
  await input("#shape-stroke", 1);
  await drag(0.55, 0.2, 0.85, 0.6);
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 8;
    const x = c.getContext("2d");
    x.fillStyle = "#ffcc00";
    x.fillRect(0, 0, 8, 8);
    return c.toDataURL().split(",")[1];
  });
  await page.locator("#image-file").setInputFiles({
    name: "badge.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await page.click("#tab-uv");
  await click(0.8, 0.75);
  await page.click("#apply-decal");
  await page.click("[data-layer-type=image]");
  await input("#object-x", 48);
  assert.equal(Number(await page.locator("#object-x").inputValue()), 48);
  await page.click("[data-tool=pen]");
  await color("#00ffff");
  await input("#shape-stroke", 2);
  await drag(0.1, 0.2, 0.18, 0.1);
  await drag(0.45, 0.4, 0.6, 0.55);
  await click(0.85, 0.2);
  await page.click("#finish-path");
  const curveBefore = await save("curve");
  let curve = curveBefore.json.textureEdits[0].layers.layers.find(
    (l) => l.type === "path",
  );
  assert.equal(curve.points.length, 3);
  assert.notEqual(curve.points[0].outX, curve.points[0].x);
  await page.click("[data-layer-type=path]");
  await page.click("#edit-path");
  const node = curve.points[0];
  await drag(
    (curve.x + node.x) / 64,
    (curve.y + node.y) / 32,
    (curve.x + node.x + 3) / 64,
    (curve.y + node.y + 1) / 32,
  );
  const curveAfter = await save("curve-edited");
  const movedCurve = curveAfter.json.textureEdits[0].layers.layers.find(
    (l) => l.type === "path",
  );
  assert.notEqual(movedCurve.points[0].x, curve.points[0].x);
  console.log(
    "PASS: elipse, imagem e curvas Bézier continuam editáveis, incluindo nós e alças.",
  );
  // Orthographic presets and lighting change the real WebGL view, not the texture.
  await page.click("#tab-3d");
  for (const v of ["front", "back", "left", "right", "top"]) {
    await page.selectOption("#camera-view", v);
    assert.match(await page.locator("#view-name").textContent(), /ORTOGRÁFICA/);
  }
  await page.selectOption("#camera-view", "back");
  await page.selectOption("#lighting-select", "day");
  await page.waitForTimeout(200);
  const day = await page.locator("#scene").screenshot();
  await page.selectOption("#lighting-select", "night");
  await page.waitForTimeout(200);
  const night = await page.locator("#scene").screenshot();
  assert.ok(!day.equals(night), "Iluminação não alterou a visualização 3D");
  const composedBefore = await page
    .locator("#uv-view")
    .evaluate((c) => c.toDataURL());
  const final = await save("all-features");
  assert.deepEqual(final.json.view, { camera: "back", lighting: "night" });
  await page.locator("#model-file").setInputFiles(final.file);
  await page.waitForFunction(
    () =>
      document.querySelector("#toast").textContent === "Projeto restaurado.",
  );
  assert.equal(await page.locator("#camera-view").inputValue(), "back");
  assert.equal(await page.locator("#lighting-select").inputValue(), "night");
  assert.equal(
    await page.locator("#uv-view").evaluate((c) => c.toDataURL()),
    composedBefore,
    "Reabrir o projeto alterou a composição das camadas",
  );
  const invalid = structuredClone(final.json);
  invalid.textureEdits[0].layers.layers.find(
    (l) => l.type === "shape" && l.shape === "ellipse",
  ).width = -1;
  await page.locator("#model-file").setInputFiles({
    name: "invalid.paintfive",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(invalid)),
  });
  await page.waitForFunction(() =>
    document.querySelector("#toast").textContent.includes("camada inválida"),
  );
  assert.equal(
    await page.locator("#uv-view").evaluate((c) => c.toDataURL()),
    composedBefore,
    "Projeto inválido destruiu o documento atual",
  );
  const exporting = page.waitForEvent("download");
  await page.click("#export-native");
  const ytd = path.join(output, "composed.ytd");
  await (await exporting).saveAs(ytd);
  const doc = parseYtd(await fs.readFile(ytd));
  assert.equal(doc.textures[0].width, 64);
  assert.ok(doc.textures[0].decode().some((v, i) => i % 4 === 1 && v > 0));
  await page.screenshot({ path: path.join(output, "advanced.png") });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: câmeras ortográficas, iluminação dia/noite, projeto completo e exportação YTD composta.",
  );
  console.log("Artifacts:", output);
} finally {
  await browser?.close();
  server.kill();
}
