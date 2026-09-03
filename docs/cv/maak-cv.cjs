// Maakt het cv van Tim Hendriks als Word-bestand.
// Gebruik: npm install docx && node maak-cv.cjs  (schrijft cv-tim-hendriks.docx in deze map)
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, ShadingType, LevelFormat, HeightRule,
  TabStopType, Tab, VerticalAlign,
} = require("docx");

// ---------- kleuren en maten ----------
const DONKER  = "1F3A5F";   // zijbalk
const ACCENT  = "1F4E79";   // koppen
const GRIJS   = "595959";
const TEKST   = "262626";
const WIT     = "FFFFFF";
const LICHTW  = "D6E2F0";   // lichtere tekst op de zijbalk
const INVUL   = "C00000";   // invulvelden in de hoofdkolom
const INVULZ  = "FFD37A";   // invulvelden op de zijbalk
const FONT    = "Calibri";

const PAGINA_B = 11906, PAGINA_H = 16838, MARGE = 720;    // A4 in DXA (1440 = 1 inch)
const BREED   = PAGINA_B - 2 * MARGE;                     // 10466
const ZIJBALK = 3400;
const HOOFD   = BREED - ZIJBALK;                          // 7066
const HOOGTE  = PAGINA_H - 2 * MARGE;                     // 15398

const geen = { style: BorderStyle.NONE, size: 0, color: WIT };
const geenRand = { top: geen, bottom: geen, left: geen, right: geen };

// ---------- hulpfuncties ----------
const run = (t, o = {}) => new TextRun({ text: t, font: FONT, size: 21, color: TEKST, ...o });
const invul = (t, zij = false) => run(`[${t}]`, { color: zij ? INVULZ : INVUL, italics: true });
const par = (children, o = {}) => new Paragraph({ spacing: { after: 80, line: 276 }, children, ...o });

// Kop in de hoofdkolom: blauwe hoofdletters met lijn eronder
const kop = (t) => new Paragraph({
  spacing: { before: 300, after: 120 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: ACCENT, space: 2 } },
  children: [run(t.toUpperCase(), { bold: true, size: 23, color: ACCENT, characterSpacing: 25 })],
});

// Kop in de zijbalk: witte hoofdletters met dun lijntje
const zkop = (t) => new Paragraph({
  spacing: { before: 320, after: 100 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "5B7DA8", space: 2 } },
  children: [run(t.toUpperCase(), { bold: true, size: 21, color: WIT, characterSpacing: 25 })],
});

const ztekst = (children, o = {}) => par(
  (Array.isArray(children) ? children : [children]).map((c) => (typeof c === "string" ? run(c, { color: LICHTW, size: 20 }) : c)),
  { spacing: { after: 60, line: 264 }, ...o },
);
const zlabel = (t) => par([run(t, { bold: true, color: WIT, size: 20 })], { spacing: { before: 100, after: 20 } });

// Functieregel: titel links, periode rechts op dezelfde regel
function functie(titel, periode) {
  return new Paragraph({
    spacing: { before: 180, after: 20 },
    tabStops: [{ type: TabStopType.RIGHT, position: HOOFD - 400 }],
    children: [
      ...(Array.isArray(titel) ? titel : [run(titel, { bold: true, size: 22 })]),
      new TextRun({ children: [new Tab()] }),
      ...(Array.isArray(periode) ? periode : [run(periode, { color: GRIJS, size: 20 })]),
    ],
  });
}
const sub = (children) => par(
  (Array.isArray(children) ? children : [children]).map((c) => (typeof c === "string" ? run(c, { italics: true, color: GRIJS, size: 20 }) : c)),
  { spacing: { after: 60 } },
);
const bullet = (children, ref = "opsomming") => new Paragraph({
  numbering: { reference: ref, level: 0 },
  spacing: { after: 50, line: 264 },
  children: Array.isArray(children) ? children : [run(children)],
});
const zbullet = (children) => bullet(
  (Array.isArray(children) ? children : [children]).map((c) => (typeof c === "string" ? run(c, { color: LICHTW, size: 20 }) : c)),
  "opsomming-wit",
);

// ---------- zijbalk ----------
const foto = new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 200 },
  children: [new ImageRun({
    type: "jpg",
    data: fs.readFileSync("foto-tim.jpg"),
    transformation: { width: 168, height: 210 },   // punten; 600x750 px → 4:5
  })],
});

const zijbalk = [
  foto,
  zkop("Contact"),
  zlabel("Woonplaats"),   ztekst([invul("Plaats", true)]),
  zlabel("Telefoon"),     ztekst([invul("06-00000000", true)]),
  zlabel("E-mail"),       ztekst([invul("e-mailadres", true)]),
  zlabel("LinkedIn"),     ztekst("linkedin.com/in/", { }), ztekst([invul("profielnaam", true)]),
  zlabel("Website"),      ztekst("huurdirect.nl"),

  zkop("Vaardigheden"),
  zbullet("Ondernemerschap en bedrijfsvoering"),
  zbullet("Klantgericht werken en verkoop"),
  zbullet("Online marketing, SEO en conversie"),
  zbullet("Websitebeheer en webshopinrichting"),
  zbullet("Procesoptimalisatie en automatisering"),
  zbullet("Werken met AI-tools"),
  zbullet("Plannen, organiseren en zelfstandig werken"),

  zkop("Talen"),
  zlabel("Nederlands"),   ztekst("Moedertaal"),
  zlabel("Engels"),       ztekst([invul("Goed / vloeiend", true)]),

  zkop("Overig"),
  zlabel("Rijbewijs"),    ztekst([invul("B", true)]),
  zlabel("Geboortedatum"), ztekst([invul("dd-mm-jjjj", true)]),
  zlabel("Interesses"),   ztekst("Ondernemen, techniek en innovatie, beleggen, sport"),
];

// ---------- hoofdkolom ----------
const hoofd = [
  new Paragraph({ spacing: { after: 40 }, children: [run("TIM HENDRIKS", { bold: true, size: 52, color: ACCENT, characterSpacing: 40 })] }),
  new Paragraph({
    spacing: { after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 6 } },
    children: [run("Ondernemer  ·  Oprichter en eigenaar van HuurDirect", { size: 25, color: GRIJS })],
  }),

  kop("Profiel"),
  par([run(
    "Jonge, gedreven ondernemer en oprichter van HuurDirect, een online verhuurplatform voor professioneel " +
    "gereedschap, machines en materieel. Ik heb het platform vanaf nul opgebouwd en ben verantwoordelijk voor " +
    "het complete plaatje: van propositie, merk en website tot het verhuurproces, de klantenservice en de " +
    "administratie. Ik werk gestructureerd, stel hoge eisen aan kwaliteit en vind niets “goed genoeg” zolang " +
    "het aantoonbaar beter kan. Ik leer snel, pak nieuwe technologie praktisch op en zet automatisering en " +
    "AI-tools in om slimmer te werken."
  )]),

  kop("Werkervaring"),
  functie("Oprichter en eigenaar — HuurDirect", [invul("startjaar"), run(" – heden", { color: GRIJS, size: 20 })]),
  sub(["Online verhuurplatform voor gereedschap, machines en materieel  ·  ", invul("Plaats")]),
  bullet("Het platform vanaf nul opgezet: propositie, assortiment, merkidentiteit en website. De site is live en wordt continu verbeterd."),
  bullet("Verantwoordelijk voor het volledige verhuurproces: van productselectie en reservering tot bezorging, afhalen en retour."),
  bullet("Klantcontact, offertes en administratie; stuurt op een snelle, transparante en betrouwbare klantervaring."),
  bullet("Online marketing, SEO en conversie-optimalisatie om zichtbaarheid en omzet te laten groeien."),
  bullet("Beheerpaneel en automatisering ingericht zodat het bedrijf zonder extra handwerk kan opschalen."),
  bullet("Beveiliging en betrouwbaarheid van het platform naar een professioneel niveau gebracht."),

  functie([invul("Functietitel"), run(" — ", { bold: true, size: 22 }), invul("Bedrijf")], [invul("jaar"), run(" – ", { color: GRIJS, size: 20 }), invul("jaar")]),
  sub([invul("Plaats"), "  ·  ", invul("korte omschrijving van het bedrijf")]),
  bullet([invul("Belangrijkste taak of verantwoordelijkheid")]),
  bullet([invul("Concreet resultaat, het liefst met cijfers")]),

  functie([invul("Functietitel"), run(" — ", { bold: true, size: 22 }), invul("Bedrijf")], [invul("jaar"), run(" – ", { color: GRIJS, size: 20 }), invul("jaar")]),
  sub([invul("Plaats"), "  ·  ", invul("korte omschrijving van het bedrijf")]),
  bullet([invul("Belangrijkste taak of verantwoordelijkheid")]),

  kop("Opleiding"),
  functie([invul("Opleiding en richting")], [invul("jaar"), run(" – ", { color: GRIJS, size: 20 }), invul("jaar")]),
  sub([invul("Onderwijsinstelling"), "  ·  ", invul("Plaats"), "  ·  ", invul("diploma behaald")]),
  functie([invul("Cursus of certificaat")], [invul("jaar")]),
  sub([invul("Aanbieder")]),

  kop("Kernkwaliteiten"),
  bullet([run("Eigenaarschap: ", { bold: true }), run("neemt verantwoordelijkheid voor het hele resultaat, niet alleen voor een deel.")]),
  bullet([run("Kwaliteitsgericht: ", { bold: true }), run("blijft verbeteren tot iets echt goed werkt voor de klant.")]),
  bullet([run("Praktisch en leergierig: ", { bold: true }), run("maakt zich nieuwe systemen en tools snel eigen en past ze direct toe.")]),
  bullet([run("Klantgericht: ", { bold: true }), run("denkt vanuit de klant en maakt processen eenvoudiger en sneller.")]),
];

// ---------- pagina: één tabel met twee kolommen ----------
const cel = (breedte, kinderen, extra = {}) => new TableCell({
  width: { size: breedte, type: WidthType.DXA },
  borders: geenRand,
  verticalAlign: VerticalAlign.TOP,
  children: kinderen,
  ...extra,
});

const pagina = new Table({
  width: { size: BREED, type: WidthType.DXA },
  columnWidths: [ZIJBALK, HOOFD],
  borders: geenRand,
  rows: [new TableRow({
    height: { value: HOOGTE - 120, rule: HeightRule.ATLEAST },
    children: [
      cel(ZIJBALK, zijbalk, {
        shading: { type: ShadingType.CLEAR, fill: DONKER, color: "auto" },
        margins: { top: 360, bottom: 360, left: 300, right: 300 },
      }),
      cel(HOOFD, hoofd, { margins: { top: 360, bottom: 360, left: 420, right: 120 } }),
    ],
  })],
});

const opsomming = (ref, kleur) => ({
  reference: ref,
  levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 300, hanging: 220 } }, run: { color: kleur, font: FONT } } }],
});

const doc = new Document({
  creator: "Tim Hendriks",
  title: "CV Tim Hendriks",
  styles: { default: { document: { run: { font: FONT, size: 21 } } } },
  numbering: { config: [opsomming("opsomming", ACCENT), opsomming("opsomming-wit", INVULZ)] },
  sections: [{
    properties: { page: { size: { width: PAGINA_B, height: PAGINA_H }, margin: { top: MARGE, bottom: MARGE, left: MARGE, right: MARGE } } },
    children: [pagina],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("cv-tim-hendriks.docx", buf);
  console.log("cv-tim-hendriks.docx geschreven");
});
