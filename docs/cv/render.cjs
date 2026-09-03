// Rendert de HTML-cv's naar PDF en PNG (voorbeeld). Gebruik: node render.cjs
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const path = require("path");
(async () => {
  const browser = await chromium.launch();
  for (const taal of ["nl", "en"]) {
    const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
    await page.goto("file://" + path.resolve(__dirname, `cv-tim-hendriks-${taal}.html`));
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({ path: `cv-tim-hendriks-${taal}.pdf`, format: "A4", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    await page.screenshot({ path: `preview-${taal}.png`, fullPage: true });
    // Meet of de inhoud binnen de pagina blijft
    const m = await page.evaluate(() => ({ side: document.querySelector(".side").scrollHeight, main: document.querySelector(".main").scrollHeight, page: document.querySelector(".page").clientHeight }));
    console.log(taal, m);
    await page.close();
  }
  await browser.close();
})();
