-- =============================================================================
-- MODULO PORTAL DO TUTOR (PTL) — liberacao do bloqueio por desmarcacoes
--
-- Decisao da Cintia (29/07): o bloqueio NAO tem prazo. Sai de duas formas:
--   1. sozinho, quando o cliente COMPARECE a um atendimento;
--   2. pela mao da equipe, no botao "Liberar" (depois de cobrar a taxa).
--
-- A contagem de desmarcacoes considera so o que aconteceu DEPOIS da data mais
-- recente entre: ultimo comparecimento e ultima liberacao.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS ptl_liberacoes (
  id           TEXT PRIMARY KEY,
  tutor_id     TEXT NOT NULL,          -- referencia solta -> tutors.id
  liberado_por TEXT,                   -- quem da equipe liberou
  motivo       TEXT,                   -- ex.: "taxa paga em 29/07"
  created_at   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ptl_liberacoes_tutor_idx ON ptl_liberacoes (tutor_id, created_at);

COMMIT;
