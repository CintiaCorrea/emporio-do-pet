-- =============================================================================
-- DIETA / ALIMENTACAO — tabela CLINICA (dominio do CRM, nao do portal)
--
-- Por que sem prefixo `ptl_`: quem prescreve a dieta e a veterinaria, na ficha
-- do pet. E dado clinico do CRM. O Portal do Tutor apenas LE (regra de parede
-- nº 4: le do vizinho, escreve so no seu). A tabela nasceu junto com o portal
-- porque foi ele que expos a falta — mas o dono e o modulo clinico.
--
-- Uma dieta ATIVA por pet (a mais recente). As antigas ficam com ativa=false,
-- viram historico e nunca sao apagadas: e prescricao.
--
-- Aplicar (banco local):
--   docker exec -i emporio-postgres psql -U emporio -d emporio_db \
--     -v ON_ERROR_STOP=1 < 01-dietas.sql
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS dietas (
  id                TEXT PRIMARY KEY,
  "petId"           TEXT NOT NULL,
  "tutorId"         TEXT,
  -- Quem prescreveu: guardamos o nome como SNAPSHOT (o profissional pode sair
  -- da clinica e a prescricao continua sendo dele).
  "prescritorNome"  TEXT,
  "prescritorUserId" TEXT,
  data              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ativa             BOOLEAN NOT NULL DEFAULT true,

  -- O que o pet come: [{ nome, detalhe }]
  itens             JSONB NOT NULL DEFAULT '[]',
  -- O que o tutor PODE variar (aparece em verde no portal): ["texto", ...]
  variacoes         JSONB NOT NULL DEFAULT '[]',
  -- O que ele deve EVITAR (aparece em vermelho): ["texto", ...]
  evitar            JSONB NOT NULL DEFAULT '[]',

  observacao        TEXT,
  -- Anexo (receita de comida natural, por ex.) no object storage.
  "anexoKey"        TEXT,
  "anexoNome"       TEXT,

  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT dietas_pet_fk FOREIGN KEY ("petId") REFERENCES pets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS dietas_pet_idx   ON dietas ("petId", data DESC);
CREATE INDEX IF NOT EXISTS dietas_ativa_idx ON dietas ("petId", ativa);

COMMIT;
