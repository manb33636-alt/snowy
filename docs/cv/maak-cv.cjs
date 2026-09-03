// Maakt het cv van Tim Hendriks als Word-bestand.
// Gebruik: npm install docx && node maak-cv.cjs  (schrijft cv-tim-hendriks.docx in deze map)
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, ShadingType, LevelFormat,
  TabStopType, Tab,
} = require("docx");

const ACCENT = "1F4E79";   // donkerblauw
const GRIJS  = "595959";
const LICHT  = "EEF3F8";
const FONT   = "Calibri";

const geen = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const geenRand = { top: geen, bottom: geen, left: geen, right: geen };

// ---------- hulpfuncties ----------
const tekst = (t, o = {}) => new TextRun({ text: t, font: FONT, size: 21, color: "262626", ...o });
const placeholder = (t) => tekst(`[${t}]`, { color: "C00000", italics: true });

function kop(t) {
  return new Paragraph({
    spacing: { before: 320, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: ACCENT, space: 2 } },
    children: [tekst(t.toUpperCase(), { bold: true, size: 24, color: ACCENT, characterSpacing: 20 })],
  });
}

function regel(children, o = {}) {
  return new Paragraph({ spacing: { after: 80, line: 276 }, children, ...o });
}

// Titelregel met functie links en periode rechts op dezelfde regel
function functie(titel, periode) {
  return new Paragraph({
    spacing: { before: 160, after: 20 },
    tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
    children: [
      ...(Array.isArray(titel) ? titel : [tekst(titel, { bold: true, size: 22 })]),
      new TextRun({ children: [new Tab()] }),
      ...(Array.isArray(periode) ? periode : typeof periode === "string" ? [tekst(periode, { color: GRIJS, size: 20 })] : [periode]),
    ],
  });
}
const sub = (t) => regel([tekst(t, { italics: true, color: GRIJS, size: 20 })], { spacing: { after: 60 } });

function bullet(children) {
  return new Paragraph({
    numbering: { reference: "opsomming", level: 0 },
    spacing: { after: 40, line: 264 },
    children: Array.isArray(children) ? children : [tekst(children)],
  });
}

// Twee kolommen: label links, waarde rechts (voor vaardigheden)
function vaardigheid(label, waarde) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 2600, type: WidthType.DXA }, borders: geenRand,
        margins: { top: 40, bottom: 40, left: 0, right: 120 },
        children: [regel([tekst(label, { bold: true, size: 20 })], { spacing: { after: 0 } })],
      }),
      new TableCell({
        width: { size: 6760, type: WidthType.DXA }, borders: geenRand,
        margins: { top: 40, bottom: 40, left: 0, right: 0 },
        children: [regel([tekst(waarde, { size: 20 })], { spacing: { after: 0 } })],
      }),
    ],
  });
}

// ---------- kopregel ----------
const header = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [9360],
  rows: [new TableRow({ children: [new TableCell({
    width: { size: 9360, type: WidthType.DXA },
    borders: geenRand,
    shading: { type: ShadingType.CLEAR, fill: LICHT, color: "auto" },
    margins: { top: 280, bottom: 280, left: 320, right: 320 },
    children: [
      new Paragraph({ spacing: { after: 40 }, children: [tekst("TIM HENDRIKS", { bold: true, size: 48, color: ACCENT, characterSpacing: 30 })] }),
      new Paragraph({ spacing: { after: 160 }, children: [tekst("Ondernemer  ·  Oprichter HuurDirect  ·  Digitale bouwer", { size: 24, color: GRIJS })] }),
      new Paragraph({ spacing: { after: 0 }, children: [
        placeholder("Woonplaats"), tekst("   ·   ", { color: GRIJS }),
        placeholder("06-00000000"), tekst("   ·   ", { color: GRIJS }),
        placeholder("e-mailadres"), tekst("   ·   ", { color: GRIJS }),
        placeholder("linkedin.com/in/…"),
      ] }),
    ],
  })] })],
});

// ---------- inhoud ----------
const inhoud = [
  header,

  kop("Profiel"),
  regel([tekst(
    "Ondernemende bouwer die een idee omzet in een werkend product. Oprichter van HuurDirect, een online " +
    "verhuurplatform voor professioneel gereedschap en machines, waarbij ik verantwoordelijk ben voor het complete " +
    "plaatje: van propositie en merk tot website, verhuurproces en beveiliging. Werkt gestructureerd, stelt hoge " +
    "kwaliteitseisen en ziet niets als “goed genoeg” zolang het aantoonbaar beter kan. Leert snel nieuwe " +
    "technologie en gebruikt die praktisch, met AI-tools als vast onderdeel van de werkwijze."
  )]),

  kop("Werkervaring"),
  functie("Oprichter & eigenaar — HuurDirect", [placeholder("startjaar"), tekst(" – heden", { color: GRIJS, size: 20 })]),
  sub("Online verhuurplatform voor gereedschap, machines en materieel  ·  [Plaats]"),
  bullet("Platform vanaf nul opgezet: propositie, assortiment, merk en website; live en in doorlopende optimalisatie."),
  bullet("Verantwoordelijk voor het volledige verhuurproces, van productselectie en reservering tot bezorging, afhalen en retour."),
  bullet("Stuurt op gebruiksvriendelijkheid, snelheid, betrouwbaarheid en conversie; beveiliging naar professioneel niveau gebracht."),
  bullet("Beheerpaneel en automatisering ingericht om handmatig werk te verminderen en schaalbaar te groeien."),
  bullet("Werkt met een schaalbare technische basis en houdt rekening met SEO, toegankelijkheid en onderhoudbaarheid."),

  functie(placeholder("Functietitel — Bedrijf"), [placeholder("jaar"), tekst(" – ", { color: GRIJS, size: 20 }), placeholder("jaar")]),
  sub("[Plaats]  ·  [korte omschrijving van het bedrijf]"),
  bullet([placeholder("Belangrijkste verantwoordelijkheid of resultaat")]),
  bullet([placeholder("Tweede concrete prestatie, liefst met cijfers")]),

  functie(placeholder("Functietitel — Bedrijf"), [placeholder("jaar"), tekst(" – ", { color: GRIJS, size: 20 }), placeholder("jaar")]),
  sub("[Plaats]  ·  [korte omschrijving van het bedrijf]"),
  bullet([placeholder("Belangrijkste verantwoordelijkheid of resultaat")]),

  kop("Projecten"),
  functie("Snowy Tracks — beleggingsdashboard en papertrading-bot", "eigen project"),
  sub("React + Vite  ·  Python (FastAPI, SQLAlchemy)  ·  Binance / ECB / Twelve Data API's"),
  bullet("Realtime marktdashboard voor crypto, goud, valuta en aandelen met technische indicatoren (RSI, MACD, EMA, Bollinger, ATR)."),
  bullet("Eigen API-backend met beveiligde login (bcrypt, lockout), achtergrond-scheduler en virtuele portefeuille met transactiehistorie."),
  bullet("24/7 crypto-tradingbot met nepgeld, nieuwsanalyse en geautomatiseerde tests; nadruk op eerlijke meting boven mooie cijfers."),

  kop("Opleiding"),
  functie(placeholder("Opleiding / studierichting"), [placeholder("jaar"), tekst(" – ", { color: GRIJS, size: 20 }), placeholder("jaar")]),
  sub("[Onderwijsinstelling]  ·  [Plaats]  ·  [diploma behaald / niet afgerond]"),
  functie(placeholder("Cursus of certificaat"), placeholder("jaar")),

  kop("Vaardigheden"),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2600, 6760],
    borders: geenRand,
    rows: [
      vaardigheid("Ondernemerschap", "Opzetten en runnen van een online platform, propositie, merkopbouw, klantproces"),
      vaardigheid("Product & UX", "Gebruiksvriendelijkheid, conversie-optimalisatie (CRO), SEO, procesoptimalisatie"),
      vaardigheid("Techniek", "React, JavaScript, Python (FastAPI), REST-API's, SQLite/SQLAlchemy, Git"),
      vaardigheid("Werkwijze", "AI-ondersteund ontwikkelen (Claude Code), automatiseren, testen, gestructureerd verbeteren"),
      vaardigheid("Talen", "Nederlands (moedertaal)  ·  Engels ([niveau])"),
    ],
  }),

  kop("Overig"),
  bullet([tekst("Rijbewijs: "), placeholder("B / geen")]),
  bullet([tekst("Interesses: "), tekst("beleggen en financiële markten, technologie en automatisering, "), placeholder("aanvullen")]),
];

const doc = new Document({
  creator: "Tim Hendriks",
  title: "CV Tim Hendriks",
  styles: { default: { document: { run: { font: FONT, size: 21 } } } },
  numbering: { config: [{
    reference: "opsomming",
    levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 360, hanging: 240 } }, run: { color: ACCENT } } }],
  }] },
  sections: [{
    properties: { page: { margin: { top: 900, bottom: 900, left: 1260, right: 1260 } } },
    children: inhoud,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("cv-tim-hendriks.docx", buf);
  console.log("cv-tim-hendriks.docx geschreven");
});
