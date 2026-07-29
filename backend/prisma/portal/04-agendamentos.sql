-- =============================================================================
-- MODULO PORTAL DO TUTOR (PTL) — Fatia 4B.3: agendamentos feitos pelo cliente
--
-- O agendamento em si continua sendo um `Appointment` do CRM (a agenda da
-- equipe e a fonte da verdade). Esta tabela e o RASTRO do portal: o que o
-- cliente marcou, o que ele desmarcou e o que remarcou — e e ela que responde
-- "quantas vezes seguidas essa pessoa desmarcou?".
--
-- Aplicar (banco local):
--   docker exec -i emporio-postgres psql -U emporio -d emporio_db \
--     -v ON_ERROR_STOP=1 < 04-agendamentos.sql
-- =============================================================================

BEGIN;

-- Profissional responsavel quando o servico e marcado numa SALA (agenda avulsa).
-- O CRM exige um responsavel em todo agendamento; sem isso a sala nao e oferecida.
ALTER TABLE ptl_agenda_servico
  ADD COLUMN IF NOT EXISTS responsavel_user_id TEXT;

CREATE TABLE IF NOT EXISTS ptl_agendamentos (
  id                TEXT PRIMARY KEY,
  appointment_id    TEXT NOT NULL,        -- referencia solta -> "Appointment".id
  tutor_id          TEXT NOT NULL,
  pet_id            TEXT NOT NULL,
  tipo              TEXT NOT NULL,        -- tipo de atendimento
  agenda_id         TEXT NOT NULL,        -- profissional ou sala
  inicio            TIMESTAMP(3) NOT NULL,
  duracao_min       INTEGER NOT NULL,
  situacao          TEXT NOT NULL DEFAULT 'MARCADO', -- MARCADO | DESMARCADO | REMARCADO
  desmarcado_em     TIMESTAMP(3),
  remarcado_para_id TEXT,                 -- id do novo ptl_agendamento, quando remarcou
  ip                TEXT,
  created_at        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ptl_agendamentos_tutor_idx    ON ptl_agendamentos (tutor_id, created_at);
CREATE INDEX IF NOT EXISTS ptl_agendamentos_appt_idx     ON ptl_agendamentos (appointment_id);
CREATE INDEX IF NOT EXISTS ptl_agendamentos_situacao_idx ON ptl_agendamentos (situacao, inicio);

-- ⭐ A trava contra dois clientes no mesmo horario.
-- Indice UNICO PARCIAL: so vale para os que estao MARCADO. Se duas pessoas
-- confirmarem no mesmo instante, o banco recusa a segunda — nao da para dois
-- agendamentos vivos na mesma agenda e horario. Desmarcado libera o lugar.
CREATE UNIQUE INDEX IF NOT EXISTS ptl_agendamentos_slot_unico
  ON ptl_agendamentos (agenda_id, inicio)
  WHERE situacao = 'MARCADO';

COMMIT;
