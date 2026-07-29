/**
 * Teste ponta-a-ponta da Fatia 3 (Saude, Peso, Fisioterapia) no banco LOCAL.
 */
const { prisma, checa, fim, erroFatal } = require('./_ambiente');
const { PortalEscopoService } = require('../../dist/modules/portal/portal-escopo.service');
const { PortalSaudeService } = require('../../dist/modules/portal/portal-saude.service');

const escopo = new PortalEscopoService(prisma);
const saude = new PortalSaudeService(prisma);

const MARCA = '[TESTE-SAUDE]';
const dias = (n) => new Date(Date.now() + n * 24 * 60 * 60_000);

async function limpar() {
  const tutores = await prisma.tutor.findMany({
    where: { name: { startsWith: MARCA } },
    select: { id: true },
  });
  const ids = tutores.map((t) => t.id);
  if (!ids.length) return;
  const pets = await prisma.pet.findMany({ where: { tutorId: { in: ids } }, select: { id: true } });
  const petIds = pets.map((p) => p.id);
  if (petIds.length) {
    await prisma.clinicalDocument.deleteMany({ where: { petId: { in: petIds } } });
    await prisma.historicoClinico.deleteMany({ where: { petId: { in: petIds } } });
    await prisma.protocoloDose.deleteMany({
      where: { protocolo: { petId: { in: petIds } } },
    });
    await prisma.protocoloAplicado.deleteMany({ where: { petId: { in: petIds } } });
    await prisma.pacoteSessao.deleteMany({ where: { pacote: { petId: { in: petIds } } } });
    await prisma.pacote.deleteMany({ where: { petId: { in: petIds } } });
  }
  await prisma.$executeRawUnsafe(`DELETE FROM "Appointment" WHERE "tutorId" = ANY($1::text[])`, ids);
  await prisma.pet.deleteMany({ where: { tutorId: { in: ids } } });
  await prisma.contact.deleteMany({ where: { tutorId: { in: ids } } });
  await prisma.tutor.deleteMany({ where: { id: { in: ids } } });
}

/** O banco local nao tem todas as colunas de Appointment — insere pelo SQL. */
async function criarAtendimento({ id, tutorId, petId, userId, data, peso }) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Appointment" (id, "tutorId", "petId", "userId", date, status, "petWeight", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7, NOW())`,
    id, tutorId, petId, userId, data, 'COMPLETED', peso ?? null,
  );
  return id;
}

async function main() {
  await limpar();

  const vet = await prisma.user.findFirst({ select: { id: true, name: true } });
  if (!vet) {
    console.log('Sem usuario no banco local — nao da para criar atendimento/documento.');
    return;
  }

  const tutor = await prisma.tutor.create({ data: { name: `${MARCA} Cintia` } });
  const thor = await prisma.pet.create({
    data: { tutorId: tutor.id, name: 'Thor', species: 'CANINE', status: 'ACTIVE' },
  });
  const estranho = await prisma.tutor.create({ data: { name: `${MARCA} Estranho` } });
  const petAlheio = await prisma.pet.create({
    data: { tutorId: estranho.id, name: 'Bidu', species: 'CANINE', status: 'ACTIVE' },
  });

  // ---------------------------------------------------------------- VACINAS
  const emDia = await prisma.protocoloAplicado.create({
    data: {
      petId: thor.id,
      tipo: 'VACINA',
      nomeProtocolo: 'V10 (múltipla)',
      dataInicial: dias(-400),
      status: 'EM_ANDAMENTO',
    },
  });
  await prisma.protocoloDose.createMany({
    data: [
      { protocoloId: emDia.id, numero: 1, dataPrevista: dias(-400), status: 'APLICADA', dataAplicada: dias(-400) },
      { protocoloId: emDia.id, numero: 2, dataPrevista: dias(30), status: 'PENDENTE' },
    ],
  });

  const vencida = await prisma.protocoloAplicado.create({
    data: {
      petId: thor.id,
      tipo: 'VACINA',
      nomeProtocolo: 'Giárdia',
      dataInicial: dias(-380),
      status: 'EM_ANDAMENTO',
    },
  });
  await prisma.protocoloDose.createMany({
    data: [
      { protocoloId: vencida.id, numero: 1, dataPrevista: dias(-380), status: 'APLICADA', dataAplicada: dias(-380) },
      { protocoloId: vencida.id, numero: 2, dataPrevista: dias(-8), status: 'PENDENTE' },
    ],
  });

  // Vermifugo NAO e vacina — nao pode aparecer na carteirinha.
  const verm = await prisma.protocoloAplicado.create({
    data: { petId: thor.id, tipo: 'VERMIFUGO', nomeProtocolo: 'Vermífugo', dataInicial: dias(-60) },
  });
  await prisma.protocoloDose.create({
    data: { protocoloId: verm.id, numero: 1, dataPrevista: dias(-60), status: 'APLICADA', dataAplicada: dias(-60) },
  });

  await prisma.historicoClinico.create({
    data: {
      petId: thor.id,
      tipo: 'VACINA',
      data: dias(-800),
      titulo: 'Antirrábica (importada)',
      codigoExterno: `t-vac-${Date.now()}`,
    },
  });

  console.log('\n1) Carteirinha de vacinas');
  const vacinas = await saude.vacinas(thor.id);
  checa('mostra as 3 (2 protocolos + 1 importada)', vacinas.length === 3, String(vacinas.length));
  checa('nao mistura vermifugo na carteirinha', !vacinas.some((v) => v.nome.includes('Vermífugo')));
  const giardia = vacinas.find((v) => v.nome === 'Giárdia');
  checa('reforco vencido aparece como atrasada', giardia && giardia.situacao === 'atrasada', giardia && giardia.situacao);
  const v10 = vacinas.find((v) => v.nome.startsWith('V10'));
  checa('reforco futuro fica em dia', v10 && v10.situacao === 'aplicada', v10 && v10.situacao);
  checa('mostra a data da ultima aplicacao', v10 && !!v10.aplicadaEm);
  checa('mostra a data do proximo reforco', v10 && !!v10.reforcoEm);
  checa('vacina importada aparece', vacinas.some((v) => v.nome.includes('importada')));

  // ------------------------------------------------------- RECEITAS/EXAMES
  const atendimento = await criarAtendimento({
    id: 'teste-at-' + Date.now(),
    tutorId: tutor.id,
    petId: thor.id,
    userId: vet.id,
    data: dias(-10),
    peso: 34.2,
  });
  await prisma.clinicalDocument.create({
    data: {
      appointmentId: atendimento,
      petId: thor.id,
      tutorId: tutor.id,
      userId: vet.id,
      type: 'PRESCRIPTION',
      title: 'Condroprotetor 1x/dia',
      content: 'texto da receita',
      signedBy: 'Dra. Vivian',
      pdfUrl: null,
    },
  });
  await prisma.historicoClinico.create({
    data: {
      petId: thor.id,
      tipo: 'EXAME',
      data: dias(-45),
      titulo: 'Hemograma completo',
      arquivoKey: 'anexos/hemograma.pdf',
      arquivoNome: 'hemograma.pdf',
      codigoExterno: `t-ex-${Date.now()}`,
    },
  });

  console.log('\n2) Receitas e exames');
  const receitas = await saude.receitas(thor.id);
  checa('receita do atendimento aparece', receitas.length === 1 && receitas[0].titulo.includes('Condroprotetor'));
  checa('diz quem assinou', receitas[0].detalhe === 'por Dra. Vivian', receitas[0].detalhe);
  checa('sem PDF gerado, nao promete arquivo', receitas[0].temArquivo === false);

  const exames = await saude.exames(thor.id);
  checa('exame importado aparece', exames.length === 1 && exames[0].titulo === 'Hemograma completo');
  checa('exame com arquivo e marcado', exames[0].temArquivo === true);

  // ---------------------------------------------------------------- PESO
  await criarAtendimento({
    id: 'teste-at2-' + Date.now(),
    tutorId: tutor.id, petId: thor.id, userId: vet.id, data: dias(-5), peso: 33.0,
  });
  // duas pesagens no MESMO dia: vale a ultima
  await criarAtendimento({
    id: 'teste-at3-' + Date.now(),
    tutorId: tutor.id, petId: thor.id, userId: vet.id, data: dias(-1), peso: 32.5,
  });
  await criarAtendimento({
    id: 'teste-at4-' + Date.now(),
    tutorId: tutor.id, petId: thor.id, userId: vet.id, data: dias(-1), peso: 32.1,
  });
  await prisma.historicoClinico.create({
    data: {
      petId: thor.id, tipo: 'PESO', data: dias(-120), valorNum: 35.0,
      codigoExterno: `t-peso-${Date.now()}`,
    },
  });

  console.log('\n3) Peso');
  const peso = await saude.peso(thor.id);
  checa('junta pesagens do atendimento e importadas', peso.pontos.length === 4, String(peso.pontos.length));
  checa('duas no mesmo dia viram uma', peso.pontos.filter((p) => p.kg === 32.5).length === 0);
  checa('em ordem, da mais antiga para a mais nova', peso.pontos[0].kg === 35 && peso.pontos[3].kg === 32.1);
  checa('peso atual e o ultimo', peso.atual === 32.1, String(peso.atual));
  checa('calcula a variacao do periodo', peso.variacao === -2.9, String(peso.variacao));

  const semPeso = await saude.peso(petAlheio.id);
  checa('pet sem pesagem devolve lista vazia', semPeso.pontos.length === 0 && semPeso.variacao === null);

  // ---------------------------------------------------------------- FISIO
  const pacote = await prisma.pacote.create({
    data: {
      petId: thor.id,
      tutorId: tutor.id,
      servico: 'Fisioterapia',
      descricao: 'Reabilitação ortopédica',
      totalSessoes: 10,
      sessoesUsadas: 6,
      validade: dias(20),
      status: 'ATIVO',
    },
  });
  await prisma.pacoteSessao.createMany({
    data: [
      { pacoteId: pacote.id, numero: 5, data: dias(-11), profissional: 'Dra. Vivian', observacao: '8 min esteira' },
      { pacoteId: pacote.id, numero: 6, data: dias(-4), profissional: 'Dra. Vivian', observacao: 'boa resposta à marcha' },
    ],
  });

  console.log('\n4) Fisioterapia');
  const pacotes = await saude.fisio(thor.id);
  checa('acha o pacote', pacotes.length === 1);
  checa('sessao 6 de 10', pacotes[0].sessaoAtual === 6 && pacotes[0].totalSessoes === 10);
  checa('calcula as restantes', pacotes[0].restantes === 4, String(pacotes[0].restantes));
  checa('traz a validade', !!pacotes[0].validade);
  checa('historico mais recente primeiro', pacotes[0].sessoes[0].numero === 6);
  checa('traz a observacao da sessao', pacotes[0].sessoes[0].observacao === 'boa resposta à marcha');
  checa('pet sem pacote devolve vazio', (await saude.fisio(petAlheio.id)).length === 0);

  console.log('\n5) O porteiro continua valendo nas telas novas');
  let barrou = false;
  try {
    await escopo.assertPetDoTutor(tutor.id, petAlheio.id);
  } catch {
    barrou = true;
  }
  checa('pet de outro tutor e barrado antes da consulta', barrou);
}

main().catch(erroFatal).finally(() => fim(typeof limpar === 'function' ? limpar : undefined));
