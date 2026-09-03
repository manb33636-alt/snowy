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
    // Meet de echte inhoud: onderkant van het laatste element in elke kolom t.o.v. de paginahoogte
    const m = await page.evaluate(() => {
      const r = (sel) => document.querySelector(sel).getBoundingClientRect();
      return { pagina: r(".page").height,
               zijbalk_opleiding_onder: Math.round(r(".edu").bottom), zijbalk_onderblok_boven: Math.round(r(".bottom").top), zijbalk_onderblok_onder: Math.round(r(".bottom").bottom),
               hoofd_onder: Math.round(r(".tl").bottom), voet_boven: Math.round(r(".foot").top) };
    });
    console.log(taal, m);
    await page.close();
  }
  await browser.close();
})();
