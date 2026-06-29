-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'AGENT');

-- CreateEnum
CREATE TYPE "BodyType" AS ENUM ('LIMUZINA', 'KARAVAN', 'SUV', 'MONOVOLUMEN', 'MALI_AUTO', 'COUPE', 'KABRIOLET', 'TERENAC', 'PICKUP');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('DIESEL', 'BENZIN', 'HYBRID', 'ELEKTRICNI', 'PLIN');

-- CreateEnum
CREATE TYPE "Transmission" AS ENUM ('AUTOMATSKI', 'MANUALNI');

-- CreateEnum
CREATE TYPE "PriceRating" AS ENUM ('SEHR_GUTER', 'GUTER', 'FAIRER');

-- CreateEnum
CREATE TYPE "LeadType" AS ENUM ('CONTACT', 'FINANCING', 'VIEWING');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'AGENT',
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Car" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "priceEur" INTEGER NOT NULL,
    "priceRating" "PriceRating",
    "bodyType" "BodyType" NOT NULL,
    "firstRegistration" TEXT NOT NULL,
    "mileageKm" INTEGER NOT NULL,
    "fuelType" "FuelType" NOT NULL,
    "powerKw" INTEGER NOT NULL,
    "powerKs" INTEGER NOT NULL,
    "transmission" "Transmission" NOT NULL,
    "engineCcm" INTEGER,
    "doors" TEXT,
    "seats" INTEGER,
    "airConditioning" TEXT,
    "parkingSensors" TEXT,
    "tuv" TEXT,
    "emissionClass" TEXT,
    "origin" TEXT,
    "previousOwners" INTEGER,
    "description" TEXT,
    "warranty" TEXT,
    "originDetails" TEXT,
    "equipment" TEXT[],
    "assignedAgentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarImage" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "carId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "message" TEXT,
    "type" "LeadType" NOT NULL DEFAULT 'CONTACT',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Car_slug_key" ON "Car"("slug");

-- CreateIndex
CREATE INDEX "Car_brand_idx" ON "Car"("brand");

-- CreateIndex
CREATE INDEX "Car_published_idx" ON "Car"("published");

-- CreateIndex
CREATE INDEX "Car_featured_idx" ON "Car"("featured");

-- CreateIndex
CREATE INDEX "Car_priceEur_idx" ON "Car"("priceEur");

-- CreateIndex
CREATE INDEX "CarImage_carId_idx" ON "CarImage"("carId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- AddForeignKey
ALTER TABLE "Car" ADD CONSTRAINT "Car_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarImage" ADD CONSTRAINT "CarImage_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE SET NULL ON UPDATE CASCADE;
