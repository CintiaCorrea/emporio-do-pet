/**
 * Base dos testes do Portal do Tutor.
 *
 * Dois detalhes do ambiente local que estes testes resolvem sozinhos:
 *  · `localhost` no DATABASE_URL as vezes resolve para IPv6 e o Postgres do
 *    Docker so escuta em IPv4 — trocamos por 127.0.0.1.
 *  · o espelho local do banco e PARCIAL (faltam colunas de Appointment e, em
 *    algumas maquinas, a tabela historico_clinico). Onde isso atrapalha, os
 *    testes inserem por SQL e avisam.
 */
const path = require('path');

// Carrega o .env do backend ANTES de tocar nas variaveis (senao sobrescrevemos
// com vazio e o Prisma nao acha o banco).
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const paraIpv4 = (url) => (url || '').replace('://localhost', '://127.0.0.1');
if (process.env.DATABASE_URL) process.env.DATABASE_URL = paraIpv4(process.env.DATABASE_URL);
process.env.DIRECT_URL = paraIpv4(process.env.DIRECT_URL || process.env.DATABASE_URL);

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const placar = { ok: 0, falhou: 0 };

function checa(descricao, condicao, detalhe) {
  if (condicao) {
    placar.ok++;
    console.log(`  ok   ${descricao}`);
  } else {
    placar.falhou++;
    console.log(`  FALHOU  ${descricao}${detalhe ? ` -> ${detalhe}` : ''}`);
  }
}

function secao(titulo) {
  console.log(`\n${titulo}`);
}

/** Encerra mostrando o placar; sai com codigo 1 se algo falhou. */
async function fim(limpar) {
  try {
    if (limpar) await limpar();
  } catch (e) {
    console.error('Falha ao limpar os dados de teste:', e.message);
  }
  const total = placar.ok + placar.falhou;
  console.log(`\n================= ${placar.ok}/${total} =================`);
  await prisma.$disconnect();
  process.exit(placar.falhou ? 1 : 0);
}

function erroFatal(e) {
  placar.falhou++;
  console.error('\nERRO NO TESTE:', e);
}

module.exports = { prisma, checa, secao, fim, erroFatal, placar };
