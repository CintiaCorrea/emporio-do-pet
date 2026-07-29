/**
 * Teste ponta-a-ponta da Fatia 2 (Inicio + Minha ficha), contra o banco LOCAL.
 * Foco: o tutor edita direto, o historico guarda tudo, e ninguem escreve fora
 * da propria ficha.
 */
const { prisma, checa, fim, erroFatal } = require('./_ambiente');
const { PortalEscopoService } = require('../../dist/modules/portal/portal-escopo.service');
const { PortalFichaService } = require('../../dist/modules/portal/portal-ficha.service');
const { PortalInicioService } = require('../../dist/modules/portal/portal-inicio.service');

const escopo = new PortalEscopoService(prisma);
const ficha = new PortalFichaService(prisma, escopo);
const inicio = new PortalInicioService(prisma, escopo);

const MARCA = '[TESTE-FICHA]';

async function limpar() {
  const tutores = await prisma.tutor.findMany({
    where: { name: { startsWith: MARCA } },
    select: { id: true },
  });
  const ids = tutores.map((t) => t.id);
  if (ids.length) {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "Appointment" WHERE "tutorId" = ANY($1::text[])`,
      ids,
    );
    await prisma.pet.deleteMany({ where: { tutorId: { in: ids } } });
    await prisma.contact.deleteMany({ where: { tutorId: { in: ids } } });
    await prisma.portalAlteracao.deleteMany({ where: { tutorId: { in: ids } } });
    await prisma.tutor.deleteMany({ where: { id: { in: ids } } });
  }
}

async function main() {
  await limpar();

  // --- cenario -------------------------------------------------------------
  const dono = await prisma.tutor.create({
    data: {
      name: `${MARCA} Cintia`,
      email: `teste-ficha-${Date.now()}@exemplo.com`,
      city: 'Fortaleza',
    },
  });
  await prisma.contact.create({
    data: { tutorId: dono.id, number: '5585970004444', isWhatsApp: true, isPrimary: true },
  });
  const thor = await prisma.pet.create({
    data: {
      tutorId: dono.id,
      name: 'Thor',
      species: 'CANINE',
      breed: 'Golden Retriever',
      status: 'ACTIVE',
      allergies: ['Frango', 'Poeira'],
      birthDate: new Date(Date.UTC(2020, 2, 14)),
    },
  });
  const mel = await prisma.pet.create({
    data: { tutorId: dono.id, name: 'Mel', species: 'FELINE', status: 'ACTIVE' },
  });

  const estranho = await prisma.tutor.create({ data: { name: `${MARCA} Estranho` } });
  const petAlheio = await prisma.pet.create({
    data: { tutorId: estranho.id, name: 'Bidu', species: 'CANINE', status: 'ACTIVE', breed: 'SRD' },
  });

  console.log('\n1) Abrir a ficha');
  const f = await ficha.ficha(dono.id);
  checa('mostra o tutor', f.tutor.nome === `${MARCA} Cintia`);
  checa('mostra o telefone (travado na tela)', f.tutor.telefone === '5585970004444');
  checa('mostra os 2 pets dele', f.pets.length === 2, String(f.pets.length));
  checa('nao mostra pet de outro tutor', !f.pets.some((p) => p.id === petAlheio.id));
  checa('data no formato do seletor', f.pets.find((p) => p.nome === 'Thor').nascimento === '2020-03-14');

  console.log('\n2) Salvar mudancas de verdade');
  const r1 = await ficha.salvar(
    dono.id,
    {
      tutor: { email: 'novo@exemplo.com', rua: 'Av. Washington Soares', numero: '1000', estado: 'ce' },
      pets: [{ id: thor.id, raca: 'Golden', alergias: ['Frango'] }],
    },
    '127.0.0.1',
  );
  const tutorDepois = await prisma.tutor.findUnique({ where: { id: dono.id } });
  const thorDepois = await prisma.pet.findUnique({ where: { id: thor.id } });
  checa('e-mail atualizado no cadastro', tutorDepois.email === 'novo@exemplo.com');
  checa('endereco atualizado', tutorDepois.address === 'Av. Washington Soares' && tutorDepois.addressNumber === '1000');
  checa('estado normalizado para maiusculo', tutorDepois.state === 'CE', tutorDepois.state);
  checa('raca do pet atualizada', thorDepois.breed === 'Golden');
  checa('alergia removida de fato', thorDepois.allergies.length === 1 && thorDepois.allergies[0] === 'Frango');
  // 4 do tutor (e-mail, rua, numero, estado) + 2 do pet (raca, alergias)
  checa('contou as alteracoes', r1.alteracoes === 6, String(r1.alteracoes));

  console.log('\n3) O historico (o pedido da Cintia)');
  const hist = await ficha.historico(dono.id);
  const alergia = hist.find((h) => h.campo === 'Alergias');
  checa('registrou a mudanca de alergias', !!alergia);
  checa('guardou o que EXISTIA antes', alergia && alergia.valorAnterior === 'Frango, Poeira', alergia && alergia.valorAnterior);
  checa('guardou o que ficou', alergia && alergia.valorNovo === 'Frango');
  checa('registrou o nome do pet', alergia && alergia.entidadeNome === 'Thor');
  const email = hist.find((h) => h.campo === 'E-mail');
  checa('registrou o e-mail antigo', email && email.valorAnterior && email.valorAnterior.includes('teste-ficha-'));
  checa('registrou de onde veio', email && email.ip === '127.0.0.1');

  console.log('\n4) Apagar tudo de um campo tambem fica no historico');
  await ficha.salvar(dono.id, { pets: [{ id: thor.id, alergias: '' }] });
  const thorSemAlergia = await prisma.pet.findUnique({ where: { id: thor.id } });
  const histApagou = await ficha.historico(dono.id);
  const apagou = histApagou.find((h) => h.campo === 'Alergias' && h.valorNovo === null);
  checa('alergias ficaram vazias', thorSemAlergia.allergies.length === 0);
  checa('o que foi APAGADO ficou registrado', apagou && apagou.valorAnterior === 'Frango', apagou && apagou.valorAnterior);

  console.log('\n5) Travas');
  const antesTrava = await prisma.tutor.findUnique({ where: { id: dono.id } });
  await ficha.salvar(dono.id, {
    tutor: { nome: '   ', status: 'INACTIVE', rankingAbc: 'C', observations: 'invadido', cpf: '00000000000' },
  });
  const depoisTrava = await prisma.tutor.findUnique({ where: { id: dono.id } });
  checa('nome vazio nao apaga o nome', depoisTrava.name === antesTrava.name);
  checa('campo fora da lista e ignorado (status)', depoisTrava.status === antesTrava.status);
  checa('campo fora da lista e ignorado (ranking)', depoisTrava.rankingAbc === antesTrava.rankingAbc);
  checa('campo fora da lista e ignorado (observacoes)', depoisTrava.observations === antesTrava.observations);
  checa('campo fora da lista e ignorado (CPF)', depoisTrava.cpf === antesTrava.cpf);

  let barrou = false;
  try {
    await ficha.salvar(dono.id, { pets: [{ id: petAlheio.id, raca: 'INVADIDO' }] });
  } catch {
    barrou = true;
  }
  const alheioDepois = await prisma.pet.findUnique({ where: { id: petAlheio.id } });
  checa('nao deixa editar pet de outro tutor', barrou);
  checa('o pet do outro continua intacto', alheioDepois.breed === 'SRD', alheioDepois.breed);

  let emailBarrado = false;
  try {
    await ficha.salvar(dono.id, { tutor: { email: 'isso-nao-e-email' } });
  } catch {
    emailBarrado = true;
  }
  const emailDepois = await prisma.tutor.findUnique({ where: { id: dono.id } });
  checa('e-mail invalido e recusado', emailBarrado);
  checa('e-mail antigo continua', emailDepois.email === 'novo@exemplo.com');

  await ficha.salvar(dono.id, { pets: [{ id: mel.id, nascimento: '01/01/2999' }] });
  const melDepois = await prisma.pet.findUnique({ where: { id: mel.id } });
  checa('nascimento no futuro e ignorado', melDepois.birthDate === null);

  console.log('\n6) Salvar sem mudar nada nao polui o historico');
  const antesQtd = (await ficha.historico(dono.id, 500)).length;
  const r2 = await ficha.salvar(dono.id, {
    tutor: { email: 'novo@exemplo.com' },
    pets: [{ id: thor.id, raca: 'Golden' }],
  });
  const depoisQtd = (await ficha.historico(dono.id, 500)).length;
  checa('nao registra alteracao que nao existiu', r2.alteracoes === 0 && antesQtd === depoisQtd);

  console.log('\n7) Alerta de internacao na home');
  const vet = await prisma.user.findFirst({ select: { id: true } });
  if (!vet) {
    console.log('  (pulado: nao ha usuario/veterinario no banco local para criar o atendimento)');
  } else {
    // O banco LOCAL e um espelho parcial (falta Appointment.numeroVenda), entao o
    // create do Prisma nao roda aqui. Inserimos por SQL so com as colunas que
    // existem — a LEITURA do servico usa select enxuto e nao encosta nessa coluna.
    const internacaoId = 'teste-int-' + Date.now();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Appointment" (id, "tutorId", "petId", "userId", date, status, notes, "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7, NOW())`,
      internacaoId,
      dono.id,
      thor.id,
      vet.id,
      new Date(Date.now() - 2 * 24 * 60 * 60_000),
      'IN_PROGRESS',
      JSON.stringify({ type: 'HOSPITALIZATION', dailyRate: 100, priority: 'HIGH' }),
    );
    const home1 = await inicio.home(dono.id);
    checa('mostra o alerta do pet internado', home1.internacoes.length === 1 && home1.internacoes[0].petNome === 'Thor', JSON.stringify(home1.internacoes));

    // Consulta comum NAO pode virar alerta de internacao.
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Appointment" (id, "tutorId", "petId", "userId", date, status, notes, "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7, NOW())`,
      'teste-consulta-' + Date.now(),
      dono.id,
      mel.id,
      vet.id,
      new Date(),
      'SCHEDULED',
      'Retorno de rotina, tudo bem com a Mel',
    );
    const home2 = await inicio.home(dono.id);
    checa('consulta comum nao vira alerta', home2.internacoes.length === 1);

    // Alta -> some o alerta.
    await prisma.$executeRawUnsafe(
      `UPDATE "Appointment" SET notes = $1 WHERE id = $2`,
      JSON.stringify({
        type: 'HOSPITALIZATION',
        dailyRate: 100,
        priority: 'HIGH',
        actualDischargeDate: new Date().toISOString(),
      }),
      internacaoId,
    );
    const home3 = await inicio.home(dono.id);
    checa('depois da alta o alerta some', home3.internacoes.length === 0, JSON.stringify(home3.internacoes));

    const homeEstranho = await inicio.home(estranho.id);
    checa('outro tutor nao ve a internacao alheia', homeEstranho.internacoes.length === 0);
  }
}

main().catch(erroFatal).finally(() => fim(typeof limpar === 'function' ? limpar : undefined));
