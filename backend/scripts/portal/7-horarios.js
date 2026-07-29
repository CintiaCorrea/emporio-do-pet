/**
 * Teste do MOTOR DE HORÁRIOS (Fatia 4B.2) — o mais importante da suite.
 * Se este errar, dois clientes pegam o mesmo horário.
 */
const { prisma, checa, fim, erroFatal } = require('./_ambiente');
const { PortalAgendaRegrasService } = require('../../dist/modules/portal/portal-agenda-regras.service');
const {
  PortalAgendaHorariosService,
  localParaUtc,
  ymdLocal,
} = require('../../dist/modules/portal/portal-agenda-horarios.service');

const regras = new PortalAgendaRegrasService(prisma);
const motor = new PortalAgendaHorariosService(prisma, regras);

const ID = Date.now();
const TIPO = `TESTE_CONSULTA_${ID}`;
const TIPO_FISIO = `TESTE_FISIO_${ID}`;
const MARCA = '[TESTE-HORARIOS]';
const MAP1 = `map1-${ID}`;
const MAP2 = `map2-${ID}`;

/** Dia de teste: daqui a 7 dias (longe de "hoje", perto o bastante da janela). */
const DIA = ymdLocal(new Date(Date.now() + 7 * 24 * 60 * 60_000));
const DOW = new Date(Date.UTC(...DIA.split('-').map((v, i) => (i === 1 ? Number(v) - 1 : Number(v))))).getUTCDay();

const ESCALA_MANHA = { semana: { [String(DOW)]: [['08:00', '12:00']] } };

let configOriginal = null;
const apts = [];

async function limparDados() {
  if (apts.length) {
    await prisma.$executeRawUnsafe(`DELETE FROM "Appointment" WHERE id = ANY($1::text[])`, apts);
    apts.length = 0;
  }
  const tutores = await prisma.tutor.findMany({ where: { name: { startsWith: MARCA } }, select: { id: true } });
  const ids = tutores.map((t) => t.id);
  if (ids.length) {
    await prisma.$executeRawUnsafe(`DELETE FROM "Appointment" WHERE "tutorId" = ANY($1::text[])`, ids);
    await prisma.pacote.deleteMany({ where: { tutorId: { in: ids } } });
    await prisma.pet.deleteMany({ where: { tutorId: { in: ids } } });
    await prisma.tutor.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.portalAgendaServico.deleteMany({ where: { tipo: { in: [TIPO, TIPO_FISIO] } } });
  await prisma.listaItem.deleteMany({
    where: { lista: { in: ['atendimento_tipo', 'agenda_avulsa'] }, valor: { contains: String(ID) } },
  });
  await prisma.profissional.deleteMany({ where: { nomeCompleto: { startsWith: MARCA } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: `teste-hor-${ID}` } } });
  await prisma.portalAgendaConfig.deleteMany({ where: { id: 'unico' } });
}

async function limpar() {
  await limparDados();
  if (configOriginal) {
    await prisma.portalAgendaConfig.create({ data: configOriginal });
    configOriginal = null;
  }
}

async function marcar({ tutorId, petId, userId, avulsa, hora, dur = 30, status = 'Agendado', dia = DIA }) {
  const id = `t-hor-${ID}-${apts.length}`;
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Appointment" (id, "tutorId", "petId", "userId", date, duration, status, "agendaAvulsa", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, NOW())`,
    id, tutorId, petId, userId, localParaUtc(dia, hora), dur, status, avulsa || null,
  );
  apts.push(id);
  return id;
}

async function main() {
  configOriginal = await prisma.portalAgendaConfig.findUnique({ where: { id: 'unico' } });
  await limparDados();

  // ---------------------------------------------------------------- cenario
  const user = await prisma.user.create({
    data: { name: `${MARCA} Vet`, email: `teste-hor-${ID}@exemplo.com`, password: 'x', role: 'VETERINARIAN' },
  });
  const prof = await prisma.profissional.create({
    data: { nomeCompleto: `${MARCA} Dra. Teste`, nomeExibicao: 'Dra. Teste', ativo: true, userId: user.id, escala: ESCALA_MANHA },
  });
  const semLogin = await prisma.profissional.create({
    data: { nomeCompleto: `${MARCA} Sem Login`, ativo: true, escala: ESCALA_MANHA },
  });

  await prisma.listaItem.createMany({
    data: [
      { lista: 'atendimento_tipo', valor: JSON.stringify({ v: TIPO, l: 'Consulta teste' }), ordem: 900 },
      { lista: 'atendimento_tipo', valor: JSON.stringify({ v: TIPO_FISIO, l: 'Fisio teste' }), ordem: 901 },
      { lista: 'agenda_avulsa', valor: JSON.stringify({ id: MAP1, nome: `MAP 1 ${ID}`, grupo: `SalaMAP${ID}`, ativo: true, horario: ESCALA_MANHA }) },
      { lista: 'agenda_avulsa', valor: JSON.stringify({ id: MAP2, nome: `MAP 2 ${ID}`, grupo: `SalaMAP${ID}`, ativo: true, horario: ESCALA_MANHA }) },
    ],
  });

  const tutor = await prisma.tutor.create({ data: { name: `${MARCA} Cintia` } });
  const calmo = await prisma.pet.create({
    data: { tutorId: tutor.id, name: 'Mel', species: 'FELINE', status: 'ACTIVE' },
  });
  const bravo = await prisma.pet.create({
    data: { tutorId: tutor.id, name: 'Thor', species: 'CANINE', status: 'ACTIVE', temperament: 'Bravo' },
  });
  const outroTutor = await prisma.tutor.create({ data: { name: `${MARCA} Outro` } });
  const petOutro = await prisma.pet.create({
    data: { tutorId: outroTutor.id, name: 'Bidu', species: 'CANINE', status: 'ACTIVE' },
  });
  const petOutroBravo = await prisma.pet.create({
    data: { tutorId: outroTutor.id, name: 'Rex', species: 'CANINE', status: 'ACTIVE', temperament: 'Bravo' },
  });

  // temperamentos que travam (Configurações › Agenda)
  await prisma.listaItem.deleteMany({ where: { lista: 'agenda_config' } });
  await prisma.listaItem.create({
    data: { lista: 'agenda_config', valor: JSON.stringify({ temperamentosQueTravam: ['Bravo'] }) },
  });

  console.log('\n1) Enquanto a equipe nao liberar, ninguem marca');
  await regras.salvar({ config: { ativo: false } });
  let motivo = null;
  try {
    await motor.horariosDoDia(tutor.id, calmo.id, TIPO, DIA);
  } catch (e) {
    motivo = e.motivo;
  }
  checa('agendamento desligado bloqueia tudo', motivo === 'AGENDAMENTO_DESLIGADO', String(motivo));

  await regras.salvar({
    config: { ativo: true, antecedenciaMinHoras: 12, janelaDias: 30, maxPorDia: 2, prazoCancelarHoras: 24 },
    servicos: [
      { tipo: TIPO, ativo: true, duracaoMin: 30, agendas: [prof.id], restricao: 'TODOS' },
      { tipo: TIPO_FISIO, ativo: true, duracaoMin: 60, agendas: [MAP1, MAP2], restricao: 'TODOS' },
    ],
  });

  motivo = null;
  try {
    await motor.horariosDoDia(tutor.id, calmo.id, 'TIPO_DESLIGADO', DIA);
  } catch (e) {
    motivo = e.motivo;
  }
  checa('servico nao liberado tambem bloqueia', motivo === 'SERVICO_NAO_LIBERADO');

  console.log('\n2) So oferece dentro da escala');
  const d1 = await motor.horariosDoDia(tutor.id, calmo.id, TIPO, DIA);
  checa('gera os 8 horarios de 08:00 as 11:30', d1.horarios.length === 8, String(d1.horarios.length));
  checa('comeca as 08:00', d1.horarios[0].hora === '08:00', d1.horarios[0].hora);
  checa('ultimo cabe inteiro antes de fechar (11:30)', d1.horarios[7].hora === '11:30', d1.horarios[7].hora);
  checa('nao oferece 12:00 (fecharia depois)', !d1.horarios.some((h) => h.hora === '12:00'));
  checa('08:00 da clinica = 11:00 UTC', d1.horarios[0].inicioUtc.getUTCHours() === 11, String(d1.horarios[0].inicioUtc.getUTCHours()));

  console.log('\n3) O que ja esta marcado some da lista');
  await marcar({ tutorId: outroTutor.id, petId: petOutro.id, userId: user.id, hora: 9 * 60 });
  const d2 = await motor.horariosDoDia(tutor.id, calmo.id, TIPO, DIA);
  checa('09:00 sumiu', !d2.horarios.some((h) => h.hora === '09:00'));
  checa('os vizinhos continuam livres', d2.horarios.some((h) => h.hora === '08:30') && d2.horarios.some((h) => h.hora === '09:30'));

  const cancelado = await marcar({ tutorId: outroTutor.id, petId: petOutro.id, userId: user.id, hora: 10 * 60, status: 'Cancelado' });
  const d3 = await motor.horariosDoDia(tutor.id, calmo.id, TIPO, DIA);
  checa('cancelado LIBERA o horario', d3.horarios.some((h) => h.hora === '10:00'));

  await marcar({ tutorId: outroTutor.id, petId: petOutro.id, userId: user.id, hora: 10 * 60 + 45, dur: 60 });
  const d4 = await motor.horariosDoDia(tutor.id, calmo.id, TIPO, DIA);
  checa('atendimento longo derruba os horarios que ele encosta', !d4.horarios.some((h) => h.hora === '10:30') && !d4.horarios.some((h) => h.hora === '11:00'));

  console.log('\n4) Pet bravo ocupa a SALA inteira');
  const fisioLivre = await motor.horariosDoDia(tutor.id, calmo.id, TIPO_FISIO, DIA);
  checa('fisio tem 4 horarios de 1h na manha', fisioLivre.horarios.length === 4, String(fisioLivre.horarios.length));

  await marcar({ tutorId: outroTutor.id, petId: petOutroBravo.id, avulsa: MAP1, userId: user.id, hora: 9 * 60, dur: 60 });
  const fisioComBravo = await motor.horariosDoDia(tutor.id, calmo.id, TIPO_FISIO, DIA);
  checa(
    'pet bravo na MAP 1 bloqueia a MAP 2 no mesmo horario',
    !fisioComBravo.horarios.some((h) => h.hora === '09:00'),
    JSON.stringify(fisioComBravo.horarios.map((h) => h.hora)),
  );
  checa('e so aquele horario', fisioComBravo.horarios.length === 3);

  // agora o contrario: pet CALMO numa MAP nao bloqueia a outra
  await prisma.$executeRawUnsafe(`DELETE FROM "Appointment" WHERE id = $1`, apts[apts.length - 1]);
  apts.pop();
  await marcar({ tutorId: outroTutor.id, petId: petOutro.id, avulsa: MAP1, userId: user.id, hora: 9 * 60, dur: 60 });
  const fisioComCalmo = await motor.horariosDoDia(tutor.id, calmo.id, TIPO_FISIO, DIA);
  checa('pet calmo na MAP 1 NAO bloqueia a MAP 2', fisioComCalmo.horarios.some((h) => h.hora === '09:00'));

  // e o MEU pet bravo: so entra se o grupo inteiro estiver vazio
  const fisioParaBravo = await motor.horariosDoDia(tutor.id, bravo.id, TIPO_FISIO, DIA);
  checa(
    'meu pet bravo nao pega horario com a outra MAP ocupada',
    !fisioParaBravo.horarios.some((h) => h.hora === '09:00'),
    JSON.stringify(fisioParaBravo.horarios.map((h) => h.hora)),
  );
  checa('mas pega os horarios com o grupo vazio', fisioParaBravo.horarios.length === 3);

  console.log('\n5) Antecedencia e janela');
  const hoje = ymdLocal(new Date());
  const dHoje = await motor.horariosDoDia(tutor.id, calmo.id, TIPO, hoje).catch(() => ({ horarios: [] }));
  checa('nao oferece horario de hoje (antecedencia de 12h)', dHoje.horarios.length === 0);

  const longe = ymdLocal(new Date(Date.now() + 40 * 24 * 60 * 60_000));
  const dLonge = await motor.horariosDoDia(tutor.id, calmo.id, TIPO, longe);
  checa('nao oferece alem da janela de 30 dias', dLonge.horarios.length === 0);

  console.log('\n6) Escala manda');
  await prisma.profissional.update({ where: { id: prof.id }, data: { escala: null } });
  const semEscala = await motor.horariosDoDia(tutor.id, calmo.id, TIPO, DIA);
  checa('sem escala cadastrada, nao oferece nada', semEscala.horarios.length === 0);

  await prisma.profissional.update({
    where: { id: prof.id },
    data: { escala: { ...ESCALA_MANHA, bloqueios: [{ inicio: DIA, fim: DIA }] } },
  });
  const bloqueado = await motor.horariosDoDia(tutor.id, calmo.id, TIPO, DIA);
  checa('ferias/bloqueio zera o dia', bloqueado.horarios.length === 0);
  await prisma.profissional.update({ where: { id: prof.id }, data: { escala: ESCALA_MANHA } });

  console.log('\n7) Profissional sem login vinculado');
  await regras.salvar({ servicos: [{ tipo: TIPO, ativo: true, duracaoMin: 30, agendas: [semLogin.id] }] });
  const semUser = await motor.horariosDoDia(tutor.id, calmo.id, TIPO, DIA);
  checa('nao oferece agenda que nao da para conferir', semUser.horarios.length === 0);
  await regras.salvar({ servicos: [{ tipo: TIPO, ativo: true, duracaoMin: 30, agendas: [prof.id] }] });

  console.log('\n8) Restricoes e teto do dia');
  await regras.salvar({ servicos: [{ tipo: TIPO, ativo: true, duracaoMin: 30, agendas: [prof.id], restricao: 'TEM_PACOTE' }] });
  motivo = null;
  try {
    await motor.horariosDoDia(tutor.id, calmo.id, TIPO, DIA);
  } catch (e) {
    motivo = e.motivo;
  }
  checa('sem pacote, o servico nao aparece', motivo === 'PRECISA_TER_PACOTE', String(motivo));

  await prisma.pacote.create({
    data: { petId: calmo.id, tutorId: tutor.id, servico: 'Fisioterapia', totalSessoes: 10, sessoesUsadas: 2, status: 'ATIVO' },
  });
  const comPacote = await motor.horariosDoDia(tutor.id, calmo.id, TIPO, DIA);
  checa('com pacote ativo, volta a aparecer', comPacote.horarios.length > 0);
  await regras.salvar({ servicos: [{ tipo: TIPO, ativo: true, duracaoMin: 30, agendas: [prof.id], restricao: 'TODOS' }] });

  await marcar({ tutorId: tutor.id, petId: calmo.id, userId: user.id, hora: 8 * 60 });
  await marcar({ tutorId: tutor.id, petId: calmo.id, userId: user.id, hora: 8 * 60 + 30 });
  motivo = null;
  try {
    await motor.horariosDoDia(tutor.id, calmo.id, TIPO, DIA);
  } catch (e) {
    motivo = e.motivo;
  }
  checa('estourou o teto do dia, para de oferecer', motivo === 'LIMITE_DO_DIA', String(motivo));

  console.log('\n9) Proximos dias');
  const proximos = await motor.proximosDias(outroTutor.id, petOutro.id, TIPO, 10);
  checa('varre os proximos dias e traz so os que tem vaga', proximos.every((d) => d.horarios.length > 0));
  checa('nao repete o mesmo horario duas vezes no dia', proximos.every((d) => new Set(d.horarios.map((h) => h.hora)).size === d.horarios.length));
}

main().catch(erroFatal).finally(() => fim(limpar));
