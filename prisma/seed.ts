import path from "node:path";
process.loadEnvFile?.(path.join(process.cwd(), ".env"));

import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

const sampleCars: Omit<Prisma.CarCreateInput, "slug" | "assignedAgent">[] = [
  {
    title: "Volkswagen Golf VIII Lim. Life/Navi/LED/Kamera/Erster H/TOP",
    brand: "Volkswagen",
    model: "Golf",
    published: true,
    featured: true,
    priceEur: 25990,
    priceRating: "FAIRER",
    bodyType: "LIMUZINA",
    firstRegistration: "10/2023",
    mileageKm: 76000,
    fuelType: "DIESEL",
    powerKw: 110,
    powerKs: 150,
    transmission: "AUTOMATSKI",
    engineCcm: 1968,
    doors: "4/5",
    seats: 5,
    airConditioning: "Automatska, 2 zone",
    parkingSensors: "Kamera, Prednji, Straznji",
    tuv: "Novi",
    emissionClass: "Euro 6",
    origin: "EU porijeklo",
    previousOwners: 1,
    description:
      "Volkswagen Golf VIII u Life opremi. Prvi vlasnik, servisna knjižica, navigacija, LED svjetla i stražnja kamera. Vozilo u TOP stanju.",
    warranty: "Mogućnost ugovaranja produžene garancije do 36 mjeseci.",
    originDetails: "Vozilo s njemačkog tržišta, uvezeno iz EU, bez oštećenja.",
    equipment: [
      "Navigacija",
      "LED svjetla",
      "Stražnja kamera",
      "Parking senzori",
      "Tempomat",
      "Bluetooth",
      "Apple CarPlay / Android Auto",
      "Grijanje sjedala",
    ],
  },
  {
    title: "Skoda Octavia Combi Style/Navi/LED/Abstandtemp/TOP",
    brand: "Skoda",
    model: "Octavia",
    published: true,
    featured: true,
    priceEur: 21990,
    bodyType: "KARAVAN",
    firstRegistration: "03/2023",
    mileageKm: 118000,
    fuelType: "DIESEL",
    powerKw: 110,
    powerKs: 150,
    transmission: "MANUALNI",
    engineCcm: 1968,
    doors: "4/5",
    seats: 5,
    emissionClass: "Euro 6",
    origin: "EU porijeklo",
    equipment: ["Navigacija", "LED svjetla", "Adaptivni tempomat", "Parking senzori"],
  },
  {
    title: "BMW 118 d SPORT LINE/PANORAMA/LED/NAVI/SHZ/PDC/",
    brand: "BMW",
    model: "118",
    published: true,
    featured: true,
    priceEur: 20990,
    priceRating: "SEHR_GUTER",
    bodyType: "LIMUZINA",
    firstRegistration: "08/2022",
    mileageKm: 78600,
    fuelType: "DIESEL",
    powerKw: 110,
    powerKs: 150,
    transmission: "MANUALNI",
    engineCcm: 1995,
    doors: "4/5",
    seats: 5,
    emissionClass: "Euro 6",
    origin: "EU porijeklo",
    equipment: ["Panorama krov", "LED svjetla", "Navigacija", "Grijanje sjedala", "Parking senzori"],
  },
  {
    title: "Audi A3 Sportback 35 TDI advanced/VIRTUAL/LED/SHZ/PDC",
    brand: "Audi",
    model: "A3",
    published: true,
    featured: true,
    priceEur: 22790,
    priceRating: "GUTER",
    bodyType: "LIMUZINA",
    firstRegistration: "03/2022",
    mileageKm: 48100,
    fuelType: "DIESEL",
    powerKw: 110,
    powerKs: 150,
    transmission: "AUTOMATSKI",
    engineCcm: 1968,
    doors: "4/5",
    seats: 5,
    emissionClass: "Euro 6",
    origin: "EU porijeklo",
    equipment: ["Virtual Cockpit", "LED svjetla", "Grijanje sjedala", "Parking senzori"],
  },
  {
    title: "BMW X4 xDrive 20 d/HEAD-UP/LASER/LEDER/AHK/360KAMERA",
    brand: "BMW",
    model: "X4",
    published: true,
    priceEur: 40890,
    bodyType: "SUV",
    firstRegistration: "12/2023",
    mileageKm: 78800,
    fuelType: "DIESEL",
    powerKw: 140,
    powerKs: 190,
    transmission: "AUTOMATSKI",
    engineCcm: 1995,
    doors: "4/5",
    seats: 5,
    emissionClass: "Euro 6",
    origin: "EU porijeklo",
    equipment: ["Head-Up Display", "Laser svjetla", "Kožna sjedala", "Kuka", "360° kamera"],
  },
  {
    title: "Mercedes-Benz GLB 200 d AMG LINE/NIGHT-PAKET/360°KAMERA/MEMORY",
    brand: "Mercedes-Benz",
    model: "GLB",
    published: true,
    priceEur: 32890,
    priceRating: "GUTER",
    bodyType: "SUV",
    firstRegistration: "06/2021",
    mileageKm: 89800,
    fuelType: "DIESEL",
    powerKw: 110,
    powerKs: 150,
    transmission: "AUTOMATSKI",
    engineCcm: 1950,
    doors: "4/5",
    seats: 5,
    emissionClass: "Euro 6",
    origin: "EU porijeklo",
    equipment: ["AMG Line", "Night paket", "360° kamera", "Memory sjedala"],
  },
  {
    title: "Volkswagen Passat Lim. Comfortline BMT/Start-Stopp",
    brand: "Volkswagen",
    model: "Passat",
    published: true,
    priceEur: 14490,
    bodyType: "LIMUZINA",
    firstRegistration: "06/2015",
    mileageKm: 166900,
    fuelType: "DIESEL",
    powerKw: 110,
    powerKs: 150,
    transmission: "MANUALNI",
    engineCcm: 1968,
    doors: "4/5",
    seats: 5,
    emissionClass: "Euro 6",
    origin: "EU porijeklo",
    equipment: ["Comfortline", "Start-Stopp", "Tempomat", "Parking senzori"],
  },
  {
    title: "Opel Mokka e Ultimate LED/PDC+Kamera/Fahrassistenz/SHZ",
    brand: "Opel",
    model: "Mokka",
    published: true,
    featured: true,
    priceEur: 18900,
    priceRating: "FAIRER",
    bodyType: "SUV",
    firstRegistration: "06/2021",
    mileageKm: 7900,
    fuelType: "ELEKTRICNI",
    powerKw: 100,
    powerKs: 136,
    transmission: "AUTOMATSKI",
    doors: "4/5",
    seats: 5,
    emissionClass: "Euro 6",
    origin: "EU porijeklo",
    equipment: ["LED svjetla", "Kamera", "Parking senzori", "Asistencija u vožnji", "Grijanje sjedala"],
  },
];

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@kupiauto.de";
  const adminPassword = process.env.ADMIN_PASSWORD || "KupiAuto2026!";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Administrator",
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: "ADMIN",
    },
  });
  console.log(`Admin: ${admin.email}`);

  const agent = await prisma.user.upsert({
    where: { email: "ivan@kupiauto.de" },
    update: {},
    create: {
      email: "ivan@kupiauto.de",
      name: "Ivan Vidović",
      phone: "+49 177 4012397",
      passwordHash: await bcrypt.hash("Agent2026!", 10),
      role: "AGENT",
    },
  });
  console.log(`Agent: ${agent.email}`);

  for (const car of sampleCars) {
    const slug = slugify(car.title) + "-" + car.firstRegistration.replace("/", "");
    await prisma.car.upsert({
      where: { slug },
      update: {},
      create: { ...car, slug, assignedAgent: { connect: { id: agent.id } } },
    });
  }
  console.log(`Seeded ${sampleCars.length} cars.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
