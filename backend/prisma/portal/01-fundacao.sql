-- =============================================================================
-- MODULO PORTAL DO TUTOR (PTL) — Fatia 1: fundacao do acesso
--
-- 3 tabelas, todas prefixadas ptl_. Somente ADICAO: zero DROP, zero ALTER em
-- tabela do CRM. O portal NAO cria coluna nenhuma em tutors/pets/contacts.
--
-- Aplicar (banco local):
--   docker exec -i emporio-postgres psql -U emporio -d emporio_db \
--     -v ON_ERROR_STOP=1 < 01-fundacao.sql
--
-- ⚠️ NAO rodar `prisma db push` neste repositorio (mesmo motivo do financeiro:
--    o schema.prisma tem mudancas do CRM paradas nele). Ver ../financeiro/README.md
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Codigos de acesso (OTP enviados no WhatsApp)
--
-- Guardamos o HASH do codigo, nunca o codigo em texto. Quem tiver acesso ao
-- banco NAO consegue entrar na conta de um tutor.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ptl_codigos (
  id           TEXT PRIMARY KEY,
  telefone     TEXT NOT NULL,              -- normalizado: so digitos, com DDI
  telefone8    TEXT NOT NULL,              -- ultimos 8 digitos (chave de busca)
  tipo         TEXT NOT NULL DEFAULT 'ACESSO', -- ACESSO (codigo do WhatsApp)
                                           -- | DESEMPATE (ticket de "qual cadastro e o seu")
  codigo_hash  TEXT NOT NULL,              -- sha256(codigo + pepper)
  tentativas   INTEGER NOT NULL DEFAULT 0,
  expira_em    TIMESTAMP(3) NOT NULL,
  usado_em     TIMESTAMP(3),
  ip           TEXT,
  created_at   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ptl_codigos_telefone8_idx  ON ptl_codigos (telefone8);
CREATE INDEX IF NOT EXISTS ptl_codigos_expira_em_idx  ON ptl_codigos (expira_em);
CREATE INDEX IF NOT EXISTS ptl_codigos_created_at_idx ON ptl_codigos (created_at);

-- -----------------------------------------------------------------------------
-- 2. Sessoes do tutor
--
-- Tambem so o hash do token. `tutor_id` e referencia SOLTA (sem FK) para o CRM,
-- mesmo padrao de box_ocupacoes e do modulo financeiro: o portal nao quebra se
-- o CRM mudar, e o CRM nao carrega dependencia do portal.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ptl_sessoes (
  id              TEXT PRIMARY KEY,
  token_hash      TEXT NOT NULL UNIQUE,
  tutor_id        TEXT NOT NULL,           -- referencia solta -> tutors.id
  telefone        TEXT NOT NULL,
  expira_em       TIMESTAMP(3) NOT NULL,
  revogada_em     TIMESTAMP(3),
  revogada_por    TEXT,                    -- nome do usuario da equipe, se derrubada
  ultimo_acesso   TIMESTAMP(3),
  user_agent      TEXT,
  ip              TEXT,
  created_at      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ptl_sessoes_tutor_id_idx  ON ptl_sessoes (tutor_id);
CREATE INDEX IF NOT EXISTS ptl_sessoes_expira_em_idx ON ptl_sessoes (expira_em);

-- -----------------------------------------------------------------------------
-- 3. Log de acesso
--
-- Dado de saude exige rastro: quem pediu codigo, quem entrou, quem errou.
-- Serve tambem para a recepcao ajudar o tutor que nao consegue entrar.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ptl_acessos (
  id          TEXT PRIMARY KEY,
  telefone8   TEXT NOT NULL,
  evento      TEXT NOT NULL,               -- CODIGO_ENVIADO | CODIGO_ERRADO | ENTROU
                                           -- | SEM_CADASTRO | DESEMPATE | BLOQUEADO | SAIU
  tutor_id    TEXT,
  detalhe     TEXT,
  ip          TEXT,
  created_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ptl_acessos_telefone8_idx  ON ptl_acessos (telefone8);
CREATE INDEX IF NOT EXISTS ptl_acessos_created_at_idx ON ptl_acessos (created_at);
CREATE INDEX IF NOT EXISTS ptl_acessos_tutor_id_idx   ON ptl_acessos (tutor_id);

COMMIT;

-- Conferencia rapida:
--   SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'ptl_%';
