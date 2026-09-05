-- LIGAÇÃO FORMAL entre a ocupação do box e a internação.
--
-- Até aqui `box_ocupacoes."appointmentId"` era uma referência solta: apagar a internação
-- deixava a ocupação aberta apontando pro vazio, e o box ficava preso — não aceitava paciente
-- novo, aparecia ocupado sem mostrar bicho nenhum e nem deixava ser excluído. O B02 ficou assim
-- por 14 dias, de 22/08 a 05/09/2026.
--
-- A coluna passa a aceitar NULO de propósito. Com ON DELETE SET NULL, apagar a internação NÃO
-- apaga a ocupação: o box esteve ocupado de fato, e isso é histórico da casa. O que some é o
-- ponteiro quebrado.

-- 1. A coluna aceita nulo.
ALTER TABLE "box_ocupacoes" ALTER COLUMN "appointmentId" DROP NOT NULL;

-- 2. Limpa os ponteiros que já apontam pro vazio — o banco não aceita criar a regra com eles.
--    São 5 ocupações antigas, todas já encerradas.
UPDATE "box_ocupacoes" o
   SET "appointmentId" = NULL
 WHERE o."appointmentId" IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM "Appointment" a WHERE a."id" = o."appointmentId");

-- 3. A regra.
ALTER TABLE "box_ocupacoes"
  ADD CONSTRAINT "box_ocupacoes_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
