/**
 * Teste da Alimentação (Fatia 5): a equipe prescreve (módulo clínico `dietas`)
 * e o portal lê. Prescrição não se apaga — a antiga vira histórico.
 */
const { prisma, checa, fim, erroFatal } = require('./_ambiente');
const { DietasService } = require('../../dist/modules/dietas/dietas.service');
const { PortalSaudeService } = require('../../dist/modules/portal/portal-saude.service');

const dietas = new DietasService(prisma);
const portal = new PortalSaudeService(prisma);

const MARCA = '[TESTE-DIETA]';

async function limpar() {
  const tutores = await prisma.tutor.findMany({ where: { name: { startsWith: MARCA } }, select: { id: true } });
  const ids = tutores.map((t) => t.id);
  if (!ids.length) return;
  const pets = await prisma.pet.findMany({ where: { tutorId: { in: ids } }, select: { id: true } });
  await prisma.dieta.deleteMany({ where: { petId: { in: pets.map((p) => p.id) } } });
  await prisma.pet.deleteMany({ where: { tutorId: { in: ids } } });
  await prisma.tutor.deleteMany({ where: { id: { in: ids } } });
}

async function main() {
  await limpar();

  const tutor = await prisma.tutor.create({ data: { name: `${MARCA} Cintia` } });
  const thor = await prisma.pet.create({
    data: { tutorId: tutor.id, name: 'Thor', species: 'CANINE', status: 'ACTIVE' },
  });

  console.log('\n1) Antes de prescrever');
  const vazio = await portal.dieta(thor.id);
  checa('o portal diz que nao tem dieta', vazio.tem === false);

  console.log('\n2) A equipe prescreve');
  const d1 = await dietas.prescrever(thor.id, {
    itens: [
      { nome: 'Ração de controle de peso', detalhe: '160 g/dia · 2 refeições (manhã e noite)' },
      { nome: 'Ômega 3', detalhe: '1 cápsula/dia junto à refeição da noite' },
    ],
    variacoes: [
      '1 refeição por semana pode ser comida natural',
      'Petiscos liberados: cenoura e maçã sem semente, com moderação',
    ],
    evitar: ['petiscos industrializados, ossos cozidos e sobras temperadas'],
    observacao: 'Pesar a ração; olhômetro engana.',
    prescritorNome: 'Dra. Vivian',
  });
  checa('criou a dieta ativa', d1.ativa === true);
  checa('guardou o tutor junto', d1.tutorId === tutor.id);

  const p1 = await portal.dieta(thor.id);
  checa('o portal ja mostra', p1.tem === true);
  checa('com os 2 itens', p1.itens.length === 2);
  checa('com nome e detalhe', p1.itens[0].nome.startsWith('Ração') && !!p1.itens[0].detalhe);
  checa('com as 2 variacoes (verde)', p1.variacoes.length === 2);
  checa('com o que evitar (vermelho)', p1.evitar.length === 1 && p1.evitar[0].includes('ossos'));
  checa('com a observacao', p1.observacao.includes('olhômetro'));
  checa('dizendo quem prescreveu', p1.prescritorNome === 'Dra. Vivian');
  checa('sem prometer anexo que nao existe', p1.temAnexo === false);

  console.log('\n3) Prescricao nova nao apaga a antiga');
  const d2 = await dietas.prescrever(thor.id, {
    itens: [{ nome: 'Ração hipoalergênica', detalhe: '140 g/dia' }],
    evitar: ['frango'],
    prescritorNome: 'Dra. Vivian',
  });
  const antiga = await prisma.dieta.findUnique({ where: { id: d1.id } });
  checa('a antiga continua existindo', !!antiga);
  checa('mas encerrada', antiga.ativa === false);
  checa('a nova esta ativa', d2.ativa === true);

  const p2 = await portal.dieta(thor.id);
  checa('o portal mostra so a NOVA', p2.itens.length === 1 && p2.itens[0].nome.includes('hipoalergênica'));

  const naFicha = await dietas.doPet(thor.id);
  checa('a ficha da equipe mostra a ativa', naFicha.ativa.id === d2.id);
  checa('e o historico da anterior', naFicha.historico.length === 1 && naFicha.historico[0].id === d1.id);

  console.log('\n4) Ajustar e encerrar');
  await dietas.ajustar(d2.id, { itens: [{ nome: 'Ração hipoalergênica', detalhe: '120 g/dia' }] });
  const p3 = await portal.dieta(thor.id);
  checa('ajuste de gramagem aparece no portal', p3.itens[0].detalhe === '120 g/dia');

  let recusou = false;
  try {
    await dietas.ajustar(d1.id, { itens: [{ nome: 'x' }] });
  } catch {
    recusou = true;
  }
  checa('nao deixa mexer em dieta ja encerrada', recusou);

  await dietas.encerrar(d2.id);
  const p4 = await portal.dieta(thor.id);
  checa('encerrando tudo, o portal volta ao estado vazio', p4.tem === false);

  console.log('\n5) Travas');
  let semItens = false;
  try {
    await dietas.prescrever(thor.id, { itens: [], evitar: ['frango'] });
  } catch {
    semItens = true;
  }
  checa('dieta sem nenhum item e recusada', semItens);

  const soTexto = await dietas.prescrever(thor.id, {
    itens: ['Ração seca'],
    variacoes: 'uma linha\noutra linha',
  });
  const p5 = await portal.dieta(thor.id);
  checa('aceita item escrito como texto simples', p5.itens[0].nome === 'Ração seca');
  checa('e variacoes em linhas separadas viram lista', p5.variacoes.length === 2);

  let petInexistente = false;
  try {
    await dietas.prescrever('pet-que-nao-existe', { itens: [{ nome: 'x' }] });
  } catch {
    petInexistente = true;
  }
  checa('pet inexistente e recusado', petInexistente);
}

main().catch(erroFatal).finally(() => fim(limpar));
