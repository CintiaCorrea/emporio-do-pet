/**
 * LIMPEZA DE LANÇAMENTOS FINANCEIROS (setup/reset) — one-shot, guardado.
 *
 * Escopo (confirmado pela Cintia): apaga caixa (recebimentos, movimentos, sessões,
 * movimentos de crédito) + Financeiro DRE (fin_lancamentos) e ZERA value/paymentStatus
 * dos atendimentos. MANTÉM cadastros (contas, categorias, unidades, fornecedores, formas),
 * atendimentos clínicos e os itens vendidos (appointment_items — não deletados).
 *
 * SEGURO por padrão: só conta (dry-run). Para apagar de verdade: WIPE_CONFIRM=YES.
 *   node dist/scripts/wipe-financeiro.js               → só mostra contagens
 *   WIPE_CONFIRM=YES node dist/scripts/wipe-financeiro.js  → apaga
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function contar() {
  const [recebimentos, caixa_movimentos, caixa_sessoes, credito_movimentos, fin_lancamentos, appts_com_valor] =
    await Promise.all([
      prisma.recebimento.count(),
      prisma.caixaMovimento.count(),
      prisma.caixaSessao.count(),
      prisma.creditoMovimento.count(),
      prisma.lancamento.count(),
      prisma.appointment.count({ where: { value: { gt: 0 } } }),
    ]);
  return { recebimentos, caixa_movimentos, caixa_sessoes, credito_movimentos, fin_lancamentos, appts_com_valor };
}

async function main() {
  const confirm = process.env.WIPE_CONFIRM === 'YES';
  console.log('=== CONTAGEM ATUAL ===');
  console.log(await contar());

  if (!confirm) {
    console.log('\n[DRY-RUN] Nada foi apagado. Rode com WIPE_CONFIRM=YES para executar.');
    return;
  }

  console.log('\n=== APAGANDO (WIPE_CONFIRM=YES) ===');
  // Ordem respeita as FKs: filhos do caixa antes das sessões.
  await prisma.$transaction([
    prisma.recebimento.deleteMany({}),
    prisma.caixaMovimento.deleteMany({}),
    prisma.creditoMovimento.deleteMany({}),
    prisma.caixaSessao.deleteMany({}),
    prisma.lancamento.deleteMany({}),
    prisma.appointment.updateMany({ data: { value: 0, paymentStatus: 'PENDING' as any } }),
  ]);

  console.log('=== CONTAGEM APÓS ===');
  console.log(await contar());
  console.log('\n✅ Limpeza financeira concluída. Cadastros e atendimentos mantidos.');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error('ERRO:', e); return prisma.$disconnect().finally(() => process.exit(1)); });
