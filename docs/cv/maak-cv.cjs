// Maakt het cv van Tim Hendriks als Word-bestand, in het Nederlands én Engels.
// Gebruik: npm install docx && node maak-cv.cjs
// Schrijft cv-tim-hendriks-nl.docx en cv-tim-hendriks-en.docx in deze map.
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, ShadingType, LevelFormat, HeightRule,
  TabStopType, Tab, VerticalAlign,
} = require("docx");

// ---------- kleuren en maten ----------
const DONKER  = "1B2A49";   // zijbalk (HuurDirect-navy)
const ACCENT  = "1B2A49";   // koppen
const ORANJE  = "F26522";   // HuurDirect-oranje als accent
const GRIJS   = "595959";
const TEKST   = "262626";
const WIT     = "FFFFFF";
const LICHTW  = "D6DEEC";
const INVUL   = "C00000";
const FONT    = "Calibri";

const PAGINA_B = 11906, PAGINA_H = 16838, MARGE = 620;
const BREED   = PAGINA_B - 2 * MARGE;
const ZIJBALK = 3300;
const HOOFD   = BREED - ZIJBALK;
const HOOGTE  = PAGINA_H - 2 * MARGE;
const HOOFD_MARGE_L = 380, HOOFD_MARGE_R = 100;
const KAART_B = HOOFD - HOOFD_MARGE_L - HOOFD_MARGE_R;   // breedte van een ervaringskaart
const BADGE_B = 760;

const geen = { style: BorderStyle.NONE, size: 0, color: WIT };
const geenRand = { top: geen, bottom: geen, left: geen, right: geen };

// Mengt een kleur met wit: tint(kleur, 0.9) = 90% wit
function tint(hex, f) {
  const n = parseInt(hex, 16);
  const mix = (c) => Math.round(c + (255 - c) * f).toString(16).padStart(2, "0");
  return (mix(n >> 16 & 255) + mix(n >> 8 & 255) + mix(n & 255)).toUpperCase();
}

// ---------- tekst-hulpjes ----------
const run = (t, o = {}) => new TextRun({ text: t, font: FONT, size: 20, color: TEKST, ...o });
const invul = (t) => run(`[${t}]`, { color: INVUL, italics: true });
const par = (children, o = {}) => new Paragraph({ spacing: { after: 60, line: 264 }, children, ...o });

const kop = (t) => new Paragraph({
  spacing: { before: 260, after: 120 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: ORANJE, space: 2 } },
  children: [run(t.toUpperCase(), { bold: true, size: 23, color: ACCENT, characterSpacing: 30 })],
});
const zkop = (t) => new Paragraph({
  spacing: { before: 300, after: 100 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: ORANJE, space: 2 } },
  children: [run(t.toUpperCase(), { bold: true, size: 21, color: WIT, characterSpacing: 30 })],
});
const ztekst = (t, o = {}) => par([run(t, { color: LICHTW, size: 19, ...o })], { spacing: { after: 40, line: 252 } });
const zlabel = (t) => par([run(t, { bold: true, color: WIT, size: 20 })], { spacing: { before: 90, after: 10 } });

const bullet = (children, ref = "opsomming") => new Paragraph({
  numbering: { reference: ref, level: 0 },
  spacing: { after: 30, line: 252 },
  children: Array.isArray(children) ? children : [run(children, { size: 19 })],
});
const zbullet = (t) => bullet([run(t, { color: LICHTW, size: 19 })], "opsomming-wit");

// ---------- ervaringskaart: badge in bedrijfskleur + kaart in lichte tint ----------
function kaart({ monogram, kleur, titel, org, periode, plaats, context, punten }) {
  const licht = tint(kleur, 0.9);
  const inhoud = [
    new Paragraph({
      spacing: { after: 10 },
      tabStops: [{ type: TabStopType.RIGHT, position: KAART_B - BADGE_B - 300 }],
      children: [
        run(titel, { bold: true, size: 22, color: TEKST }),
        new TextRun({ children: [new Tab()] }),
        ...(Array.isArray(periode) ? periode : [run(periode, { color: GRIJS, size: 19 })]),
      ],
    }),
    par([run(org, { bold: true, size: 20, color: kleur }), run(plaats ? `  ·  ${plaats}` : "", { color: GRIJS, size: 19 })], { spacing: { after: 30 } }),
    ...(context ? [par([run(context, { italics: true, size: 18, color: GRIJS })], { spacing: { after: 50, line: 252 } })] : []),
    ...punten.map((p) => bullet(p)),
  ];
  return new Table({
    width: { size: KAART_B, type: WidthType.DXA },
    columnWidths: [BADGE_B, KAART_B - BADGE_B],
    borders: geenRand,
    rows: [new TableRow({ cantSplit: true, children: [
      new TableCell({
        width: { size: BADGE_B, type: WidthType.DXA }, borders: geenRand,
        shading: { type: ShadingType.CLEAR, fill: kleur, color: "auto" },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 80, bottom: 80, left: 40, right: 40 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
          children: [run(monogram, { bold: true, size: 30, color: WIT })] })],
      }),
      new TableCell({
        width: { size: KAART_B - BADGE_B, type: WidthType.DXA }, borders: geenRand,
        shading: { type: ShadingType.CLEAR, fill: licht, color: "auto" },
        margins: { top: 110, bottom: 110, left: 200, right: 160 },
        children: inhoud,
      }),
    ] })],
  });
}
const tussenruimte = () => new Paragraph({ spacing: { after: 0, line: 160 }, children: [run("", { size: 8 })] });

// ---------- inhoud in twee talen ----------
const T = {
  nl: {
    bestand: "cv-tim-hendriks-nl.docx",
    kopregel: "Mede-oprichter HuurDirect  ·  Student International Business",
    contact: "Contact", telefoon: "Telefoon", email: "E-mail", woonplaats: "Woonplaats", plaats: "’s-Hertogenbosch",
    vaardigheden: "Vaardigheden",
    skills: ["Ondernemerschap", "Verkoop en klantcontact", "Communicatie en public relations", "Leiderschap en samenwerken",
             "Online marketing en webshopbeheer", "Timemanagement en planning", "Kritisch denken en zelfvertrouwen"],
    talen: "Talen", taal: [["Nederlands", "Moedertaal"], ["Engels", "Vloeiend"], ["Spaans", "Basis"]],
    kern: "Kernkwaliteiten",
    kernpunten: [["Eigenaarschap: ", "neemt verantwoordelijkheid voor het hele resultaat."],
                 ["Flexibel: ", "bewezen in sales, klantenservice, logistiek en ondernemen."],
                 ["Leergierig: ", "maakt zich nieuwe systemen en tools snel eigen."]],
    profiel: "Profiel",
    profieltekst:
      "Ondernemende student International Business en mede-oprichter van HuurDirect, een online verhuurplatform " +
      "voor professioneel gereedschap, machines en materieel. Ik heb het platform mee opgebouwd vanaf nul en werk " +
      "aan het complete plaatje: propositie, merk, website, verhuurproces en klantenservice. Daarnaast heb ik " +
      "ervaring in sales, klantenservice en logistiek, waardoor ik snel schakel tussen verschillende rollen. Ik werk " +
      "gestructureerd, stel hoge eisen aan kwaliteit en zet automatisering en AI-tools in om slimmer te werken.",
    werk: "Werkervaring", opleiding: "Opleiding", heden: "heden", parttime: "parttime", verwacht: "verwacht",
    banen: [
      { monogram: "HD", kleur: "F26522", titel: "Mede-oprichter", org: "HuurDirect", periode: "jan 2026 – heden", plaats: "Noord-Brabant, hybride",
        context: "Online verhuurplatform voor professioneel gereedschap, machines en materieel. Het huren van kwaliteitsgereedschap net zo eenvoudig maken als online winkelen.",
        punten: ["Platform mee opgezet vanaf nul: propositie, assortiment, merkidentiteit en website. De site is live en wordt continu verbeterd.",
                 "Verantwoordelijk voor het verhuurproces van reservering tot bezorging, afhalen en retour, plus klantcontact en administratie.",
                 "Online marketing, SEO en conversie-optimalisatie; beheerpaneel en automatisering ingericht om zonder extra handwerk op te schalen."] },
      { monogram: "VD", kleur: "8A6D1E", titel: "Privéchauffeur", org: "Van Dijk Services", periode: "mrt 2026 – heden", plaats: "parttime, ’s-Hertogenbosch",
        context: "Chauffeursdiensten voor particuliere en zakelijke klanten.",
        punten: ["Klanten representatief, discreet en stipt op tijd vervoerd; ritten zelfstandig gepland en uitgevoerd."] },
      { monogram: "M", kleur: "00A3E0", titel: "Logistiek medewerker", org: "Monta", periode: "jul 2025 – heden", plaats: "parttime, Engelen",
        context: "Fulfilmentbedrijf dat de opslag, verwerking en verzending van webshoporders verzorgt.",
        punten: ["Orders verzamelen, inpakken en verzendklaar maken; nauwkeurig werken en tempo houden in piekperiodes."] },
      { monogram: "JS", kleur: "B5462D", titel: "Stagiair", org: "JS Trade Agency", periode: [invul("maand"), run(" – ", { color: GRIJS, size: 19 }), invul("maand"), run(" 2025", { color: GRIJS, size: 19 })], plaats: "Castellón, Spanje",
        context: "Handelsagentuur voor keramische tegels in Castellón, het hart van de Spaanse tegelindustrie.",
        punten: ["Internationale stage in de verkoop en export van tegels; klanten en leveranciers ondersteund en Spaans in de praktijk gebracht."] },
      { monogram: "C", kleur: "1E8C6E", titel: "Stagiair", org: "Contronics Dry Misting", periode: "sep 2024 – dec 2025", plaats: "stage",
        context: "Ontwikkelaar van duurzame droge-verneveling voor luchtbevochtiging en het vers houden van producten.",
        punten: ["Breed meegedraaid: dossiers en administratie op orde gebracht, meegedacht over nieuwe ideeën en het team geholpen met de voorbereiding van een grote vakbeurs."] },
      { monogram: "ILS", kleur: "C8102E", titel: "Bezorger", org: "I Love Sushi", periode: [run("sep 2022 – ", { color: GRIJS, size: 19 }), invul("einddatum")], plaats: "’s-Hertogenbosch",
        context: "Landelijke sushiketen met bezorging en afhaal.",
        punten: ["Bestellingen efficiënt en op tijd bezorgd; routes zelf gepland en hoge klanttevredenheid door correcte levering."] },
      { monogram: "F2F", kleur: "2E5E4E", titel: "Sales Representative", org: "Face to Face", periode: "jul 2021 – aug 2022", plaats: "’s-Hertogenbosch",
        context: "Salesorganisatie voor directe verkoop en promotie.",
        punten: ["Klanten benaderd om producten te promoten en te verkopen; maandelijkse verkoopdoelen behaald en terugkerende klanten opgebouwd.",
                 "Samengewerkt met het marketingteam om verkoop en campagnes op elkaar af te stemmen."] },
    ],
    scholen: [
      { monogram: "S", kleur: "2B1A6B", titel: "MBO 4 International Business", org: "Summa College", periode: "2024 – 2027 (verwacht)", plaats: "Eindhoven",
        context: "Grootste ROC van Zuidoost-Brabant, met een internationaal georiënteerde businessopleiding.",
        punten: ["Vakken: Spaans, marketing, export, sales."] },
      { monogram: "MC", kleur: "C4405A", titel: "HAVO", org: "Maurick College", periode: "2018 – 2024", plaats: "Vught",
        context: "Middelbare school voor mavo, havo en vwo.",
        punten: ["Vakken: Nederlands, Engels, economie, scheikunde, natuurkunde, biologie, wiskunde."] },
    ],
  },
  en: {
    bestand: "cv-tim-hendriks-en.docx",
    kopregel: "Co-founder HuurDirect  ·  International Business student",
    contact: "Contact", telefoon: "Phone", email: "Email", woonplaats: "Location", plaats: "’s-Hertogenbosch, the Netherlands",
    vaardigheden: "Skills",
    skills: ["Entrepreneurship", "Sales and customer contact", "Communication and public relations", "Leadership and teamwork",
             "Online marketing and web shop management", "Time management and planning", "Critical thinking and confidence"],
    talen: "Languages", taal: [["Dutch", "Native"], ["English", "Fluent"], ["Spanish", "Basic"]],
    kern: "Core strengths",
    kernpunten: [["Ownership: ", "takes responsibility for the whole result."],
                 ["Adaptable: ", "proven in sales, customer service, logistics and entrepreneurship."],
                 ["Fast learner: ", "picks up new systems and tools quickly."]],
    profiel: "Profile",
    profieltekst:
      "Entrepreneurial International Business student and co-founder of HuurDirect, an online rental platform for " +
      "professional tools, machinery and equipment. I helped build the platform from scratch and work on the full " +
      "picture: proposition, brand, website, rental process and customer service. I also bring experience in sales, " +
      "customer service and logistics, which lets me switch quickly between roles. I work in a structured way, set " +
      "high quality standards and use automation and AI tools to work smarter.",
    werk: "Work experience", opleiding: "Education",
    banen: [
      { monogram: "HD", kleur: "F26522", titel: "Co-founder", org: "HuurDirect", periode: "Jan 2026 – present", plaats: "North Brabant, hybrid",
        context: "Online rental platform for professional tools, machinery and equipment. Making renting quality tools as easy as shopping online.",
        punten: ["Co-built the platform from scratch: proposition, product range, brand identity and website. The site is live and continuously improved.",
                 "Responsible for the rental process from booking to delivery, pick-up and return, plus customer contact and administration.",
                 "Online marketing, SEO and conversion optimisation; set up the admin panel and automation to scale without extra manual work."] },
      { monogram: "VD", kleur: "8A6D1E", titel: "Private chauffeur", org: "Van Dijk Services", periode: "Mar 2026 – present", plaats: "part-time, ’s-Hertogenbosch",
        context: "Chauffeur services for private and business clients.",
        punten: ["Transported clients in a representative, discreet and punctual manner; planned and carried out journeys independently."] },
      { monogram: "M", kleur: "00A3E0", titel: "Logistics employee", org: "Monta", periode: "Jul 2025 – present", plaats: "part-time, Engelen",
        context: "Fulfilment company handling storage, processing and shipping of web shop orders.",
        punten: ["Picking, packing and preparing orders for shipment; working accurately and keeping pace during peak periods."] },
      { monogram: "JS", kleur: "B5462D", titel: "Intern", org: "JS Trade Agency", periode: [invul("month"), run(" – ", { color: GRIJS, size: 19 }), invul("month"), run(" 2025", { color: GRIJS, size: 19 })], plaats: "Castellón, Spain",
        context: "Trade agency for ceramic tiles in Castellón, the heart of the Spanish tile industry.",
        punten: ["International internship in tile sales and export; supported clients and suppliers and put my Spanish into practice."] },
      { monogram: "C", kleur: "1E8C6E", titel: "Intern", org: "Contronics Dry Misting", periode: "Sep 2024 – Dec 2025", plaats: "internship",
        context: "Developer of sustainable dry-misting technology for humidification and keeping produce fresh.",
        punten: ["Involved across the business: organised files and administration, contributed ideas and helped the team prepare for a major trade fair."] },
      { monogram: "ILS", kleur: "C8102E", titel: "Delivery driver", org: "I Love Sushi", periode: [run("Sep 2022 – ", { color: GRIJS, size: 19 }), invul("end date")], plaats: "’s-Hertogenbosch",
        context: "National sushi chain offering delivery and take-away.",
        punten: ["Delivered orders efficiently and on time; planned routes independently and kept customer satisfaction high through accurate delivery."] },
      { monogram: "F2F", kleur: "2E5E4E", titel: "Sales Representative", org: "Face to Face", periode: "Jul 2021 – Aug 2022", plaats: "’s-Hertogenbosch",
        context: "Sales organisation for direct sales and promotion.",
        punten: ["Engaged potential clients to promote and sell products; achieved monthly sales targets and built repeat business.",
                 "Worked closely with the marketing team to align sales strategies with promotional campaigns."] },
    ],
    scholen: [
      { monogram: "S", kleur: "2B1A6B", titel: "International Business (MBO level 4)", org: "Summa College", periode: "2024 – 2027 (expected)", plaats: "Eindhoven",
        context: "Largest vocational college in south-east Brabant, with an internationally oriented business programme.",
        punten: ["Subjects: Spanish, marketing, export, sales."] },
      { monogram: "MC", kleur: "C4405A", titel: "HAVO (senior general secondary education)", org: "Maurick College", periode: "2018 – 2024", plaats: "Vught",
        context: "Secondary school offering mavo, havo and vwo.",
        punten: ["Subjects: Dutch, English, economics, chemistry, physics, biology, mathematics."] },
    ],
  },
};

// ---------- document bouwen ----------
function bouw(t) {
  const foto = new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 160 },
    children: [new ImageRun({ type: "jpg", data: fs.readFileSync("foto-tim.jpg"), transformation: { width: 160, height: 200 } })],
  });

  const zijbalk = [
    foto,
    zkop(t.contact),
    zlabel(t.telefoon),   ztekst("06 30 26 51 20"),
    zlabel(t.email),      ztekst("tim@timos.nl"),
    zlabel(t.woonplaats), ztekst(t.plaats),
    zlabel("LinkedIn"),   ztekst("linkedin.com/in/tim-hendriks-98905b328"),
    zlabel("Website"),    ztekst("huurdirect.nl"),
    zkop(t.vaardigheden),
    ...t.skills.map(zbullet),
    zkop(t.talen),
    ...t.taal.flatMap(([n, niveau]) => [zlabel(n), ztekst(niveau)]),
    zkop(t.kern),
    ...t.kernpunten.map(([k, v]) => bullet([run(k, { bold: true, color: WIT, size: 19 }), run(v, { color: LICHTW, size: 19 })], "opsomming-wit")),
  ];

  const hoofd = [
    new Paragraph({ spacing: { after: 30 }, children: [run("TIM HENDRIKS", { bold: true, size: 50, color: ACCENT, characterSpacing: 40 })] }),
    new Paragraph({
      spacing: { after: 60 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 14, color: ORANJE, space: 6 } },
      children: [run(t.kopregel, { size: 23, color: GRIJS })],
    }),
    kop(t.profiel),
    par([run(t.profieltekst, { size: 20 })], { spacing: { after: 40, line: 264 } }),
    kop(t.werk),
    ...t.banen.flatMap((b) => [kaart(b), tussenruimte()]),
    kop(t.opleiding),
    ...t.scholen.flatMap((s) => [kaart(s), tussenruimte()]),
  ];

  const cel = (breedte, kinderen, extra = {}) => new TableCell({
    width: { size: breedte, type: WidthType.DXA }, borders: geenRand, verticalAlign: VerticalAlign.TOP, children: kinderen, ...extra,
  });
  const pagina = new Table({
    width: { size: BREED, type: WidthType.DXA },
    columnWidths: [ZIJBALK, HOOFD],
    borders: geenRand,
    rows: [new TableRow({
      height: { value: HOOGTE - 120, rule: HeightRule.ATLEAST },
      children: [
        cel(ZIJBALK, zijbalk, { shading: { type: ShadingType.CLEAR, fill: DONKER, color: "auto" }, margins: { top: 320, bottom: 320, left: 280, right: 280 } }),
        cel(HOOFD, hoofd, { margins: { top: 320, bottom: 320, left: HOOFD_MARGE_L, right: HOOFD_MARGE_R } }),
      ],
    })],
  });

  const opsomming = (ref, kleur) => ({
    reference: ref,
    levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 280, hanging: 200 } }, run: { color: kleur, font: FONT } } }],
  });

  return new Document({
    creator: "Tim Hendriks", title: "CV Tim Hendriks",
    styles: { default: { document: { run: { font: FONT, size: 20 } } } },
    numbering: { config: [opsomming("opsomming", ORANJE), opsomming("opsomming-wit", ORANJE)] },
    sections: [{
      properties: { page: { size: { width: PAGINA_B, height: PAGINA_H }, margin: { top: MARGE, bottom: MARGE, left: MARGE, right: MARGE } } },
      children: [pagina],
    }],
  });
}

(async () => {
  for (const taal of ["nl", "en"]) {
    const buf = await Packer.toBuffer(bouw(T[taal]));
    fs.writeFileSync(T[taal].bestand, buf);
    console.log(T[taal].bestand, "geschreven");
  }
})();
