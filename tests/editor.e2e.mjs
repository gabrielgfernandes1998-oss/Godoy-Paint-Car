import { chromium } from "playwright";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { makeYdd, makeYtd } from "./fixtures.js";
import { openResource } from "../src/formats/resource.js";
import { parseYdd } from "../src/formats/ydd.js";
import { parseYtd } from "../src/formats/ytd.js";
const output = await mkdtemp(path.join(tmpdir(), "paintfive-e2e-"));
const port = 4197;
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
let serverOutput = "";
server.stdout.on("data", (d) => (serverOutput += d));
server.stderr.on("data", (d) => (serverOutput += d));
let browser;
async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw Error(serverOutput);
    try {
      if ((await fetch(`http://127.0.0.1:${port}`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw Error("Preview não iniciou: " + serverOutput);
}
(async () => {
  await waitForServer();
  const b = (browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (!process.env.CI && fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    headless: true,
    args: [
      "--no-sandbox",
      "--enable-unsafe-swiftshader",
      "--use-gl=angle",
      "--use-angle=swiftshader",
    ],
  }));
  const page = await b.newPage({
    viewport: { width: 1440, height: 1050 },
    acceptDownloads: true,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForTimeout(1000);
  await page.locator("#model-file").setInputFiles({
    name: "test.ydd",
    mimeType: "application/octet-stream",
    buffer: Buffer.from(makeYdd()),
  });
  await page.waitForFunction(() =>
    document.querySelector("#asset-type").textContent.includes("YDD NATIVO"),
  );
  if ((await page.locator("#drawable-select option").count()) !== 2)
    throw Error("Drawable selection failed");
  if ((await page.locator("#lod-select option").count()) !== 2)
    throw Error("LOD selection failed");
  await page.selectOption("#drawable-select", "1");
  await page.selectOption("#lod-select", "1");
  await page.locator("#ytd-file").setInputFiles({
    name: "test.ytd",
    mimeType: "application/octet-stream",
    buffer: Buffer.from(makeYtd()),
  });
  await page.waitForFunction(
    () =>
      document.querySelector("#texture-name").textContent === "cloth_diffuse",
  );
  if ((await page.locator("#texture-select option").count()) !== 3)
    throw Error("Native texture entries missing");
  const initial = await page.locator("#map").evaluate((c) => c.toDataURL());
  const box = await page.locator("#scene").boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const edited = await page.locator("#map").evaluate((c) => c.toDataURL());
  if (initial === edited) throw Error("Cannot paint native YDD with YTD");
  const download = page.waitForEvent("download");
  await page.click("#export-native");
  const exported = await download;
  await exported.saveAs(path.join(output, "native-export.ytd"));
  const decoded = parseYtd(
    fs.readFileSync(path.join(output, "native-export.ytd")),
  );
  if (
    decoded.textures[0]
      .decode()
      .every((v, i) => v === parseYtd(makeYtd()).textures[0].decode()[i])
  )
    throw Error("YTD export did not change texture");
  const original = parseYtd(makeYtd());
  for (let i = 1; i < 3; i++) {
    const a = original.textures[i],
      c = decoded.textures[i];
    if (
      !Buffer.from(
        original.resource.data.subarray(
          a.dataOffset,
          a.dataOffset + a.byteLength,
        ),
      ).equals(
        Buffer.from(
          decoded.resource.data.subarray(
            c.dataOffset,
            c.dataOffset + c.byteLength,
          ),
        ),
      )
    )
      throw Error("Untouched texture changed");
  }
  await page.selectOption(
    "#texture-select",
    await page.locator("#texture-select option").nth(1).getAttribute("value"),
  );
  await page.selectOption("#material-select", "all");
  await page.click("#bind-texture");
  const second = await page.locator("#map").evaluate((c) => c.toDataURL());
  if (second === edited) throw Error("Texture switching failed");
  await page.selectOption("#texture-select", original.textures[0].key);
  if ((await page.locator("#map").evaluate((c) => c.toDataURL())) !== edited)
    throw Error("Texture edits lost when switching");
  await page.click("#bind-texture");
  const saving = page.waitForEvent("download");
  await page.click("#save-project");
  await (await saving).saveAs(path.join(output, "native-project.paintfive"));
  await page
    .locator("#model-file")
    .setInputFiles(path.join(output, "native-project.paintfive"));
  await page.waitForFunction(
    () =>
      document.querySelector("#toast").textContent === "Projeto restaurado.",
  );
  if ((await page.locator("#map").evaluate((c) => c.toDataURL())) !== edited)
    throw Error("Native project round-trip changed pixels");
  if (
    (await page.locator("#drawable-select").inputValue()) !== "1" ||
    (await page.locator("#lod-select").inputValue()) !== "1"
  )
    throw Error("Native project selection not restored");
  await page.screenshot({ path: path.join(output, "native.png") });
  await page.locator("#model-file").setInputFiles({
    name: "bad.ydd",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("invalid-resource"),
  });
  await page.waitForFunction(() =>
    document.querySelector("#toast").textContent.includes("truncado"),
  );
  if ((await page.locator("#map").evaluate((c) => c.toDataURL())) !== edited)
    throw Error("Malformed resource destroyed active texture");
  // Canvas discards invisible RGB values: opening a translucent texture must not
  // cause an unedited compressed texture to be rewritten during export.
  const translucent = openResource(makeYtd(), 13);
  translucent.data[translucent.systemSize] = 0;
  translucent.data[translucent.systemSize + 1] = 0;
  await page
    .locator("#ytd-file")
    .setInputFiles({
      name: "transparent.ytd",
      mimeType: "application/octet-stream",
      buffer: Buffer.from(translucent.pack()),
    });
  await page.waitForFunction(
    () =>
      document.querySelector("#texture-name").textContent === "cloth_diffuse",
  );
  const noEditsDownload = page.waitForEvent("download");
  await page.click("#export-native");
  const noEditsPath = path.join(output, "unedited-transparent.ytd");
  await (await noEditsDownload).saveAs(noEditsPath);
  if (
    !Buffer.from(parseYtd(fs.readFileSync(noEditsPath)).resource.data).equals(
      Buffer.from(translucent.data),
    )
  )
    throw Error("Opening an unedited translucent texture changed native data");
  // A fresh session detects embedded textures and exports an actual YDD.
  await page.reload();
  await page
    .locator("#model-file")
    .setInputFiles({
      name: "embedded.ydd",
      mimeType: "application/octet-stream",
      buffer: Buffer.from(makeYdd(true)),
    });
  await page.waitForFunction(
    () =>
      document.querySelector("#export-native").textContent ===
      "Exportar YDD editado",
  );
  const embeddedBox = await page.locator("#scene").boundingBox();
  await page.mouse.click(
    embeddedBox.x + embeddedBox.width / 2,
    embeddedBox.y + embeddedBox.height / 2,
  );
  const embeddedDownload = page.waitForEvent("download");
  await page.click("#export-native");
  const embeddedPath = path.join(output, "embedded-edit.ydd");
  await (await embeddedDownload).saveAs(embeddedPath);
  const embeddedDoc = parseYdd(fs.readFileSync(embeddedPath));
  if (embeddedDoc.drawables[0].textures[0].decode()[1] < 240)
    throw Error("Embedded YDD texture was not edited");
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "PASS: native YDD/YTD import, drawables, LODs, paint, YTD export with unedited entries preserved, texture switching, native project round-trip, malformed-file recovery, translucent-data preservation, embedded YDD export",
  );
  console.log("Artifacts:", output);
  await b.close();
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    server.kill();
  });
