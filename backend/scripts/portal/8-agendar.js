/**
 * Teste de marcar / desmarcar / remarcar pelo portal (Fatia 4B.3).
 * Inclui a corrida de dois clientes pelo mesmo horário.
 */
const { prisma, checa, fim, erroFatal } = require('./_ambiente');
const { PortalAgendaRegrasService } = require('../../dist/modules/portal/portal-agenda-regras.service');
const { PortalAgendaHorariosService, localParaUtc, ymdLocal } = require('../../dist/modules/portal/portal-agenda-horarios.service');
const { PortalAgendarService } = require('../../dist/modules/portal/portal-agendar.service');

const regras = new PortalAgendaRegrasService(prisma);
const horarios = new PortalAgendaHorariosService(prisma, regras);
const agendar = new PortalAgendarService(prisma, regras, horarios);

const ID = Date.now();
const TIPO = `TESTE_CONSULTA_${ID}`;
const MARCA = '[TESTE-AGENDAR]';
const DIA = ymdLocal(new Date(Date.now() + 7 * 24 * 60 * 60_000));
const DOW = new Date(Date.UTC(...DIA.split('-').map((v, i) => (i === 1 ? Number(v) - 1 : Number(v))))).getUTCDay();
const ESCALA = { semana: { [String(DOW)]: [['08:00', '12:00']] } };

let configOriginal = null;

async function limparDados() {
  const tutores = await prisma.tutor.findMany({ where: { name: { startsWith: MARCA } }, select: { id: true } });
  const ids = tutores.map((t) => t.id);
  if (ids.length) {
    await prisma.portalAgendamento.deleteMany({ where: { tutorId: { in: ids } } });
    await prisma.portalLiberacao.deleteMany({ where: { tutorId: { in: ids } } });
    await prisma.$executeRawUnsafe(`DELETE FROM "Appointment" WHERE "tutorId" = ANY($1::text[])`, ids);
    await prisma.pet.deleteMany({ where: { tutorId: { in: ids } } });
    await prisma.tutor.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.portalAgendaServico.deleteMany({ where: { tipo: TIPO } });
  await prisma.listaItem.deleteMany({ where: { lista: 'atendimento_tipo', valor: { contains: String(ID) } } });
  await prisma.profissional.deleteMany({ where: { nomeCompleto: { startsWith: MARCA } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: `teste-ag-${ID}` } } });
  await prisma.portalAgendaConfig.deleteMany({ where: { id: 'unico' } });
}

async function limpar() {
  await limparDados();
  if (configOriginal) {
    await prisma.portalAgendaConfig.create({ data: configOriginal });
    configOriginal = null;
  }
}

const hora = (h, m = 0) => localParaUtc(DIA, h * 60 + m).toISOString();

async function main() {
  configOriginal = await prisma.portalAgendaConfig.findUnique({ where: { id: 'unico' } });
  await limparDados();

  const user = await prisma.user.create({
    data: { name: `${MARCA} Vet`, email: `teste-ag-${ID}@exemplo.com`, password: 'x', role: 'VETERINARIAN' },
  });
  const prof = await prisma.profissional.create({
    data: { nomeCompleto: `${MARCA} Dra.`, nomeExibicao: 'Dra. Teste', ativo: true, userId: user.id, escala: ESCALA },
  });
  await prisma.listaItem.create({
    data: { lista: 'atendimento_tipo', valor: JSON.stringify({ v: TIPO, l: 'Consulta teste' }), ordem: 900 },
  });

  const tutor = await prisma.tutor.create({ data: { name: `${MARCA} Cintia` } });
  const pet = await prisma.pet.create({ data: { tutorId: tutor.id, name: 'Thor', species: 'CANINE', status: 'ACTIVE' } });
  const outro = await prisma.tutor.create({ data: { name: `${MARCA} Outro` } });
  const petOutro = await prisma.pet.create({ data: { tutorId: outro.id, name: 'Bidu', species: 'CANINE', status: 'ACTIVE' } });

  await regras.salvar({
    config: { ativo: true, antecedenciaMinHoras: 12, janelaDias: 30, maxPorDia: 3, prazoCancelarHoras: 24, desmarcacoesParaTaxa: 2, taxaCentavos: 5000 },
    servicos: [{ tipo: TIPO, ativo: true, duracaoMin: 30, agendas: [prof.id], restricao: 'TODOS' }],
  });

  console.log('\n1) Marcar');
  const opc = await agendar.opcoes(tutor.id);
  checa('a tela recebe o servico liberado', opc.servicos.some((s) => s.tipo === TIPO));
  checa('e o cliente comeca sem bloqueio', opc.bloqueio.travado === false);

  const marcado = await agendar.agendar(tutor.id, { petId: pet.id, tipo: TIPO, inicio: hora(9) }, '127.0.0.1');
  checa('devolve o agendamento criado', !!marcado.id && !!marcado.appointmentId);

  const appt = await prisma.appointment.findUnique({
    where: { id: marcado.appointmentId },
    select: { origem: true, status: true, duration: true, userId: true, date: true, type: true },
  });
  checa('entrou na agenda da equipe', !!appt);
  checa('⭐ com a marquinha de que veio do portal', appt.origem === 'PORTAL', String(appt.origem));
  checa('como Agendado', appt.status === 'Agendado');
  checa('com a duracao do servico', appt.duration === 30);
  checa('com o profissional responsavel', appt.userId === user.id);
  checa('no horario certo (09:00 da clinica)', appt.date.toISOString() === hora(9));

  const depois = await horarios.horariosDoDia(outro.id, petOutro.id, TIPO, DIA);
  checa('o horario sumiu da lista de livres', !depois.horarios.some((h) => h.hora === '09:00'));

  console.log('\n2) Dois clientes, o mesmo horario');
  let conflito = false;
  try {
    await agendar.agendar(outro.id, { petId: petOutro.id, tipo: TIPO, inicio: hora(9) });
  } catch (e) {
    conflito = /preenchido/i.test(e.message || '');
  }
  checa('o segundo e recusado com recado claro', conflito);
  const quantos = await prisma.portalAgendamento.count({
    where: { agendaId: prof.id, inicio: new Date(hora(9)), situacao: 'MARCADO' },
  });
  checa('so existe UM agendamento vivo naquele horario', quantos === 1, String(quantos));

  console.log('\n3) Meus horarios');
  const meus = await agendar.meus(tutor.id);
  checa('lista o horario do cliente', meus.length === 1 && meus[0].rotulo === 'Consulta teste');
  checa('diz que ainda da para mexer', meus[0].podeMexer === true);
  checa('e ate quando', !!meus[0].podeMexerAte);

  console.log('\n4) Remarcar NAO conta como desmarcacao');
  const remarcado = await agendar.remarcar(tutor.id, meus[0].id, hora(10, 30));
  checa('criou no horario novo', !!remarcado.appointmentId);
  const b1 = await agendar.bloqueio(tutor.id);
  checa('nao contou desmarcacao', b1.desmarcacoes === 0, String(b1.desmarcacoes));
  const livres = await horarios.horariosDoDia(outro.id, petOutro.id, TIPO, DIA);
  checa('o horario antigo voltou a ficar livre', livres.horarios.some((h) => h.hora === '09:00'));
  checa('e o novo saiu da lista', !livres.horarios.some((h) => h.hora === '10:30'));
  const apptAntigo = await prisma.appointment.findUnique({ where: { id: marcado.appointmentId }, select: { status: true } });
  checa('o agendamento antigo foi cancelado na agenda', apptAntigo.status === 'Cancelado');

  console.log('\n5) Desmarcar CONTA');
  const meus2 = await agendar.meus(tutor.id);
  const r1 = await agendar.desmarcar(tutor.id, meus2[0].id);
  checa('desmarcou', r1.desmarcado === true);
  checa('contou 1', r1.bloqueio.desmarcacoes === 1, String(r1.bloqueio.desmarcacoes));
  checa('e ainda nao travou (limite 2)', r1.bloqueio.travado === false);

  const seg = await agendar.agendar(tutor.id, { petId: pet.id, tipo: TIPO, inicio: hora(11) });
  const meus3 = await agendar.meus(tutor.id);
  const r2 = await agendar.desmarcar(tutor.id, meus3.find((m) => m.id !== seg.id) ? meus3[0].id : meus3[0].id);
  checa('na segunda desmarcacao, trava', r2.bloqueio.travado === true, JSON.stringify(r2.bloqueio));

  let barrado = false;
  try {
    await agendar.agendar(tutor.id, { petId: pet.id, tipo: TIPO, inicio: hora(8) });
  } catch (e) {
    barrado = true;
  }
  checa('travado nao consegue marcar', barrado);
  const opcTravado = await agendar.opcoes(tutor.id);
  checa('a tela recebe o aviso de travado', opcTravado.bloqueio.travado === true);
  checa('com o valor da taxa', opcTravado.bloqueio.taxaCentavos === 5000);

  console.log('\n6) Como sai do bloqueio');
  await agendar.liberar(tutor.id, 'Cintia', 'taxa paga');
  const b2 = await agendar.bloqueio(tutor.id);
  checa('a equipe liberou e zerou a conta', b2.travado === false && b2.desmarcacoes === 0);
  const voltou = await agendar.agendar(tutor.id, { petId: pet.id, tipo: TIPO, inicio: hora(8) });
  checa('e ele volta a marcar', !!voltou.appointmentId);
  const liberacao = await prisma.portalLiberacao.findFirst({ where: { tutorId: tutor.id } });
  checa('ficou registrado quem liberou', liberacao.liberadoPor === 'Cintia');

  // comparecimento tambem zera
  const meus4 = await agendar.meus(tutor.id);
  await agendar.desmarcar(tutor.id, meus4[0].id);
  await agendar.agendar(tutor.id, { petId: pet.id, tipo: TIPO, inicio: hora(8, 30) });
  const meus5 = await agendar.meus(tutor.id);
  await agendar.desmarcar(tutor.id, meus5[0].id);
  const b3 = await agendar.bloqueio(tutor.id);
  checa('duas desmarcacoes depois da liberacao travam de novo', b3.travado === true);

  // Ordem dos fatos como na vida real: ele desmarcou ANTES e compareceu DEPOIS.
  // (Se tivesse comparecido antes de desmarcar, as desmarcacoes continuariam
  // contando — e esse e o comportamento certo.)
  await prisma.portalAgendamento.updateMany({
    where: { tutorId: tutor.id, situacao: 'DESMARCADO' },
    data: { desmarcadoEm: new Date(Date.now() - 2 * 60 * 60_000) },
  });
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Appointment" (id, "tutorId", "petId", "userId", date, duration, status, "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7, NOW())`,
    `t-comp-${ID}`, tutor.id, pet.id, user.id, new Date(Date.now() - 60 * 60_000), 30, 'Realizado',
  );
  const b4 = await agendar.bloqueio(tutor.id);
  checa('comparecer zera a conta sozinho', b4.travado === false && b4.desmarcacoes === 0, JSON.stringify(b4));

  console.log('\n7) Prazo para mexer');
  const nova = await agendar.agendar(tutor.id, { petId: pet.id, tipo: TIPO, inicio: hora(9, 30) });
  // prazo gigante = o horario ja "passou do prazo"
  await regras.salvar({ config: { prazoCancelarHoras: 720 } });
  let foraDoPrazo = false;
  try {
    await agendar.desmarcar(tutor.id, nova.id);
  } catch (e) {
    foraDoPrazo = /recep|prazo|falta/i.test(e.message || '');
  }
  checa('fora do prazo nao desmarca sozinho', foraDoPrazo);
  const meus6 = await agendar.meus(tutor.id);
  checa('e a tela mostra que nao da mais para mexer', meus6[0].podeMexer === false);

  console.log('\n8) Lista de travados para a equipe');
  await regras.salvar({ config: { prazoCancelarHoras: 24 } });
  await prisma.$executeRawUnsafe(`DELETE FROM "Appointment" WHERE id = $1`, `t-comp-${ID}`);
  const lista = await agendar.travados();
  checa('a equipe ve quem esta travado', Array.isArray(lista));
}

main().catch(erroFatal).finally(() => fim(limpar));
