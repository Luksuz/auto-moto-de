-- CreateEnum
CREATE TYPE "PriceRating" AS ENUM ('SEHR_GUTER', 'GUTER', 'FAIRER');

-- AlterTable
ALTER TABLE "Car" ADD COLUMN     "priceRating" "PriceRating";
