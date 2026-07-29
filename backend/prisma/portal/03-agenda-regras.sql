-- =============================================================================
-- MODULO PORTAL DO TUTOR (PTL) — Fatia 4B.1: regras do agendamento online
--
-- A equipe define AQUI o que o cliente pode marcar sozinho pelo portal.
-- Tudo editavel na tela (Configuracoes > Agenda > Agendamento online) — nenhum
-- numero fica preso no codigo.
--
-- Duas tabelas ptl_, so adicao. O portal NAO cria coluna em tabela do CRM:
-- a lista de servicos vem de `lista_itens` (lista `atendimento_tipo`) e as
-- agendas vem de Profissional + `lista_itens` (lista `agenda_avulsa`).
--
-- Aplicar (banco local):
--   docker exec -i emporio-postgres psql -U emporio -d emporio_db \
--     -v ON_ERROR_STOP=1 < 03-agenda-regras.sql
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Regras gerais (linha unica, id = 'unico')
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ptl_agenda_config (
  id                     TEXT PRIMARY KEY,
  ativo                  BOOLEAN NOT NULL DEFAULT false,  -- chave geral
  antecedencia_min_horas INTEGER NOT NULL DEFAULT 12,     -- nao deixa marcar em cima da hora
  janela_dias            INTEGER NOT NULL DEFAULT 30,     -- ate quando a agenda fica aberta
  prazo_cancelar_horas   INTEGER NOT NULL DEFAULT 24,     -- ate quando pode desmarcar sozinho
  max_por_dia            INTEGER NOT NULL DEFAULT 2,      -- teto por cliente por dia
  desmarcacoes_para_taxa INTEGER NOT NULL DEFAULT 2,      -- desmarcacoes SEGUIDAS que travam
  taxa_centavos          INTEGER NOT NULL DEFAULT 0,      -- valor que a recepcao cobra
  mensagem_travado       TEXT,                            -- o que o cliente le quando travado
  atualizado_por         TEXT,
  updated_at             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- Regra por servico (tipo de atendimento)
--
-- `tipo` guarda o valor do `atendimento_tipo` (CONSULTA, SESSAO_FISIO...). Tipo
-- novo cadastrado pela equipe aparece na tela sozinho, sem regra ate alguem
-- ligar — o padrao e SEMPRE desligado (nada novo nasce aberto ao cliente).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ptl_agenda_servico (
  id          TEXT PRIMARY KEY,
  tipo        TEXT NOT NULL UNIQUE,
  ativo       BOOLEAN NOT NULL DEFAULT false,
  duracao_min INTEGER NOT NULL DEFAULT 30,
  agendas     TEXT[] NOT NULL DEFAULT '{}',       -- ids de Profissional e/ou de agenda avulsa
  restricao   TEXT NOT NULL DEFAULT 'TODOS',      -- TODOS | JA_CLIENTE | TEM_PACOTE
  ordem       INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ptl_agenda_servico_ativo_idx ON ptl_agenda_servico (ativo);

COMMIT;
