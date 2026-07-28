-- =============================================================================
-- MODULO PORTAL DO TUTOR (PTL) — Fatia 2: historico de alteracoes da ficha
--
-- Decisao da Cintia (28/07): o que o tutor edita entra DIRETO no cadastro
-- (sem fila de aprovacao), mas TUDO fica registrado — inclusive o que ele
-- apagou. "Nao da para ter um historico do que e deletado pelo tutor?"
--
-- Uma linha por CAMPO alterado, com o valor de antes e o de depois. Nunca
-- apagamos linha daqui: e a memoria do que a clinica tinha registrado.
--
-- Aplicar (banco local):
--   docker exec -i emporio-postgres psql -U emporio -d emporio_db \
--     -v ON_ERROR_STOP=1 < 02-ficha.sql
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS ptl_alteracoes (
  id             TEXT PRIMARY KEY,
  tutor_id       TEXT NOT NULL,            -- quem alterou (referencia solta)
  entidade       TEXT NOT NULL,            -- TUTOR | PET
  entidade_id    TEXT NOT NULL,            -- tutors.id ou pets.id
  entidade_nome  TEXT,                     -- nome na hora da mudanca (o pet pode ser renomeado)
  campo          TEXT NOT NULL,            -- nome do campo em portugues, para a equipe ler
  valor_anterior TEXT,                     -- NULL = estava vazio
  valor_novo     TEXT,                     -- NULL = o tutor APAGOU o conteudo
  ip             TEXT,
  created_at     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ptl_alteracoes_tutor_id_idx    ON ptl_alteracoes (tutor_id);
CREATE INDEX IF NOT EXISTS ptl_alteracoes_entidade_idx    ON ptl_alteracoes (entidade, entidade_id);
CREATE INDEX IF NOT EXISTS ptl_alteracoes_created_at_idx  ON ptl_alteracoes (created_at);

COMMIT;

-- Para a equipe conferir depois (vira tela no CRM quando a Cintia pedir):
--   SELECT created_at, entidade_nome, campo, valor_anterior, valor_novo
--   FROM ptl_alteracoes ORDER BY created_at DESC LIMIT 50;
