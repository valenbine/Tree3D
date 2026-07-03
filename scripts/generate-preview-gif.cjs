const fs = require("node:fs");
const path = require("node:path");

const { chromium } = require("/usr/local/lib/node_modules/playwright");
const { PNG } = require("/usr/local/lib/node_modules/pngjs");
const { GIFEncoder, quantize, applyPalette } = require("/usr/local/lib/node_modules/gifenc");

const OUTPUT = path.join(process.cwd(), "public", "preview", "tree3d-preview.gif");
const URL = process.env.TREE3D_CAPTURE_URL || "http://127.0.0.1:3000";
const WIDTH = 960;
const HEIGHT = 540;
const FRAMES = 18;
const FRAME_DELAY_MS = 180;
const START_DELAY_MS = 5000;

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

  for (let i = 0; i < FRAMES; i += 1) {
    const buffer = await page.screenshot({ type: "png" });
    const png = PNG.sync.read(buffer);
    const palette = quantize(png.data, 192);
    const index = applyPalette(png.data, palette);
    gif.writeFrame(index, png.width, png.height, {
      palette,
      delay: FRAME_DELAY_MS,
    });
    await page.waitForTimeout(FRAME_DELAY_MS);
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
