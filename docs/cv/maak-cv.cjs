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
  zlabel("Telefoon"),     ztekst("06 30 26 51 20"),
  zlabel("E-mail"),       ztekst("tim@timos.nl"),
  zlabel("Woonplaats"),   ztekst("’s-Hertogenbosch"),
  zlabel("LinkedIn"),     ztekst("linkedin.com/in/tim-hendriks-98905b328"),
  zlabel("Website"),      ztekst("huurdirect.nl"),

  zkop("Vaardigheden"),
  zbullet("Ondernemerschap"),
  zbullet("Verkoop en klantcontact"),
  zbullet("Communicatie en public relations"),
  zbullet("Leiderschap en samenwerken"),
  zbullet("Online marketing en webshopbeheer"),
  zbullet("Timemanagement en planning"),
  zbullet("Kritisch denken en zelfvertrouwen"),

  zkop("Talen"),
  zlabel("Nederlands"),   ztekst("Moedertaal"),
  zlabel("Engels"),       ztekst("Vloeiend"),
  zlabel("Spaans"),       ztekst("Basis"),

  zkop("Opleiding"),
  zlabel("MBO 4 International Business"),
  ztekst("Summa College, Eindhoven"),
  ztekst("2024 – 2027 (verwacht)"),
  ztekst("Vakken: Spaans, marketing, export, sales"),
  zlabel("HAVO"),
  ztekst("Maurick College, Vught"),
  ztekst("2018 – 2024"),
  ztekst("Vakken: Nederlands, Engels, economie, scheikunde, natuurkunde, biologie, wiskunde"),
];

// ---------- hoofdkolom ----------
const hoofd = [
  new Paragraph({ spacing: { after: 40 }, children: [run("TIM HENDRIKS", { bold: true, size: 52, color: ACCENT, characterSpacing: 40 })] }),
  new Paragraph({
    spacing: { after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 6 } },
    children: [run("Mede-oprichter HuurDirect  ·  Student International Business", { size: 24, color: GRIJS })],
  }),

  kop("Profiel"),
  par([run(
    "Ondernemende student International Business en mede-oprichter van HuurDirect, een online " +
    "verhuurplatform voor professioneel gereedschap, machines en materieel. Ik heb het platform mee " +
    "opgebouwd vanaf nul en werk aan het complete plaatje: propositie, merk, website, verhuurproces en " +
    "klantenservice. Daarnaast heb ik ervaring in sales, klantenservice en logistiek, waardoor ik snel " +
    "schakel tussen verschillende rollen. Ik werk gestructureerd, stel hoge eisen aan kwaliteit en zet " +
    "automatisering en AI-tools in om slimmer te werken."
  )]),

  kop("Werkervaring"),
  functie("Mede-oprichter — HuurDirect", "jan 2026 – heden"),
  sub("Online verhuurplatform voor gereedschap, machines en materieel  ·  Noord-Brabant  ·  hybride"),
  bullet("Het platform mee opgezet vanaf nul: propositie, assortiment, merkidentiteit en website. De site is live en wordt continu verbeterd."),
  bullet("Verantwoordelijk voor het verhuurproces van reservering tot bezorging, afhalen en retour, plus klantcontact en administratie."),
  bullet("Online marketing, SEO en conversie-optimalisatie om zichtbaarheid en omzet te laten groeien."),
  bullet("Beheerpaneel en automatisering ingericht zodat het bedrijf zonder extra handwerk kan opschalen."),

  functie("Privéchauffeur — Van Dijk Services", "mrt 2026 – heden"),
  sub("Parttime  ·  ’s-Hertogenbosch"),
  bullet("Klanten representatief, discreet en stipt op tijd vervoerd; zelfstandig ritten gepland en uitgevoerd."),

  functie("Logistiek medewerker — Monta", "jul 2025 – heden"),
  sub("Parttime  ·  e-commerce fulfilment  ·  Engelen"),
  bullet("Orders verzamelen, inpakken en verzendklaar maken; nauwkeurig werken en tempo houden in piekperiodes."),

  functie("Stagiair — Contronics Dry Misting", "sep 2024 – dec 2025"),
  sub("Stage vanuit de opleiding International Business  ·  duurzame vernevelingstechniek"),
  bullet("Breed meegedraaid: dossiers en administratie op orde gebracht, meegedacht over nieuwe ideeën en het team geholpen met de voorbereiding van een grote vakbeurs."),

  functie("Bezorger — I Love Sushi", [run("sep 2022 – ", { color: GRIJS, size: 20 }), invul("einddatum")]),
  sub("’s-Hertogenbosch"),
  bullet("Bestellingen efficiënt en op tijd bezorgd; routes zelf gepland en hoge klanttevredenheid door correcte levering."),

  functie("Sales Representative — Face to Face", "jul 2021 – aug 2022"),
  sub("’s-Hertogenbosch"),
  bullet("Klanten benaderd om producten te promoten en te verkopen; maandelijkse verkoopdoelen behaald en terugkerende klanten opgebouwd."),
  bullet("Nauw samengewerkt met het marketingteam om verkoop en campagnes op elkaar af te stemmen."),

  kop("Kernkwaliteiten"),
  bullet([run("Eigenaarschap: ", { bold: true }), run("neemt verantwoordelijkheid voor het hele resultaat, niet alleen voor een deel.")]),
  bullet([run("Flexibel: ", { bold: true }), run("bewezen in uiteenlopende rollen, van sales en klantenservice tot logistiek en ondernemen.")]),
  bullet([run("Leergierig: ", { bold: true }), run("maakt zich nieuwe systemen en tools snel eigen en past ze direct toe.")]),
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
