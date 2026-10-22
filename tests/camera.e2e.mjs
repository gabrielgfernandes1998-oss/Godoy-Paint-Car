import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4198",
    "--strictPort",
  ],
  { stdio: "ignore" },
);
let browser;
try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch("http://127.0.0.1:4198")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    args: [
      "--no-sandbox",
      "--enable-unsafe-swiftshader",
      "--use-gl=angle",
      "--use-angle=swiftshader",
    ],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
  });
  await page.goto("http://127.0.0.1:4198");
  await page.locator("#scene").waitFor();
  const frame = async () => {
    await page.waitForTimeout(200);
    return (
      await page
        .locator("#scene")
        .screenshot({
          style: ".viewport > :not(#scene){visibility:hidden!important}",
        })
    ).toString("base64");
  };
  for (const view of ["perspective", "front", "back", "left", "right", "top"]) {
    await page.selectOption("#camera-view", view);
    await page.locator("#scene").focus(); // Canvas need not be focusable: clear the select's focus explicitly.
    await page.evaluate(() => document.activeElement.blur());
    for (const key of ["w", "a", "s", "d"]) {
      const before = await frame();
      await page.keyboard.down(key);
      let moved = false;
      try {
        // Software WebGL can miss a short fixed hold while compiling shaders.
        for (let attempt = 0; attempt < 5 && !moved; attempt++)
          moved = (await frame()) !== before;
      } finally {
        await page.keyboard.up(key);
      }
      assert(moved, `${view}: ${key} failed to move camera`);
      assert(
        await page
          .locator("[data-tool=brush]")
          .evaluate((e) => e.classList.contains("active")),
        "Navigation changed the tool",
      );
    }
  }
  const before = await frame();
  await page.waitForTimeout(200);
  assert.equal(await frame(), before, "Camera kept moving after keyup");
  // Isolate keyboard focus from the layer editor's live texture recomposition.
  await page.evaluate(() => {
    const input = document.createElement("input");
    input.id = "typing-check";
    input.style.cssText = "position:fixed;top:10px;left:400px";
    document.body.append(input);
    input.focus();
  });
  await page.keyboard.type("wasd");
  assert.equal(await page.locator("#typing-check").inputValue(), "wasd");
  assert((await frame()) === before, "Typing moved camera");
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press("q");
  assert(
    await page
      .locator("[data-tool=select]")
      .evaluate((e) => e.classList.contains("active")),
  );
  await page.keyboard.press("g");
  assert(
    await page
      .locator("[data-tool=decal]")
      .evaluate((e) => e.classList.contains("active")),
  );
  const uvBefore = await frame();
  await page.locator("#tab-uv").click();
  await page.keyboard.down("w");
  await page.waitForTimeout(200);
  await page.keyboard.up("w");
  await page.locator("#tab-3d").click();
  assert((await frame()) === uvBefore, "UV view allowed camera translation");
  console.log(
    "PASS: WASD pans all six views, releases stop, fields/UV suppress motion, Q/G select tools.",
  );
} finally {
  await browser?.close();
  server.kill();
}
