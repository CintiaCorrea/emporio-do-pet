-- AppointmentType enum
CREATE TYPE "AppointmentType" AS ENUM ('CONSULTA', 'RETORNO', 'AVALIACAO', 'EMERGENCIA', 'PROCEDIMENTO', 'VACINACAO', 'CIRURGIA', 'SESSAO_FISIO', 'OUTRO');

-- AppointmentStatus.MISSED
ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'MISSED';

-- Campos clínicos
ALTER TABLE "Appointment"
  ADD COLUMN "type" "AppointmentType" NOT NULL DEFAULT 'CONSULTA',
  ADD COLUMN "chiefComplaint" TEXT,
  ADD COLUMN "anamnesis" TEXT,
  ADD COLUMN "physicalExam" TEXT,
  ADD COLUMN "diagnosis" TEXT,
  ADD COLUMN "conduct" TEXT,
  ADD COLUMN "prescription" TEXT,
  ADD COLUMN "examsRequested" TEXT,
  ADD COLUMN "followUpNotes" TEXT,
  ADD COLUMN "nextReturnDate" TIMESTAMP(3),
  ADD COLUMN "petWeight" DOUBLE PRECISION,
  ADD COLUMN "temperature" DOUBLE PRECISION,
  ADD COLUMN "paymentMethod" TEXT;
