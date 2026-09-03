# Maakt het cv van Tim Hendriks als HTML (NL en EN). Render daarna naar PDF met: node render.cjs
import base64, pathlib

HIER = pathlib.Path(__file__).parent
def b64(p): return base64.b64encode((HIER / p).read_bytes()).decode()

FOTO = b64("foto-tim.jpg")
INTER = b64("fonts/Inter.woff2")
PLAYFAIR = b64("fonts/PlayfairDisplay.woff2")

ICONS = {
  "tel": '<svg viewBox="0 0 24 24"><path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11 11 0 0 0 3.5.55 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11 11 0 0 0 .55 3.5 1 1 0 0 1-.25 1z"/></svg>',
  "mail": '<svg viewBox="0 0 24 24"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 2.4V18h16V7.4l-8 5.3zM4.9 7l7.1 4.7L19.1 7z"/></svg>',
  "pin": '<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 1 7 7c0 5.2-7 13-7 13S5 14.2 5 9a7 7 0 0 1 7-7zm0 9.5A2.5 2.5 0 1 0 12 6.5a2.5 2.5 0 0 0 0 5z"/></svg>',
  "in": '<svg viewBox="0 0 24 24"><path d="M4 3.5A1.5 1.5 0 1 1 4 6.5 1.5 1.5 0 0 1 4 3.5zM2.8 8h2.4v13H2.8zM8 8h2.3v1.8h.1c.3-.6 1.1-1.9 2.9-1.9 3.1 0 3.7 2 3.7 4.7V21h-2.4v-5.9c0-1.4 0-3.2-2-3.2s-2.3 1.5-2.3 3.1V21H8z"/></svg>',
  "web": '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 9h-3a15 15 0 0 0-1.3-5.4A8 8 0 0 1 18.9 11zM12 4c.9 1.2 1.7 3.6 1.9 7h-3.8C10.3 7.6 11.1 5.2 12 4zM5.1 11a8 8 0 0 1 4.3-5.4A15 15 0 0 0 8.1 11zm0 2h3a15 15 0 0 0 1.3 5.4A8 8 0 0 1 5.1 13zM12 20c-.9-1.2-1.7-3.6-1.9-7h3.8c-.2 3.4-1 5.8-1.9 7zm2.6-1.6A15 15 0 0 0 15.9 13h3a8 8 0 0 1-4.3 5.4z"/></svg>',
}

T = {
 "nl": dict(
  bestand="cv-tim-hendriks-nl.html", lang="nl", titel="CV Tim Hendriks",
  rol="Mede-oprichter HuurDirect", rol2="Student International Business",
  tagline="“Snel schakelen, de lat hoog leggen en altijd blijven leren.”", motto="Motto",
  stats=[("5+","jaar werkervaring"),("3","talen"),("2","landen gewerkt"),("8","rollen vervuld")],
  contact="Contact", plaats="’s-Hertogenbosch",
  talen="Talen", taal=[("Nederlands","Moedertaal",5),("Engels","Vloeiend",4),("Spaans","Basis",2)],
  vaardigheden="Vaardigheden",
  skills=["Ondernemerschap","Sales","Klantcontact","Online marketing","SEO & conversie","Webshopbeheer","Leiderschap","Communicatie","Planning","Kritisch denken","AI-tools"],
  opleiding="Opleiding",
  scholen=[dict(kleur="#5B3DBF", titel="MBO 4 International Business", org="Summa College · Eindhoven", periode="2024 – 2027 (verwacht)", extra="Spaans, marketing, export, sales"),
           dict(kleur="#D6455F", titel="HAVO", org="Maurick College · Vught", periode="2018 – 2024", extra="Nederlands, Engels, economie, scheikunde, natuurkunde, biologie, wiskunde")],
  profiel="Profiel",
  profieltekst="Ondernemende student International Business met een commerciële instelling en een brede basis: sales, klantcontact, logistiek en internationale handel, in Nederland en Spanje. Ik pak dingen aan, schakel snel tussen rollen en leer het liefst door te doen. Als mede-oprichter van <b>HuurDirect</b> weet ik wat het is om iets vanaf nul op te bouwen, met een hoge lat voor kwaliteit.",
  werk="Werkervaring", kern="Kernkwaliteiten",
  kernpunten=[("Eigenaarschap","Neemt verantwoordelijkheid voor het hele resultaat."),("Flexibel","Bewezen in sales, service, logistiek en ondernemen."),("Leergierig","Maakt zich nieuwe systemen en tools snel eigen.")],
  banen=[
   dict(mono="HD", kleur="#F26522", titel="Mede-oprichter", org="HuurDirect", periode="jan 2026 – heden", plaats="Noord-Brabant · hybride",
        context="Online verhuurplatform voor professioneel gereedschap, machines en materieel.",
        punten=["Platform mee opgezet vanaf nul: propositie, assortiment, merk en website; live en continu verbeterd.",
                "Verantwoordelijk voor het verhuurproces van reservering tot bezorging en retour, plus klantcontact en administratie.",
                "Online marketing, SEO en conversie; beheerpaneel en automatisering ingericht om zonder extra handwerk op te schalen."]),
   dict(mono="VD", kleur="#B08D2B", titel="Privéchauffeur", org="Van Dijk Services", periode="mrt 2026 – heden", plaats="parttime",
        context="Chauffeursdiensten voor particuliere en zakelijke klanten.",
        punten=["Klanten representatief, discreet en stipt vervoerd; ritten zelfstandig gepland en uitgevoerd."]),
   dict(mono="M", kleur="#00A3E0", titel="Logistiek medewerker", org="Monta", periode="jul 2025 – heden", plaats="parttime · Engelen",
        context="Fulfilmentbedrijf voor opslag, verwerking en verzending van webshoporders.",
        punten=["Orders verzamelen, inpakken en verzendklaar maken; nauwkeurig en snel, ook in piekperiodes."]),
   dict(mono="JS", kleur="#C2552F", titel="Stagiair", org="JS Trade Agency", periode="okt 2025 – jan 2026", plaats="Castellón · Spanje",
        context="Tegelagentuur in Castellón, het hart van de Spaanse keramische tegelindustrie.",
        punten=["Potentiële klanten benaderd en deals gesloten voor de verkoop en export van tegels; Spaans in de praktijk gebracht."]),
   dict(mono="E", kleur="#E4003A", titel="Telefonisch verkoper", org="Eneco", periode="okt 2025 – jan 2026", plaats="naast de stage",
        context="Een van de grootste energieleveranciers van Nederland.",
        punten=["Klanten gebeld om energiecontracten te verkopen; overtuigend en resultaatgericht aan de telefoon."]),
   dict(mono="C", kleur="#1E9E78", titel="Stagiair", org="Contronics Dry Misting", periode="sep 2024 – dec 2024", plaats="stage",
        context="Ontwikkelaar van duurzame droge-vernevelingstechniek voor luchtbevochtiging.",
        punten=["Dossiers en administratie op orde gebracht, meegedacht over nieuwe ideeën en een grote vakbeurs mee voorbereid."]),
   dict(mono="ILS", kleur="#3A3F4B", titel="Bezorger", org="I Love Sushi", periode="sep 2022 – sep 2025", plaats="",
        context="Landelijke sushiketen met bezorging en afhaal.",
        punten=["Bestellingen efficiënt en op tijd bezorgd; routes zelf gepland en hoge klanttevredenheid."]),
   dict(mono="F2F", kleur="#2F6B5A", titel="Sales Representative", org="Face to Face", periode="jul 2021 – aug 2022", plaats="",
        context="Salesorganisatie voor directe verkoop en promotie.",
        punten=["Klanten benaderd om producten te promoten en te verkopen; maandelijkse targets gehaald en terugkerende klanten opgebouwd."]),
  ]),
 "en": dict(
  bestand="cv-tim-hendriks-en.html", lang="en", titel="CV Tim Hendriks",
  rol="Co-founder HuurDirect", rol2="International Business student",
  tagline="“Switch fast, aim high and never stop learning.”", motto="Motto",
  stats=[("5+","years of experience"),("3","languages"),("2","countries worked in"),("8","roles held")],
  contact="Contact", plaats="’s-Hertogenbosch, NL",
  talen="Languages", taal=[("Dutch","Native",5),("English","Fluent",4),("Spanish","Basic",2)],
  vaardigheden="Skills",
  skills=["Entrepreneurship","Sales","Customer contact","Online marketing","SEO & conversion","Web shop management","Leadership","Communication","Planning","Critical thinking","AI tools"],
  opleiding="Education",
  scholen=[dict(kleur="#5B3DBF", titel="International Business (MBO 4)", org="Summa College · Eindhoven", periode="2024 – 2027 (expected)", extra="Spanish, marketing, export, sales"),
           dict(kleur="#D6455F", titel="HAVO (senior secondary)", org="Maurick College · Vught", periode="2018 – 2024", extra="Dutch, English, economics, chemistry, physics, biology, mathematics")],
  profiel="Profile",
  profieltekst="Entrepreneurial International Business student with a commercial mindset and a broad base: sales, customer contact, logistics and international trade, in the Netherlands and Spain. I take initiative, switch quickly between roles and prefer to learn by doing. As co-founder of <b>HuurDirect</b> I know what it takes to build something from scratch, with a high bar for quality.",
  werk="Work experience", kern="Core strengths",
  kernpunten=[("Ownership","Takes responsibility for the whole result."),("Adaptable","Proven in sales, service, logistics and entrepreneurship."),("Fast learner","Picks up new systems and tools quickly.")],
  banen=[
   dict(mono="HD", kleur="#F26522", titel="Co-founder", org="HuurDirect", periode="Jan 2026 – present", plaats="North Brabant · hybrid",
        context="Online rental platform for professional tools, machinery and equipment.",
        punten=["Co-built the platform from scratch: proposition, range, brand identity and website; live and continuously improved.",
                "Responsible for the rental process from booking to delivery and return, plus customer contact and administration.",
                "Online marketing, SEO and conversion; set up the admin panel and automation to scale without extra manual work."]),
   dict(mono="VD", kleur="#B08D2B", titel="Private chauffeur", org="Van Dijk Services", periode="Mar 2026 – present", plaats="part-time",
        context="Chauffeur services for private and business clients.",
        punten=["Transported clients in a representative, discreet and punctual manner; planned and carried out journeys independently."]),
   dict(mono="M", kleur="#00A3E0", titel="Logistics employee", org="Monta", periode="Jul 2025 – present", plaats="part-time · Engelen",
        context="Fulfilment company for storage, processing and shipping of web shop orders.",
        punten=["Picking, packing and preparing orders for shipment; accurate and fast, also during peak periods."]),
   dict(mono="JS", kleur="#C2552F", titel="Intern", org="JS Trade Agency", periode="Oct 2025 – Jan 2026", plaats="Castellón · Spain",
        context="Tile trade agency in Castellón, the heart of the Spanish ceramic tile industry.",
        punten=["Approached potential clients and closed deals for tile sales and export; put my Spanish into practice."]),
   dict(mono="E", kleur="#E4003A", titel="Telesales agent", org="Eneco", periode="Oct 2025 – Jan 2026", plaats="alongside the internship",
        context="One of the largest energy suppliers in the Netherlands.",
        punten=["Called customers to sell energy contracts; persuasive and results-driven on the phone."]),
   dict(mono="C", kleur="#1E9E78", titel="Intern", org="Contronics Dry Misting", periode="Sep 2024 – Dec 2024", plaats="internship",
        context="Developer of sustainable dry-misting technology for humidification.",
        punten=["Organised files and administration, contributed ideas and helped prepare a major trade fair."]),
   dict(mono="ILS", kleur="#3A3F4B", titel="Delivery driver", org="I Love Sushi", periode="Sep 2022 – Sep 2025", plaats="",
        context="National sushi chain offering delivery and take-away.",
        punten=["Delivered orders efficiently and on time; planned routes independently and kept customer satisfaction high."]),
   dict(mono="F2F", kleur="#2F6B5A", titel="Sales Representative", org="Face to Face", periode="Jul 2021 – Aug 2022", plaats="",
        context="Sales organisation for direct sales and promotion.",
        punten=["Engaged potential clients to promote and sell products; hit monthly targets and built repeat business."]),
  ]),
}

CSS = """
@font-face{font-family:'Inter';src:url(data:font/woff2;base64,%(INTER)s) format('woff2');font-weight:100 900;}
@font-face{font-family:'Playfair';src:url(data:font/woff2;base64,%(PLAYFAIR)s) format('woff2');font-weight:400 900;}
:root{--navy:#121C33;--navy2:#1B2A49;--oranje:#F26522;--ink:#1F2433;--muted:#6B7280;--line:#E6E8EE;--paper:#FFFFFF;}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:210mm;height:297mm;background:var(--paper);font-family:'Inter',system-ui,sans-serif;color:var(--ink);font-size:8.3pt;line-height:1.36;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{position:relative;width:210mm;height:297mm;overflow:hidden;display:grid;grid-template-columns:70mm 1fr}
/* ---------- zijbalk ---------- */
.side{position:relative;background:linear-gradient(170deg,var(--navy2) 0%,var(--navy) 60%,#0D1426 100%);color:#fff;padding:11mm 8mm 10mm 9mm;overflow:hidden}
.side::before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.055) 1px,transparent 1px);background-size:6px 6px;opacity:.9}
.side::after{content:"";position:absolute;width:120mm;height:120mm;border-radius:50%;background:radial-gradient(circle,rgba(242,101,34,.28),transparent 60%);top:-52mm;left:-45mm}
.side>*{position:relative}
.photo{width:40mm;height:40mm;border-radius:50%;margin:0 auto 6mm;padding:2mm;outline:1px solid rgba(255,255,255,.22);outline-offset:2.2mm;background:conic-gradient(from 200deg,var(--oranje),#FFB27A,var(--oranje) 70%,rgba(255,255,255,.25));box-shadow:0 10px 30px rgba(0,0,0,.45)}
.photo img{width:100%;height:100%;border-radius:50%;object-fit:cover;object-position:50% 18%;display:block;border:1.2mm solid var(--navy)}
.side h3{font-family:'Playfair',serif;font-weight:700;font-size:11pt;letter-spacing:.02em;margin:5.5mm 0 2.6mm;display:flex;align-items:center;gap:3mm}
.side h3::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,var(--oranje),rgba(255,255,255,.15))}
.contact{list-style:none;display:grid;gap:2.1mm}
.contact li{display:grid;grid-template-columns:5mm 1fr;align-items:center;gap:2.5mm;font-size:8.2pt;color:#E5E9F2}
.contact svg{width:4.2mm;height:4.2mm;fill:var(--oranje)}
.contact small{display:block;color:#8F9AB3;font-size:6.6pt;letter-spacing:.08em;text-transform:uppercase}
.lang{display:grid;gap:2mm}
.lang div{display:flex;justify-content:space-between;align-items:center;font-size:8.2pt}
.lang span{color:#9AA5BD;font-size:7.4pt}
.dots{display:flex;gap:1.2mm}
.dots i{width:2.4mm;height:2.4mm;border-radius:50%;background:rgba(255,255,255,.16)}
.dots i.on{background:var(--oranje);box-shadow:0 0 6px rgba(242,101,34,.6)}
.tags{display:flex;flex-wrap:wrap;gap:1.6mm}
.tags span{font-size:7.2pt;font-weight:500;padding:1.1mm 2.4mm;border:1px solid rgba(255,255,255,.22);border-radius:99px;color:#EDF0F6;background:rgba(255,255,255,.04)}
.tags span.hi{background:var(--oranje);border-color:var(--oranje);color:#fff}
.edu{display:grid;gap:3mm}
.edu div{padding-left:3.5mm;border-left:2px solid var(--c)}
.edu b{display:block;font-size:8.4pt;color:#fff}
.edu em{display:block;font-style:normal;color:#C7CEDD;font-size:7.6pt}
.edu span{display:block;color:#8F9AB3;font-size:7pt;margin-top:.4mm}
.edu small{display:block;color:#AEB7C9;font-size:7pt;margin-top:.6mm;line-height:1.3}
.tagline{position:absolute;left:9mm;right:8mm;bottom:11mm;font-family:'Playfair',serif;font-style:italic;font-size:9pt;color:#C7CEDD;line-height:1.35;padding-top:3mm;border-top:1px solid rgba(255,255,255,.14)}
.tagline b{display:block;font-family:'Inter';font-style:normal;font-weight:600;font-size:6.6pt;letter-spacing:.16em;text-transform:uppercase;color:var(--oranje);margin-bottom:1mm}
.kern{display:grid;gap:2mm}
.kern div{font-size:7.6pt;color:#C7CEDD;line-height:1.35}
.kern b{color:#fff;display:block;font-size:8pt}
/* ---------- hoofd ---------- */
.main{position:relative;padding:8mm 10mm 8mm 10mm}
.main::before{content:"";position:absolute;right:-30mm;top:-30mm;width:80mm;height:80mm;border-radius:50%;border:14mm solid rgba(242,101,34,.07)}
.name{font-family:'Playfair',serif;font-weight:700;font-size:31pt;line-height:1;letter-spacing:-.01em;color:var(--navy)}
.name b{color:var(--oranje);font-weight:700}
.role{margin-top:2.6mm;display:flex;align-items:center;gap:2.5mm;font-size:7.6pt;font-weight:600;letter-spacing:.1em;white-space:nowrap;text-transform:uppercase;color:var(--navy2)}
.role i{width:9mm;height:2px;background:var(--oranje);display:inline-block}
.role span{color:var(--muted);font-weight:500}
.role::after{content:"";flex:1;height:1px;background:var(--line);margin-left:2mm}
h2{font-family:'Playfair',serif;font-weight:700;font-size:12.5pt;color:var(--navy);margin:3.8mm 0 2.2mm;display:flex;align-items:baseline;gap:3mm}
h2 small{font-family:'Inter';font-weight:600;font-size:6.6pt;letter-spacing:.18em;text-transform:uppercase;color:var(--oranje)}
.profile{font-size:8.4pt;line-height:1.4;color:#2B3143;padding-left:4mm;border-left:2.5px solid var(--oranje)}
.profile b{color:var(--navy);font-weight:600}
/* tijdlijn */
.tl{position:relative;display:grid;gap:1.3mm;padding-left:12mm}
.tl::before{content:"";position:absolute;left:4.6mm;top:2mm;bottom:2mm;width:1.5px;background:linear-gradient(180deg,var(--oranje),var(--line) 25%,var(--line))}
.job{position:relative;border-radius:2.2mm;padding:1.5mm 3mm 1.5mm 3.4mm;background:linear-gradient(90deg,color-mix(in srgb,var(--c) 9%,white),color-mix(in srgb,var(--c) 3%,white) 60%,white);border:1px solid color-mix(in srgb,var(--c) 22%,white);border-left:3px solid var(--c);box-shadow:0 2px 8px rgba(18,28,51,.05)}
.job::before{content:attr(data-mono);position:absolute;left:-12.2mm;top:1.2mm;width:8.8mm;height:8.8mm;border-radius:2.4mm;background:var(--c);color:#fff;font-weight:700;font-size:7.4pt;display:flex;align-items:center;justify-content:center;letter-spacing:.02em;box-shadow:0 4px 10px color-mix(in srgb,var(--c) 45%,transparent)}
.job::after{content:"";position:absolute;left:-3.6mm;top:4.8mm;width:2.6mm;height:1.5px;background:var(--c)}
.job header{display:flex;justify-content:space-between;align-items:baseline;gap:3mm}
.job h4{font-size:9.3pt;white-space:nowrap;font-weight:700;color:var(--navy);line-height:1.2}
.job h4 span{color:var(--c);font-weight:600}
.job time{font-size:7pt;font-weight:600;color:var(--navy2);white-space:nowrap;background:white;border:1px solid var(--line);border-radius:99px;padding:.6mm 2.2mm}
.job time em{font-style:normal;font-weight:500;color:var(--muted)}
.job .where{font-size:7.2pt;color:var(--muted);margin-top:.4mm}
.job .ctx{font-size:7.3pt;color:#4B5265;font-style:italic;margin:.8mm 0 .8mm;padding-left:2.2mm;border-left:1.5px solid color-mix(in srgb,var(--c) 45%,white)}
.job ul{list-style:none;display:grid;gap:.7mm}
.job li{position:relative;padding-left:3.2mm;font-size:7.9pt;line-height:1.38;color:#2B3143}
.job li::before{content:"";position:absolute;left:0;top:1.55mm;width:1.5mm;height:1.5mm;border-radius:50%;background:var(--c)}
.invul{color:#C00000;font-style:italic}
.foot{position:absolute;left:0;right:0;bottom:0;height:6.5mm;background:linear-gradient(90deg,var(--navy) 70mm,var(--oranje) 70mm,var(--oranje));display:flex;align-items:center;justify-content:flex-end;padding-right:10mm}
.foot span{font-size:6.6pt;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#fff}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:2mm;margin-top:3.2mm}
.stats div{display:flex;align-items:baseline;gap:1.6mm;padding:1.6mm 2.4mm;border-radius:2mm;background:linear-gradient(135deg,#F4F6FA,#FFFFFF);border:1px solid var(--line)}
.stats b{font-family:'Playfair',serif;font-size:14pt;font-weight:700;color:var(--oranje);line-height:1}
.stats span{font-size:6.6pt;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--navy2);line-height:1.15}
.now{display:inline-block;width:1.8mm;height:1.8mm;border-radius:50%;background:var(--c);margin-right:1.2mm;vertical-align:middle;box-shadow:0 0 0 1.2mm color-mix(in srgb,var(--c) 22%,white)}
"""

def html(t):
    contact = f"""
    <ul class=contact>
      <li>{ICONS['tel']}<div><small>{ 'Telefoon' if t['lang']=='nl' else 'Phone'}</small>06 30 26 51 20</div></li>
      <li>{ICONS['mail']}<div><small>E-mail</small>tim@timos.nl</div></li>
      <li>{ICONS['pin']}<div><small>{ 'Woonplaats' if t['lang']=='nl' else 'Location'}</small>{t['plaats']}</div></li>
      <li>{ICONS['in']}<div><small>LinkedIn</small>linkedin.com/in/tim-hendriks-98905b328</div></li>
      <li>{ICONS['web']}<div><small>Website</small>huurdirect.eu</div></li>
    </ul>"""
    talen = "".join(f"<div><b>{n}</b><span>{lvl}</span><div class=dots>{''.join('<i class=on></i>' if i<k else '<i></i>' for i in range(5))}</div></div>" for n,lvl,k in t['taal'])
    tags = "".join(f"<span class='{'hi' if i==0 else ''}'>{s}</span>" for i,s in enumerate(t['skills']))
    edu = "".join(f"<div style='--c:{s['kleur']}'><b>{s['titel']}</b><em>{s['org']}</em><span>{s['periode']}</span><small>{s['extra']}</small></div>" for s in t['scholen'])
    kern = "".join(f"<div><b>{k}</b>{v}</div>" for k,v in t['kernpunten'])
    stats = "".join(f"<div><b>{n}</b><span>{l}</span></div>" for n,l in t['stats'])
    jobs = "".join(f"""
      <article class=job style='--c:{b['kleur']}' data-mono='{b['mono']}'>
        <header><h4>{b['titel']} <span>· {b['org']}</span></h4><time>{'<i class=now></i>' if ('heden' in b['periode'] or 'present' in b['periode']) else ''}{b['periode']}{' <em>· ' + b['plaats'] + '</em>' if b['plaats'] else ''}</time></header>
        <div class=ctx>{b['context']}</div>
        <ul>{''.join(f'<li>{p}</li>' for p in b['punten'])}</ul>
      </article>""" for b in t['banen'])
    naam = "Tim <b>Hendriks</b>"
    return f"""<!doctype html><html lang={t['lang']}><head><meta charset=utf-8><title>{t['titel']}</title>
<style>{CSS.replace("%(INTER)s", INTER).replace("%(PLAYFAIR)s", PLAYFAIR)}</style></head><body>
<div class=page>
  <aside class=side>
    <div class=photo><img src="data:image/jpeg;base64,{FOTO}" alt="Tim Hendriks"></div>
    <h3>{t['contact']}</h3>{contact}
    <h3>{t['talen']}</h3><div class=lang>{talen}</div>
    <h3>{t['vaardigheden']}</h3><div class=tags>{tags}</div>
    <h3>{t['opleiding']}</h3><div class=edu>{edu}</div>
    <div class=tagline><b>{t['motto']}</b>{t['tagline']}</div>
  </aside>
  <main class=main>
    <div class=name>{naam}</div>
    <div class=role><i></i>{t['rol']} <span>· {t['rol2']}</span></div>
    <h2>{t['profiel']}<small>{'wie ik ben' if t['lang']=='nl' else 'who I am'}</small></h2>
    <p class=profile>{t['profieltekst']}</p>
    <div class=stats>{stats}</div>
    <h2>{t['werk']}<small>{'tijdlijn' if t['lang']=='nl' else 'timeline'}</small></h2>
    <div class=tl>{jobs}</div>
  </main>
  <div class=foot><span>Tim Hendriks · tim@timos.nl · 06 30 26 51 20 · huurdirect.eu</span></div>
</div></body></html>"""

for taal, t in T.items():
    (HIER / t['bestand']).write_text(html(t), encoding="utf-8")
    print(t['bestand'], "geschreven")
