/**
 * Cenário de DEMONSTRAÇÃO do Portal do Tutor — só para o banco LOCAL.
 *
 * Cria (ou completa) um tutor com tudo que o portal mostra, para dar para
 * navegar de verdade: dois pets, vacinas em dia e vencida, histórico de peso,
 * pacote de fisioterapia, dieta prescrita, uma internação com boletins e a
 * agenda liberada para marcar horário.
 *
 * Uso:
 *   node scripts/portal/demo.js          → cria/atualiza o cenário
 *   node scripts/portal/demo.js limpar   → apaga tudo que ele criou
 *
 * ⚠️ Recusa rodar se o banco não for local. Isto NUNCA deve tocar produção.
 */
const { prisma } = require('./_ambiente');
const {
  localParaUtc,
  ymdLocal,
} = require('../../dist/modules/portal/portal-agenda-horarios.service');

const TELEFONE = '5585999990000';
const NOME_TUTOR = 'Cintia (demo)';
const MARCA = '[DEMO-PORTAL]';
const dias = (n) => new Date(Date.now() + n * 24 * 60 * 60_000);

function exigirBancoLocal() {
  const url = process.env.DATABASE_URL || '';
  if (!/(localhost|127\.0\.0\.1)/.test(url)) {
    console.error('\n⛔ Este script só roda no banco LOCAL. DATABASE_URL não parece local.\n');
    process.exit(1);
  }
}

async function limpar() {
  const tutor = await prisma.tutor.findFirst({
    where: { contacts: { some: { number: TELEFONE } } },
    select: { id: true },
  });
  if (!tutor) return console.log('Nada para limpar.');

  const pets = await prisma.pet.findMany({ where: { tutorId: tutor.id }, select: { id: true } });
  const petIds = pets.map((p) => p.id);

  const appts = await prisma.$queryRawUnsafe(
    `SELECT id FROM "Appointment" WHERE "tutorId" = $1`,
    tutor.id,
  );
  for (const a of appts) {
    await prisma.listaItem.deleteMany({ where: { lista: `intboletim_hist_${a.id}` } });
    await prisma.boxOcupacao.deleteMany({ where: { appointmentId: a.id } });
  }

  await prisma.dieta.deleteMany({ where: { petId: { in: petIds } } });
  await prisma.pacoteSessao.deleteMany({ where: { pacote: { petId: { in: petIds } } } });
  await prisma.pacote.deleteMany({ where: { petId: { in: petIds } } });
  await prisma.protocoloDose.deleteMany({ where: { protocolo: { petId: { in: petIds } } } });
  await prisma.protocoloAplicado.deleteMany({ where: { petId: { in: petIds } } });
  await prisma.$executeRawUnsafe(`DELETE FROM "Appointment" WHERE "tutorId" = $1`, tutor.id);
  await prisma.portalAgendamento.deleteMany({ where: { tutorId: tutor.id } });
  await prisma.portalSessao.deleteMany({ where: { tutorId: tutor.id } });
  await prisma.pet.deleteMany({ where: { tutorId: tutor.id } });
  await prisma.contact.deleteMany({ where: { tutorId: tutor.id } });
  await prisma.tutor.delete({ where: { id: tutor.id } });
  await prisma.box.deleteMany({ where: { codigo: 'DEMO-4' } });
  await prisma.profissional.deleteMany({ where: { nomeCompleto: { startsWith: MARCA } } });
  await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE email = 'demo-portal@exemplo.com'`);
  console.log('Cenário de demonstração removido.');
}

async function criar() {
  // ---------------------------------------------------------------- tutor
  let tutor = await prisma.tutor.findFirst({
    where: { contacts: { some: { number: TELEFONE } } },
  });
  if (!tutor) {
    tutor = await prisma.tutor.create({
      data: { name: NOME_TUTOR, email: 'demo-portal-tutor@exemplo.com', city: 'Fortaleza' },
    });
    await prisma.contact.create({
      data: { tutorId: tutor.id, number: TELEFONE, isWhatsApp: true, isPrimary: true },
    });
  } else {
    await prisma.tutor.update({ where: { id: tutor.id }, data: { name: NOME_TUTOR } });
  }

  // ---------------------------------------------------------------- pets
  const acharOuCriar = async (nome, dados) => {
    const existe = await prisma.pet.findFirst({ where: { tutorId: tutor.id, name: nome } });
    if (existe) return prisma.pet.update({ where: { id: existe.id }, data: dados });
    return prisma.pet.create({ data: { tutorId: tutor.id, name: nome, ...dados } });
  };

  const thor = await acharOuCriar('Thor', {
    species: 'CANINE',
    breed: 'Golden Retriever',
    status: 'ACTIVE',
    birthDate: new Date(Date.UTC(2020, 2, 14)),
    gender: 'MALE',
    allergies: ['Frango'],
  });
  // Pet antigo que tenha sobrado no cadastro deste tutor sai de cena: sem dados,
  // ele abriria o portal numa tela vazia e daria impressao errada.
  await prisma.pet.updateMany({
    where: { tutorId: tutor.id, name: { notIn: ['Thor', 'Mel'] } },
    data: { status: 'INACTIVE' },
  });

  const mel = await acharOuCriar('Mel', {
    species: 'FELINE',
    breed: 'SRD',
    status: 'ACTIVE',
    birthDate: new Date(Date.UTC(2023, 7, 2)),
    gender: 'FEMALE',
    allergies: [],
  });

  // profissional com login e escala (o agendamento precisa disso)
  let user = await prisma.user.findFirst({ where: { email: 'demo-portal@exemplo.com' } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Dra. Vivian (demo)',
        email: 'demo-portal@exemplo.com',
        password: 'nao-usar',
        role: 'VETERINARIAN',
      },
    });
  }
  const escala = {
    semana: { 1: [['08:00', '12:00'], ['14:00', '18:00']], 2: [['08:00', '12:00']], 3: [['08:00', '12:00'], ['14:00', '18:00']], 4: [['08:00', '12:00']], 5: [['08:00', '12:00'], ['14:00', '17:00']] },
  };
  let prof = await prisma.profissional.findFirst({ where: { nomeCompleto: `${MARCA} Dra. Vivian` } });
  if (!prof) {
    prof = await prisma.profissional.create({
      data: {
        nomeCompleto: `${MARCA} Dra. Vivian`,
        nomeExibicao: 'Dra. Vivian',
        ativo: true,
        userId: user.id,
        escala,
      },
    });
  } else {
    prof = await prisma.profissional.update({ where: { id: prof.id }, data: { escala, userId: user.id } });
  }

  // ---------------------------------------------------------------- vacinas
  await prisma.protocoloDose.deleteMany({ where: { protocolo: { petId: thor.id } } });
  await prisma.protocoloAplicado.deleteMany({ where: { petId: thor.id } });

  const v10 = await prisma.protocoloAplicado.create({
    data: { petId: thor.id, tutorId: tutor.id, tipo: 'VACINA', nomeProtocolo: 'V10 (múltipla)', dataInicial: dias(-330) },
  });
  await prisma.protocoloDose.createMany({
    data: [
      { protocoloId: v10.id, numero: 1, dataPrevista: dias(-330), status: 'APLICADA', dataAplicada: dias(-330) },
      { protocoloId: v10.id, numero: 2, dataPrevista: dias(35), status: 'PENDENTE' },
    ],
  });
  const giardia = await prisma.protocoloAplicado.create({
    data: { petId: thor.id, tutorId: tutor.id, tipo: 'VACINA', nomeProtocolo: 'Giárdia', dataInicial: dias(-400) },
  });
  await prisma.protocoloDose.createMany({
    data: [
      { protocoloId: giardia.id, numero: 1, dataPrevista: dias(-400), status: 'APLICADA', dataAplicada: dias(-400) },
      { protocoloId: giardia.id, numero: 2, dataPrevista: dias(-8), status: 'PENDENTE' },
    ],
  });

  // ---------------------------------------------------------------- peso
  await prisma.$executeRawUnsafe(`DELETE FROM "Appointment" WHERE "tutorId" = $1`, tutor.id);
  const pesagens = [
    [-120, 34.2],
    [-90, 33.6],
    [-60, 33.0],
    [-30, 32.4],
    [-7, 32.1],
  ];
  for (const [quando, kg] of pesagens) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Appointment" (id, "tutorId", "petId", "userId", date, duration, status, "petWeight", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, NOW())`,
      `demo-peso-${quando}`, tutor.id, thor.id, user.id, dias(quando), 30, 'Realizado', kg,
    );
  }

  // ---------------------------------------------------------------- fisio
  await prisma.pacoteSessao.deleteMany({ where: { pacote: { petId: thor.id } } });
  await prisma.pacote.deleteMany({ where: { petId: thor.id } });
  const pacote = await prisma.pacote.create({
    data: {
      petId: thor.id,
      tutorId: tutor.id,
      servico: 'Fisioterapia',
      descricao: 'Reabilitação ortopédica',
      totalSessoes: 10,
      sessoesUsadas: 6,
      validade: dias(22),
      status: 'ATIVO',
    },
  });
  await prisma.pacoteSessao.createMany({
    data: [
      { pacoteId: pacote.id, numero: 5, data: dias(-11), profissional: 'Dra. Vivian', observacao: '8 min de esteira' },
      { pacoteId: pacote.id, numero: 6, data: dias(-4), profissional: 'Dra. Vivian', observacao: 'boa resposta à marcha' },
    ],
  });

  // ---------------------------------------------------------------- dieta
  await prisma.dieta.deleteMany({ where: { petId: thor.id } });
  await prisma.dieta.create({
    data: {
      petId: thor.id,
      tutorId: tutor.id,
      prescritorNome: 'Dra. Vivian',
      ativa: true,
      itens: [
        { nome: 'Ração de controle de peso', detalhe: '160 g/dia · 2 refeições (manhã e noite)' },
        { nome: 'Ômega 3', detalhe: '1 cápsula/dia na refeição da noite' },
      ],
      variacoes: [
        '1 refeição por semana pode ser comida natural',
        'Petiscos liberados: cenoura e maçã sem semente, com moderação',
      ],
      evitar: ['petiscos industrializados, ossos cozidos e sobras temperadas'],
      observacao: 'Pesar a ração; olhômetro engana.',
    },
  });

  // ------------------------------------------------------ internação da Mel
  const internacaoId = 'demo-internacao';
  await prisma.listaItem.deleteMany({ where: { lista: `intboletim_hist_${internacaoId}` } });
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Appointment" (id, "tutorId", "petId", "userId", date, duration, status, notes, "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, NOW())`,
    internacaoId, tutor.id, mel.id, user.id, dias(-2), 30, 'IN_PROGRESS',
    JSON.stringify({ type: 'HOSPITALIZATION', dailyRate: 180, priority: 'HIGH', estimatedDischargeDate: dias(1).toISOString() }),
  );
  let box = await prisma.box.findFirst({ where: { codigo: 'DEMO-4' } });
  if (!box) box = await prisma.box.create({ data: { codigo: 'DEMO-4', nome: '4', tipo: 'FELINO', ativa: true } });
  await prisma.boxOcupacao.deleteMany({ where: { appointmentId: internacaoId } });
  await prisma.boxOcupacao.create({ data: { boxId: box.id, appointmentId: internacaoId, ativa: true } });
  await prisma.listaItem.createMany({
    data: [
      {
        lista: `intboletim_hist_${internacaoId}`,
        valor: JSON.stringify({ at: dias(-2).toISOString(), horario: 'noite', texto: 'Mel deu entrada tranquila, exames coletados. Ficou monitorada durante a noite.', por: 'Dra. Vivian' }),
      },
      {
        lista: `intboletim_hist_${internacaoId}`,
        valor: JSON.stringify({ at: dias(-1).toISOString(), horario: 'manha', texto: 'Aceitou bem a alimentação pela manhã. Hidratação mantida, sem vômitos.', auto: true }),
      },
      {
        lista: `intboletim_hist_${internacaoId}`,
        valor: JSON.stringify({ at: new Date().toISOString(), horario: 'manha', texto: 'Mel passou bem a noite, animada e comendo sozinha. Se seguir assim, alta amanhã. 💚', por: 'Dra. Vivian' }),
      },
    ],
  });

  // ------------------------------------------------- agenda liberada
  const tipos = [
    { v: 'CONSULTA', l: 'Consulta' },
    { v: 'RETORNO', l: 'Retorno' },
    { v: 'SESSAO_FISIO', l: 'Fisioterapia' },
    { v: 'MEDICINA_INTEGRATIVA', l: 'Consulta integrativa' },
  ];
  for (const t of tipos) {
    const valor = JSON.stringify(t);
    const existe = await prisma.listaItem.findFirst({ where: { lista: 'atendimento_tipo', valor } });
    if (!existe) await prisma.listaItem.create({ data: { lista: 'atendimento_tipo', valor } });
  }

  const { PortalAgendaRegrasService } = require('../../dist/modules/portal/portal-agenda-regras.service');
  const regras = new PortalAgendaRegrasService(prisma);
  await regras.salvar(
    {
      config: {
        ativo: true,
        antecedenciaMinHoras: 12,
        janelaDias: 30,
        prazoCancelarHoras: 24,
        maxPorDia: 2,
        desmarcacoesParaTaxa: 2,
        taxaCentavos: 5000,
      },
      servicos: [
        { tipo: 'CONSULTA', ativo: true, duracaoMin: 30, agendas: [prof.id], restricao: 'TODOS' },
        { tipo: 'RETORNO', ativo: true, duracaoMin: 20, agendas: [prof.id], restricao: 'JA_CLIENTE' },
        { tipo: 'MEDICINA_INTEGRATIVA', ativo: true, duracaoMin: 60, agendas: [prof.id], restricao: 'TODOS' },
        { tipo: 'SESSAO_FISIO', ativo: true, duracaoMin: 60, agendas: [prof.id], restricao: 'TEM_PACOTE' },
      ],
    },
    'demonstração',
  );

  console.log(`
╭──────────────────────────────────────────────────────────────╮
│  Cenário de demonstração pronto                              │
╰──────────────────────────────────────────────────────────────╯

  Tutor .......... ${NOME_TUTOR}
  Telefone ....... (85) 99999-0000   ← use este no login
  Pets ........... Thor (cão) e Mel (gata)

  Saúde .......... V10 em dia + Giárdia VENCIDA (aparece em vermelho)
  Peso ........... 5 pesagens, de 34,2 kg para 32,1 kg
  Fisioterapia ... pacote 6 de 10, com 2 sessões no histórico
  Alimentação .... dieta completa (o que come, pode variar, evitar)
  Internação ..... a Mel está internada, com 3 boletins
  Agendar ........ Consulta, Retorno, Fisio e Integrativa liberados
                   (Dra. Vivian, seg a sex)

  Para apagar tudo:  node scripts/portal/demo.js limpar
`);
}

exigirBancoLocal();
(process.argv[2] === 'limpar' ? limpar() : criar())
  .catch((e) => {
    console.error('Erro:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
