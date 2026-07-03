const fs = require("node:fs");
const path = require("node:path");

const { chromium } = require("/usr/local/lib/node_modules/playwright");
const { PNG } = require("/usr/local/lib/node_modules/pngjs");
const { GIFEncoder, quantize, applyPalette } = require("/usr/local/lib/node_modules/gifenc");

const OUTPUT = path.join(process.cwd(), "public", "preview", "tree3d-preview.gif");
const URL = process.env.TREE3D_CAPTURE_URL || "http://127.0.0.1:3000";
const WIDTH = 960;
const HEIGHT = 540;
const FRAME_DELAY_MS = 180;
const START_DELAY_MS = 5000;

async function captureFrame(page, gif) {
  const buffer = await page.screenshot({ type: "png" });
  const png = PNG.sync.read(buffer);
  const palette = quantize(png.data, 192);
  const index = applyPalette(png.data, palette);
  gif.writeFrame(index, png.width, png.height, {
    palette,
    delay: FRAME_DELAY_MS,
  });
}

async function captureStill(page, gif, count) {
  for (let i = 0; i < count; i += 1) {
    await captureFrame(page, gif);
    await page.waitForTimeout(FRAME_DELAY_MS);
  }
}

async function fallbackUiSequence(page, gif) {
  const englishToggle = page.getByRole("button", { name: "EN" }).first();
  if (await englishToggle.isVisible().catch(() => false)) {
    await englishToggle.click({ force: true });
    await page.waitForTimeout(700);
    await captureStill(page, gif, 4);
  }

  const settingsButton = page
    .locator('button[aria-label="设置"], button[aria-label="Settings"]')
    .first();

  if (await settingsButton.isVisible().catch(() => false)) {
    await settingsButton.click({ force: true });
    await page.waitForTimeout(900);
    await captureStill(page, gif, 6);
  }
}

async function main() {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });

  await page.goto(URL, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(START_DELAY_MS);

  const gif = GIFEncoder();

  // Phase 1: establish the full scene.
  await captureStill(page, gif, 8);

  // Phase 2: show the search flow when stargazers exist.
  const input = page.locator("input").first();
  await input.click({ force: true });
  await page.waitForTimeout(400);
  const firstRow = page.locator("button[data-index]").first();

  if (await firstRow.isVisible().catch(() => false)) {
    const rawName = ((await firstRow.locator("span.text-sm").textContent()) || "").trim();
    const query = rawName.slice(0, Math.min(4, rawName.length));
    if (query) {
      await input.fill("");
      await input.type(query, { delay: 120 });
      await page.waitForTimeout(500);
    }
    await captureStill(page, gif, 5);

    // Phase 3: open the first matching house and linger on the profile panel.
    await firstRow.click({ force: true });
    await page.waitForTimeout(1800);
    await captureStill(page, gif, 9);
  } else {
    await fallbackUiSequence(page, gif);
  }

  gif.finish();
  fs.writeFileSync(OUTPUT, gif.bytesView());
  await browser.close();

  const stat = fs.statSync(OUTPUT);
  console.log(JSON.stringify({ output: OUTPUT, bytes: stat.size }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
