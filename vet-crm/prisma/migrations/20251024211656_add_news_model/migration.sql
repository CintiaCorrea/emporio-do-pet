/*
  Warnings:

  - You are about to drop the column `clientId` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the `Pet` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `tutorId` to the `Appointment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('INDIVIDUAL', 'LEGAL_ENTITY');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('MOBILE', 'PHONE', 'BUSINESS');

-- CreateEnum
CREATE TYPE "PetStatus" AS ENUM ('ACTIVE', 'DECEASED', 'TRANSFERRED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PetSpecies" AS ENUM ('CANINE', 'FELINE', 'BIRD', 'RODENT', 'REPTILE', 'OTHER');

-- CreateEnum
CREATE TYPE "SterilizationStatus" AS ENUM ('NOT_STERILIZED', 'STERILIZED', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "CoatType" AS ENUM ('SHORT', 'LONG', 'SMOOTH', 'WAVY', 'CURLY', 'GOLDEN', 'BLACK', 'WHITE', 'BROWN', 'MIXED');

-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "clientId",
ADD COLUMN     "tutorId" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."Pet";

-- CreateTable
CREATE TABLE "tutors" (
    "id" TEXT NOT NULL,
    "type" "PersonType" NOT NULL DEFAULT 'INDIVIDUAL',
    "name" TEXT NOT NULL,
    "nationality" TEXT NOT NULL DEFAULT 'Brasileira',
    "gender" "Gender",
    "cpf" TEXT,
    "rg" TEXT,
    "birthDate" TIMESTAMP(3),
    "profession" TEXT,
    "howFoundUs" TEXT,
    "acceptsEmail" BOOLEAN NOT NULL DEFAULT true,
    "acceptsWhatsApp" BOOLEAN NOT NULL DEFAULT true,
    "acceptsSMS" BOOLEAN NOT NULL DEFAULT true,
    "acceptsSmsCampaign" BOOLEAN NOT NULL DEFAULT false,
    "cep" TEXT,
    "address" TEXT,
    "addressNumber" TEXT,
    "complement" TEXT,
    "referencePoint" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "observations" TEXT,
    "tags" TEXT[],
    "formDate" TIMESTAMP(3),
    "inclusionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "type" "ContactType" NOT NULL DEFAULT 'MOBILE',
    "number" TEXT NOT NULL,
    "isWhatsApp" BOOLEAN NOT NULL DEFAULT false,
    "observations" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "tutorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" "PetSpecies" NOT NULL DEFAULT 'CANINE',
    "breed" TEXT,
    "status" "PetStatus" NOT NULL DEFAULT 'ACTIVE',
    "gender" "Gender",
    "sterilization" "SterilizationStatus" DEFAULT 'NOT_STERILIZED',
    "birthDate" TIMESTAMP(3),
    "coat" "CoatType",
    "coatColor" TEXT,
    "weight" DOUBLE PRECISION,
    "microchip" TEXT,
    "avatar" TEXT,
    "observations" TEXT,
    "allergies" TEXT[],
    "medicalNotes" TEXT,
    "tutorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tutors_cpf_key" ON "tutors"("cpf");
