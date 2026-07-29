-- =============================================================================
-- MODULO PORTAL DO TUTOR (PTL) — Fatia 6: notificacoes (web push)
--
-- Uma linha por APARELHO inscrito. O mesmo tutor pode ter celular + tablet.
-- O `endpoint` que o navegador da e a identidade do aparelho: e unico.
--
-- Quando o navegador diz que a inscricao morreu (404/410 no envio), a linha e
-- apagada — nao insistimos em aparelho que nao existe mais.
--
-- Aplicar (banco local):
--   docker exec -i emporio-postgres psql -U emporio -d emporio_db \
--     -v ON_ERROR_STOP=1 < 06-push.sql
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS ptl_push (
  id          TEXT PRIMARY KEY,
  tutor_id    TEXT NOT NULL,         -- referencia solta -> tutors.id
  endpoint    TEXT NOT NULL UNIQUE,  -- identidade do aparelho (dada pelo navegador)
  p256dh      TEXT NOT NULL,         -- chaves da inscricao (o navegador exige)
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  ultimo_envio TIMESTAMP(3),
  falhas      INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ptl_push_tutor_idx ON ptl_push (tutor_id);

-- Rastro do que foi enviado — serve para nao mandar o mesmo aviso duas vezes
-- (a chave `assunto` e idempotente: ex. "agenda:<id do agendamento>").
CREATE TABLE IF NOT EXISTS ptl_push_enviados (
  id         TEXT PRIMARY KEY,
  tutor_id   TEXT NOT NULL,
  assunto    TEXT NOT NULL,
  titulo     TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS ptl_push_enviados_assunto_key
  ON ptl_push_enviados (tutor_id, assunto);

COMMIT;
