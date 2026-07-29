/**
 * Teste do cadastro de pet novo pelo tutor (Fatia 4B.3).
 * O que mais importa aqui: não deixar o histórico clínico rachar em dois pets.
 */
const { prisma, checa, fim, erroFatal } = require('./_ambiente');
const { PortalPetsService, ETIQUETA_PORTAL } = require('../../dist/modules/portal/portal-pets.service');
const { PortalEscopoService } = require('../../dist/modules/portal/portal-escopo.service');

const pets = new PortalPetsService(prisma);
const escopo = new PortalEscopoService(prisma);

const MARCA = '[TESTE-PETNOVO]';

async function limpar() {
  const tutores = await prisma.tutor.findMany({ where: { name: { startsWith: MARCA } }, select: { id: true } });
  const ids = tutores.map((t) => t.id);
  if (!ids.length) return;
  await prisma.portalAlteracao.deleteMany({ where: { tutorId: { in: ids } } });
  await prisma.pet.deleteMany({ where: { tutorId: { in: ids } } });
  await prisma.tutor.deleteMany({ where: { id: { in: ids } } });
}

async function main() {
  await limpar();

  const tutor = await prisma.tutor.create({ data: { name: `${MARCA} Cintia` } });

  console.log('\n1) Cadastro simples');
  const r1 = await pets.criar(
    tutor.id,
    { nome: 'Mel', especie: 'FELINE', raca: 'SRD', nascimento: '2023-05-10', sexo: 'FEMALE', alergias: 'Frango, poeira' },
    '127.0.0.1',
  );
  checa('criou o pet', r1.criado === true && !!r1.pet?.id);
  const mel = await prisma.pet.findUnique({ where: { id: r1.pet.id } });
  checa('no cadastro do tutor certo', mel.tutorId === tutor.id);
  checa('com a especie escolhida', mel.species === 'FELINE');
  checa('com a raca', mel.breed === 'SRD');
  checa('com o nascimento', mel.birthDate.toISOString().slice(0, 10) === '2023-05-10');
  checa('com o sexo', mel.gender === 'FEMALE');
  checa('alergias viraram lista', mel.allergies.length === 2 && mel.allergies[0] === 'Frango');
  checa('⭐ com o selo de que veio do portal', mel.tags.includes(ETIQUETA_PORTAL), JSON.stringify(mel.tags));
  checa('nasce ativo', mel.status === 'ACTIVE');

  const hist = await prisma.portalAlteracao.findFirst({
    where: { tutorId: tutor.id, entidadeId: mel.id },
  });
  checa('ficou no historico quem criou', !!hist && hist.campo === 'Cadastro do pet');
  checa('com o que foi criado', hist.valorNovo.includes('Mel'));
  checa('e de onde veio', hist.ip === '127.0.0.1');

  const meus = await escopo.petsDoTutor(tutor.id);
  checa('o pet novo ja aparece no portal', meus.some((p) => p.id === mel.id));

  console.log('\n2) Anti-duplicidade (o ponto que importa)');
  const r2 = await pets.criar(tutor.id, { nome: 'Mel', especie: 'FELINE' });
  checa('nome igual PARA e pergunta', r2.criado === false && r2.precisaConfirmar === true);
  checa('mostra o pet que ja existe', r2.parecidos.length === 1 && r2.parecidos[0].nome === 'Mel');

  const r3 = await pets.criar(tutor.id, { nome: '  mél ', especie: 'FELINE' });
  checa('nao se engana com acento e maiuscula', r3.precisaConfirmar === true);

  const r4 = await pets.criar(tutor.id, { nome: 'Melzinha', especie: 'FELINE' });
  checa('nome parecido tambem pergunta', r4.precisaConfirmar === true);

  const r5 = await pets.criar(tutor.id, { nome: 'Thor', especie: 'CANINE' });
  checa('nome diferente entra direto', r5.criado === true);

  const r6 = await pets.criar(tutor.id, { nome: 'Mel', especie: 'CANINE', confirmado: true });
  checa('confirmando que e outro, cria mesmo assim', r6.criado === true);
  const quantasMel = await prisma.pet.count({ where: { tutorId: tutor.id, name: 'Mel' } });
  checa('agora sim existem 2 "Mel" (porque ele confirmou)', quantasMel === 2, String(quantasMel));

  console.log('\n3) Travas');
  let semNome = false;
  try {
    await pets.criar(tutor.id, { nome: 'a', especie: 'CANINE' });
  } catch {
    semNome = true;
  }
  checa('nome de 1 letra e recusado', semNome);

  let semEspecie = false;
  try {
    await pets.criar(tutor.id, { nome: 'Bidu', especie: 'DRAGAO' });
  } catch {
    semEspecie = true;
  }
  checa('especie inventada e recusada', semEspecie);

  const futuro = await pets.criar(tutor.id, { nome: 'Futuro', especie: 'CANINE', nascimento: '2099-01-01' });
  const petFuturo = await prisma.pet.findUnique({ where: { id: futuro.pet.id } });
  checa('nascimento no futuro e ignorado', petFuturo.birthDate === null);

  const semSexo = await pets.criar(tutor.id, { nome: 'Sem Sexo', especie: 'CANINE', sexo: '' });
  const petSemSexo = await prisma.pet.findUnique({ where: { id: semSexo.pet.id } });
  checa('sexo em branco fica vazio (nao inventa)', petSemSexo.gender === null);

  console.log('\n4) O pet de outro tutor nao entra na conversa');
  const outro = await prisma.tutor.create({ data: { name: `${MARCA} Outro` } });
  const r7 = await pets.criar(outro.id, { nome: 'Mel', especie: 'FELINE' });
  checa('nome igual ao pet de OUTRO tutor nao trava o cadastro', r7.criado === true);
}

main().catch(erroFatal).finally(() => fim(limpar));
