// One-off: bring inventory to 20 published cars — insert 12 new realistic
// vehicles, add descriptions/warranty to existing cars missing them, and
// unpublish the "test" entry. Usage: node scripts/seed-more-cars.mjs
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

process.loadEnvFile(".env");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const WARRANTY =
  "Na ovo vozilo moguće je ugovoriti garanciju do 3 godine (pokriva motor, mjenjač i elektroniku). Detalje i uvjete garancije dogovaramo prilikom kupnje — javite nam se putem WhatsAppa za ponudu.";

const ORIGIN_DETAILS =
  "Vozilo je uvezeno iz Njemačke s potpunom servisnom poviješću u ovlaštenom servisu. Kilometraža je provjerena i dokumentirana, a vozilo dolazi sa svom pripadajućom dokumentacijom.";

function desc(intro, oprema, zakljucak) {
  return `${intro}\n\n${oprema}\n\n${zakljucak}`;
}

const NEW_CARS = [
  {
    slug: "volkswagen-tiguan-2-0-tdi-dsg-life-navi-led-acc-kamera-052021",
    title: "Volkswagen Tiguan 2.0 TDI DSG Life/NAVI/LED/ACC/Kamera",
    brand: "Volkswagen", model: "Tiguan", bodyType: "SUV",
    firstRegistration: "05/2021", mileageKm: 84500, fuelType: "DIESEL",
    powerKw: 110, powerKs: 150, transmission: "AUTOMATSKI", engineCcm: 1968,
    doors: "4/5", seats: 5, airConditioning: "Automatska, 3 zone",
    parkingSensors: "Kamera, Prednji, Stražnji", emissionClass: "Euro 6d",
    tuv: "05/2027", origin: "EU porijeklo", previousOwners: 1,
    priceEur: 26490, featured: true,
    equipment: ["LED prednja svjetla", "Navigacijski sustav", "ACC tempomat", "Kamera za vožnju unatrag", "Grijana sjedala", "DSG automatski mjenjač", "Digitalni kokpit", "App-Connect (CarPlay/Android Auto)", "Senzori parkiranja naprijed i natrag", "Aluminijske felge 18\"", "Start-stop sustav", "Lane Assist"],
    description: desc(
      "Volkswagen Tiguan 2.0 TDI s DSG mjenjačem u Life opremi — jedan od najtraženijih obiteljskih SUV-ova na tržištu. Prvi vlasnik, potpuna servisna povijest u ovlaštenom VW servisu, bez ulaganja.",
      "Od opreme izdvajamo: LED svjetla, veliku navigaciju, adaptivni tempomat (ACC), kameru za vožnju unatrag, grijana sjedala i digitalni kokpit. Prostran i ekonomičan — idealan za obitelj i duga putovanja.",
      "Vozilo je uvezeno iz Njemačke, kilometraža provjerena. Moguće financiranje za zaposlene u Njemačkoj i Austriji te garancija do 3 godine.",
    ),
  },
  {
    slug: "volkswagen-golf-vii-variant-1-6-tdi-comfortline-navi-062019",
    title: "Volkswagen Golf VII Variant 1.6 TDI Comfortline/NAVI",
    brand: "Volkswagen", model: "Golf", bodyType: "KARAVAN",
    firstRegistration: "06/2019", mileageKm: 128000, fuelType: "DIESEL",
    powerKw: 85, powerKs: 115, transmission: "MANUALNI", engineCcm: 1598,
    doors: "4/5", seats: 5, airConditioning: "Automatska, 2 zone",
    parkingSensors: "Stražnji", emissionClass: "Euro 6",
    tuv: "06/2026", origin: "EU porijeklo", previousOwners: 1,
    priceEur: 13990, equipment: ["Navigacijski sustav", "Tempomat", "Senzori parkiranja straga", "Grijana sjedala", "Multifunkcijski upravljač", "Bluetooth", "Krovni nosači", "Aluminijske felge 16\"", "Start-stop sustav", "Automatska klima"],
    description: desc(
      "Volkswagen Golf VII Variant 1.6 TDI — pouzdan i štedljiv karavan s velikim prtljažnikom. Redovito servisiran, u odličnom stanju za svoju godinu.",
      "Comfortline oprema uključuje navigaciju, tempomat, grijana sjedala, automatsku dvozonsku klimu i stražnje parkirne senzore. Potrošnja na otvorenom ispod 5 l/100 km.",
      "Njemačko porijeklo s dokumentiranom kilometražom. Odlična prilika u ovom cjenovnom rangu — moguće financiranje i garancija.",
    ),
  },
  {
    slug: "bmw-320d-touring-m-sport-live-cockpit-led-ahk-shz-092021",
    title: "BMW 320d Touring M Sport/LIVE COCKPIT/LED/AHK/SHZ",
    brand: "BMW", model: "320", bodyType: "KARAVAN",
    firstRegistration: "09/2021", mileageKm: 92000, fuelType: "DIESEL",
    powerKw: 140, powerKs: 190, transmission: "AUTOMATSKI", engineCcm: 1995,
    doors: "4/5", seats: 5, airConditioning: "Automatska, 3 zone",
    parkingSensors: "Kamera, Prednji, Stražnji", emissionClass: "Euro 6d",
    tuv: "09/2027", origin: "EU porijeklo", previousOwners: 1,
    priceEur: 31900, featured: true,
    equipment: ["M Sport paket", "Live Cockpit Professional", "LED adaptivna svjetla", "Kuka za vuču (AHK)", "Grijana sjedala", "Sportska sjedala", "Kamera za vožnju unatrag", "Navigacija Professional", "Automatski mjenjač Steptronic", "Aluminijske felge 18\" M", "Ambijentalna rasvjeta", "Električna vrata prtljažnika"],
    description: desc(
      "BMW 320d Touring u M Sport paketu — savršen spoj sportske dinamike i obiteljske praktičnosti. Prvi vlasnik, servisiran isključivo u BMW servisu.",
      "M Sport paket, Live Cockpit Professional s velikim zaslonima, adaptivna LED svjetla, kuka za vuču, grijana sportska sjedala i električna vrata prtljažnika. Legendarni 2.0d motor sa 190 KS uz automatski mjenjač.",
      "Uvoz iz Njemačke, kilometraža provjerena i dokumentirana. Financiranje od 371 €/mj i garancija do 3 godine.",
    ),
  },
  {
    slug: "bmw-x1-sdrive18d-advantage-navi-pdc-shz-tempomat-032020",
    title: "BMW X1 sDrive18d Advantage/NAVI/PDC/SHZ/Tempomat",
    brand: "BMW", model: "X1", bodyType: "SUV",
    firstRegistration: "03/2020", mileageKm: 105000, fuelType: "DIESEL",
    powerKw: 110, powerKs: 150, transmission: "AUTOMATSKI", engineCcm: 1995,
    doors: "4/5", seats: 5, airConditioning: "Automatska, 2 zone",
    parkingSensors: "Stražnji", emissionClass: "Euro 6d",
    tuv: "03/2027", origin: "EU porijeklo", previousOwners: 2,
    priceEur: 22490, equipment: ["Navigacijski sustav", "Senzori parkiranja straga", "Grijana sjedala", "Tempomat", "Automatski mjenjač", "LED svjetla", "Električna vrata prtljažnika", "Aluminijske felge 17\"", "Multifunkcijski upravljač", "Bluetooth"],
    description: desc(
      "BMW X1 sDrive18d — kompaktan premium SUV s povišenim položajem sjedenja i prostranom unutrašnjošću. Uredna servisna povijest.",
      "Advantage oprema s navigacijom, automatskim mjenjačem, grijanim sjedalima, LED svjetlima i električnim vratima prtljažnika. Ekonomičan dizelski motor idealan za svakodnevnu vožnju i putovanja.",
      "Njemačko porijeklo, provjerena kilometraža. Moguće financiranje za zaposlene u Njemačkoj i Austriji te garancija do 3 godine.",
    ),
  },
  {
    slug: "audi-a4-avant-40-tdi-s-tronic-s-line-matrix-virtual-102021",
    title: "Audi A4 Avant 40 TDI S tronic S line/MATRIX/VIRTUAL",
    brand: "Audi", model: "A4", bodyType: "KARAVAN",
    firstRegistration: "10/2021", mileageKm: 88000, fuelType: "DIESEL",
    powerKw: 150, powerKs: 204, transmission: "AUTOMATSKI", engineCcm: 1968,
    doors: "4/5", seats: 5, airConditioning: "Automatska, 3 zone",
    parkingSensors: "Kamera, Prednji, Stražnji", emissionClass: "Euro 6d",
    tuv: "10/2027", origin: "EU porijeklo", previousOwners: 1,
    priceEur: 33900, featured: true,
    equipment: ["S line eksterijer i interijer", "Matrix LED svjetla", "Virtual Cockpit", "S tronic automatski mjenjač", "Kamera za vožnju unatrag", "Grijana sportska sjedala", "MMI Navigacija plus", "Trozonske klima", "Aluminijske felge 18\"", "Ambijentalna rasvjeta", "Električna vrata prtljažnika", "Audi pre sense"],
    description: desc(
      "Audi A4 Avant 40 TDI S tronic u S line opremi — elegantan poslovni karavan s Matrix LED svjetlima i Virtual Cockpitom. Prvi vlasnik, kompletna povijest održavanja.",
      "S line paket izvana i iznutra, Matrix LED, Virtual Cockpit, MMI navigacija plus, grijana sportska sjedala, kamera i trozonska klima. Snažan 204 KS motor uz izuzetno nisku potrošnju.",
      "Uvezen iz Njemačke s dokumentiranom kilometražom. Financiranje od 394 €/mj, garancija do 3 godine.",
    ),
  },
  {
    slug: "audi-q3-35-tfsi-s-line-led-virtual-navi-kamera-042022",
    title: "Audi Q3 35 TFSI S line/LED/VIRTUAL/NAVI/Kamera",
    brand: "Audi", model: "Q3", bodyType: "SUV",
    firstRegistration: "04/2022", mileageKm: 56000, fuelType: "BENZIN",
    powerKw: 110, powerKs: 150, transmission: "AUTOMATSKI", engineCcm: 1498,
    doors: "4/5", seats: 5, airConditioning: "Automatska, 2 zone",
    parkingSensors: "Kamera, Stražnji", emissionClass: "Euro 6d",
    tuv: "04/2028", origin: "EU porijeklo", previousOwners: 1,
    priceEur: 31490, equipment: ["S line paket", "LED svjetla", "Virtual Cockpit", "Navigacijski sustav", "Kamera za vožnju unatrag", "S tronic mjenjač", "Grijana sjedala", "Aluminijske felge 19\"", "Električna vrata prtljažnika", "Tempomat", "CarPlay/Android Auto"],
    description: desc(
      "Audi Q3 35 TFSI S line — moderan kompaktni SUV s benzinskim motorom, idealan za grad i autocestu. Kao nov, prvi vlasnik, niska kilometraža.",
      "S line paket s felgama 19\", LED svjetla, Virtual Cockpit, navigacija, kamera i grijana sjedala. Automatski S tronic mjenjač za opuštenu vožnju.",
      "Njemačko porijeklo, servisna knjiga. Moguće financiranje i garancija do 3 godine — kontaktirajte nas putem WhatsAppa.",
    ),
  },
  {
    slug: "mercedes-benz-c-220-d-avantgarde-led-navi-kamera-shz-072020",
    title: "Mercedes-Benz C 220 d Avantgarde/LED/NAVI/Kamera/SHZ",
    brand: "Mercedes-Benz", model: "C", bodyType: "LIMUZINA",
    firstRegistration: "07/2020", mileageKm: 98000, fuelType: "DIESEL",
    powerKw: 143, powerKs: 194, transmission: "AUTOMATSKI", engineCcm: 1950,
    doors: "4/5", seats: 5, airConditioning: "Automatska, 2 zone",
    parkingSensors: "Kamera, Prednji, Stražnji", emissionClass: "Euro 6d",
    tuv: "07/2026", origin: "EU porijeklo", previousOwners: 1,
    priceEur: 27990, equipment: ["Avantgarde paket", "LED High Performance svjetla", "Navigacija Comand", "Kamera za vožnju unatrag", "Grijana sjedala", "9G-Tronic automatski mjenjač", "Aluminijske felge 17\"", "Tempomat s ograničivačem", "KEYLESS-GO start", "Ambijentalna rasvjeta"],
    description: desc(
      "Mercedes-Benz C 220 d Avantgarde — bezvremenska poslovna limuzina s 9G-Tronic automatikom. Prvi vlasnik, servisiran u Mercedes servisu.",
      "Avantgarde linija, LED svjetla visokih performansi, Comand navigacija, kamera, grijana sjedala i ambijentalna rasvjeta. Snažan i štedljiv 194 KS dizel.",
      "Uvoz iz Njemačke s potpunom dokumentacijom. Financiranje od 326 €/mj, garancija do 3 godine.",
    ),
  },
  {
    slug: "mercedes-benz-a-180-d-progressive-mbux-led-kamera-092021",
    title: "Mercedes-Benz A 180 d Progressive/MBUX/LED/Kamera",
    brand: "Mercedes-Benz", model: "A", bodyType: "MALI_AUTO",
    firstRegistration: "09/2021", mileageKm: 67000, fuelType: "DIESEL",
    powerKw: 85, powerKs: 116, transmission: "AUTOMATSKI", engineCcm: 1950,
    doors: "4/5", seats: 5, airConditioning: "Automatska, 1 zona",
    parkingSensors: "Kamera, Stražnji", emissionClass: "Euro 6d",
    tuv: "09/2027", origin: "EU porijeklo", previousOwners: 1,
    priceEur: 22990, equipment: ["MBUX multimedija s velikim zaslonom", "LED svjetla", "Kamera za vožnju unatrag", "Progressive linija", "7G-DCT automatski mjenjač", "Grijana sjedala", "Aluminijske felge 17\"", "Tempomat", "CarPlay/Android Auto", "Senzori parkiranja"],
    description: desc(
      "Mercedes-Benz A 180 d Progressive s MBUX sustavom — kompaktna klasa s premium osjećajem. Niska kilometraža, prvi vlasnik.",
      "MBUX multimedija s velikim zaslonima i glasovnim upravljanjem, LED svjetla, kamera, grijana sjedala i automatski mjenjač. Gradski auto s potrošnjom od 4,5 l/100 km.",
      "Njemačko porijeklo, servisna povijest. Moguće financiranje za zaposlene u Njemačkoj i Austriji te garancija do 3 godine.",
    ),
  },
  {
    slug: "skoda-superb-combi-2-0-tdi-dsg-style-matrix-canton-022022",
    title: "Škoda Superb Combi 2.0 TDI DSG Style/MATRIX/CANTON",
    brand: "Skoda", model: "Superb", bodyType: "KARAVAN",
    firstRegistration: "02/2022", mileageKm: 79000, fuelType: "DIESEL",
    powerKw: 147, powerKs: 200, transmission: "AUTOMATSKI", engineCcm: 1968,
    doors: "4/5", seats: 5, airConditioning: "Automatska, 3 zone",
    parkingSensors: "Kamera, Prednji, Stražnji", emissionClass: "Euro 6d",
    tuv: "02/2028", origin: "EU porijeklo", previousOwners: 1,
    priceEur: 28900, equipment: ["Matrix LED svjetla", "Canton audio sustav", "Virtual Cockpit", "DSG automatski mjenjač", "Kamera za vožnju unatrag", "Grijana sjedala naprijed i straga", "Navigacija Columbus", "Trozonska klima", "Električna vrata prtljažnika", "ACC tempomat", "Aluminijske felge 18\"", "KESSY keyless"],
    description: desc(
      "Škoda Superb Combi 2.0 TDI DSG Style — kralj prostora među karavanima, s Matrix LED svjetlima i Canton ozvučenjem. Prvi vlasnik.",
      "Style oprema: Matrix LED, Virtual Cockpit, Columbus navigacija, Canton audio, ACC, kamera, grijana sjedala naprijed i straga te električni prtljažnik od preko 660 litara.",
      "Uvoz iz Njemačke, dokumentirana kilometraža. Odličan omjer opreme i cijene — financiranje od 336 €/mj, garancija do 3 godine.",
    ),
  },
  {
    slug: "skoda-kodiaq-2-0-tdi-dsg-style-7-sjedala-navi-acc-062021",
    title: "Škoda Kodiaq 2.0 TDI DSG Style 7 sjedala/NAVI/ACC",
    brand: "Skoda", model: "Kodiaq", bodyType: "SUV",
    firstRegistration: "06/2021", mileageKm: 96000, fuelType: "DIESEL",
    powerKw: 110, powerKs: 150, transmission: "AUTOMATSKI", engineCcm: 1968,
    doors: "4/5", seats: 7, airConditioning: "Automatska, 3 zone",
    parkingSensors: "Kamera, Prednji, Stražnji", emissionClass: "Euro 6d",
    tuv: "06/2027", origin: "EU porijeklo", previousOwners: 1,
    priceEur: 27490, featured: true,
    equipment: ["7 sjedala", "DSG automatski mjenjač", "Navigacijski sustav", "ACC tempomat", "Kamera za vožnju unatrag", "LED svjetla", "Grijana sjedala", "Trozonska klima", "Električna vrata prtljažnika", "Aluminijske felge 18\"", "Krovni nosači"],
    description: desc(
      "Škoda Kodiaq 2.0 TDI DSG sa 7 sjedala — pravi obiteljski SUV za veće obitelji. Prvi vlasnik, uredna servisna povijest.",
      "Style oprema sa 7 sjedala, navigacijom, ACC tempomatom, LED svjetlima, kamerom, grijanim sjedalima i električnim prtljažnikom. Prostran, praktičan i ekonomičan.",
      "Njemačko porijeklo, provjerena kilometraža. Financiranje od 320 €/mj i garancija do 3 godine.",
    ),
  },
  {
    slug: "ford-focus-turnier-1-5-ecoblue-titanium-navi-led-082020",
    title: "Ford Focus Turnier 1.5 EcoBlue Titanium/NAVI/LED",
    brand: "Ford", model: "Focus", bodyType: "KARAVAN",
    firstRegistration: "08/2020", mileageKm: 112000, fuelType: "DIESEL",
    powerKw: 88, powerKs: 120, transmission: "MANUALNI", engineCcm: 1499,
    doors: "4/5", seats: 5, airConditioning: "Automatska, 2 zone",
    parkingSensors: "Stražnji", emissionClass: "Euro 6d",
    tuv: "08/2026", origin: "EU porijeklo", previousOwners: 1,
    priceEur: 13490, equipment: ["LED svjetla", "Navigacijski sustav SYNC 3", "Tempomat", "Grijana sjedala", "Grijani upravljač", "Senzori parkiranja straga", "Aluminijske felge 17\"", "CarPlay/Android Auto", "Automatska klima", "Start-stop sustav"],
    description: desc(
      "Ford Focus Turnier 1.5 EcoBlue Titanium — prostran i izuzetno štedljiv karavan. Redovito održavan, spreman za nove kilometre.",
      "Titanium oprema: LED svjetla, SYNC 3 navigacija s CarPlay/Android Auto, grijana sjedala i upravljač, tempomat i dvozonska klima.",
      "Njemačko porijeklo s dokumentacijom. Sjajna vrijednost za novac — moguće financiranje i garancija do 3 godine.",
    ),
  },
  {
    slug: "renault-clio-tce-90-intens-led-navi-kamera-pdc-052022",
    title: "Renault Clio TCe 90 Intens/LED/NAVI/Kamera/PDC",
    brand: "Renault", model: "Clio", bodyType: "MALI_AUTO",
    firstRegistration: "05/2022", mileageKm: 43000, fuelType: "BENZIN",
    powerKw: 67, powerKs: 91, transmission: "MANUALNI", engineCcm: 999,
    doors: "4/5", seats: 5, airConditioning: "Automatska, 1 zona",
    parkingSensors: "Kamera, Stražnji", emissionClass: "Euro 6d",
    tuv: "05/2028", origin: "EU porijeklo", previousOwners: 1,
    priceEur: 13990, equipment: ["LED svjetla", "Navigacijski sustav EASY LINK", "Kamera za vožnju unatrag", "Senzori parkiranja", "Tempomat", "Automatska klima", "Aluminijske felge 16\"", "CarPlay/Android Auto", "Multifunkcijski upravljač"],
    description: desc(
      "Renault Clio TCe 90 Intens — moderan gradski auto s bogatom opremom i niskom potrošnjom. Prvi vlasnik, niska kilometraža, kao nov.",
      "Intens oprema: full LED svjetla, EASY LINK navigacija s velikim zaslonom, kamera, senzori parkiranja i automatska klima.",
      "Njemačko porijeklo, servisna knjiga. Idealan prvi auto ili gradski drugi auto — moguće financiranje i garancija.",
    ),
  },
];

// Descriptions for the existing cars that lack them (keyed by slug prefix).
const EXISTING_DESCRIPTIONS = {
  "skoda-octavia-combi-style": {
    description: desc(
      "Škoda Octavia Combi Style — najprodavaniji karavan u klasi, s LED svjetlima i velikom navigacijom. Prvi vlasnik, servisna povijest kompletna.",
      "Style oprema: LED Matrix svjetla, navigacija, adaptivni tempomat (Abstandstempomat), digitalni kokpit i prostran prtljažnik od 640 litara.",
      "Uvoz iz Njemačke, provjerena kilometraža. Moguće financiranje za zaposlene u Njemačkoj i Austriji te garancija do 3 godine.",
    ),
    equipment: ["Matrix LED svjetla", "Navigacijski sustav", "ACC tempomat", "Digitalni kokpit", "Grijana sjedala", "Senzori parkiranja", "Aluminijske felge 17\"", "CarPlay/Android Auto", "Automatska dvozonska klima", "Tempomat"],
  },
  "bmw-118-d-sport-line": {
    description: desc(
      "BMW 118d Sport Line s panoramskim krovom — dinamičan kompaktni BMW s bogatom opremom. Prvi vlasnik, BMW servisna povijest.",
      "Sport Line paket, panoramski krov, LED svjetla, navigacija, grijana sportska sjedala i parkirni senzori. Štedljiv 2.0 dizel s voznim užitkom svojstvenim BMW-u.",
      "Njemačko porijeklo s dokumentacijom. Financiranje od 262 €/mj i garancija do 3 godine.",
    ),
    equipment: ["Sport Line paket", "Panoramski krov", "LED svjetla", "Navigacijski sustav", "Grijana sportska sjedala", "Senzori parkiranja", "Aluminijske felge 17\"", "Tempomat", "Automatska klima", "Multifunkcijski upravljač"],
  },
  "audi-a3-sportback": {
    description: desc(
      "Audi A3 Sportback 35 TDI advanced — premium kompakt s Virtual Cockpitom i LED svjetlima. Prvi vlasnik, uredna povijest održavanja.",
      "Advanced linija: Virtual Cockpit, LED svjetla, grijana sjedala, parkirni senzori i navigacija. Ekonomičan 2.0 TDI motor — pravi svestrani auto.",
      "Uvoz iz Njemačke, kilometraža provjerena. Moguće financiranje i garancija do 3 godine — javite se putem WhatsAppa.",
    ),
    equipment: ["Virtual Cockpit", "LED svjetla", "Navigacijski sustav", "Grijana sjedala", "Senzori parkiranja", "Advanced eksterijer", "Aluminijske felge 17\"", "Tempomat", "CarPlay/Android Auto", "Automatska klima"],
  },
  "bmw-x4-xdrive": {
    description: desc(
      "BMW X4 xDrive20d — atraktivan SUV coupé s pogonom na sva četiri kotača i vrhunskom opremom. Prvi vlasnik, BMW servisna povijest.",
      "Head-Up zaslon, Laser svjetla, kožni interijer, kuka za vuču i 360° kamera. xDrive pogon za sigurnost u svim uvjetima.",
      "Njemačko porijeklo, dokumentirana kilometraža. Financiranje od 475 €/mj i garancija do 3 godine.",
    ),
    equipment: ["xDrive pogon 4x4", "Head-Up zaslon", "Laser svjetla", "Kožni interijer", "Kuka za vuču (AHK)", "360° kamera", "Navigacija Professional", "Grijana sjedala", "Električna vrata prtljažnika", "Aluminijske felge 19\"", "Automatski mjenjač Steptronic"],
  },
  "mercedes-benz-glb-200-d": {
    description: desc(
      "Mercedes-Benz GLB 200 d AMG Line s Night paketom — prostran SUV s do 7 sjedala i sportskim izgledom. Prvi vlasnik.",
      "AMG Line, Night paket, 360° kamera, memorija sjedala, MBUX multimedija i LED svjetla. Praktičnost GLB-a uz AMG estetiku.",
      "Uvoz iz Njemačke s potpunom dokumentacijom. Financiranje od 383 €/mj, garancija do 3 godine.",
    ),
    equipment: ["AMG Line paket", "Night paket", "360° kamera", "Memorija sjedala", "MBUX multimedija", "LED High Performance svjetla", "Grijana sjedala", "Automatski mjenjač 8G-DCT", "Aluminijske felge 19\" AMG", "Ambijentalna rasvjeta"],
  },
  "volkswagen-passat-lim": {
    description: desc(
      "Volkswagen Passat Comfortline BMT — pouzdana poslovna limuzina s niskom potrošnjom. Redovito servisiran, u vrlo dobrom stanju.",
      "Comfortline oprema s automatskom klimom, tempomatom, senzorima parkiranja i multifunkcijskim upravljačem. Provjeren i izdržljiv motor.",
      "Njemačko porijeklo s dokumentiranom kilometražom. Pristupačna cijena — moguće financiranje i garancija.",
    ),
    equipment: ["Automatska klima", "Tempomat", "Senzori parkiranja", "Multifunkcijski upravljač", "Bluetooth", "Aluminijske felge 16\"", "Start-stop sustav", "Grijana sjedala"],
  },
  "opel-mokka-e-ultimate": {
    description: desc(
      "Opel Mokka-e Ultimate — potpuno električni gradski SUV s upečatljivim dizajnom i najbogatijom opremom. Prvi vlasnik, niska kilometraža.",
      "Ultimate oprema: LED Matrix svjetla, kamera i senzori, paket asistencije vožnje, grijana sjedala i navigacija. Domet do 340 km (WLTP) — idealan za grad i prigradsku vožnju, uz gotovo besplatno 'točenje'.",
      "Njemačko porijeklo, provjerena kilometraža i stanje baterije. Moguće financiranje i garancija do 3 godine.",
    ),
    equipment: ["LED Matrix svjetla", "Kamera za vožnju unatrag", "Paket asistencije vožnje", "Grijana sjedala", "Navigacijski sustav", "Senzori parkiranja", "Aluminijske felge 17\"", "CarPlay/Android Auto", "Automatska klima", "Tempomat"],
  },
};

// 1. Insert new cars
for (const car of NEW_CARS) {
  const created = await prisma.car.upsert({
    where: { slug: car.slug },
    create: { ...car, published: true, warranty: WARRANTY, originDetails: ORIGIN_DETAILS },
    update: {},
  });
  console.log(`+ ${created.slug}`);
}

// 2. Enrich existing cars missing descriptions
const existing = await prisma.car.findMany({
  where: { OR: [{ description: null }, { description: "" }] },
  select: { id: true, slug: true },
});
for (const car of existing) {
  const key = Object.keys(EXISTING_DESCRIPTIONS).find((k) => car.slug.startsWith(k));
  if (!key) continue;
  const data = EXISTING_DESCRIPTIONS[key];
  await prisma.car.update({
    where: { id: car.id },
    data: { ...data, warranty: WARRANTY, originDetails: ORIGIN_DETAILS },
  });
  console.log(`~ enriched ${car.slug}`);
}

// 3. Unpublish the "test" entry
const test = await prisma.car.updateMany({
  where: { slug: "test" },
  data: { published: false },
});
if (test.count) console.log("~ unpublished 'test'");

const published = await prisma.car.count({ where: { published: true } });
console.log(`published cars now: ${published}`);
await prisma.$disconnect();
