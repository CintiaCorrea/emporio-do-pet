/**
 * Teste ponta-a-ponta do acesso do Portal do Tutor, contra o banco LOCAL.
 * Nao envia WhatsApp: o envio e trocado por um espiao que guarda o codigo.
 *
 * Roda em cima do backend ja compilado (dist/).
 */
const { prisma, checa, fim, erroFatal } = require('./_ambiente');
const { PortalAuthService } = require('../../dist/modules/portal/portal-auth.service');
const { PortalEscopoService } = require('../../dist/modules/portal/portal-escopo.service');

// --- dublês -----------------------------------------------------------------
const espiao = { ultimoCodigo: null, enviados: 0 };
const whatsappFalso = {
  async enviarCodigo(_telefone, codigo) {
    espiao.ultimoCodigo = codigo;
    espiao.enviados++;
    return true;
  },
};
const configFalso = {
  get: (chave) => (chave === 'PORTAL_OTP_PEPPER' ? 'pepper-de-teste' : undefined),
};

const auth = new PortalAuthService(prisma, whatsappFalso, configFalso);
const escopo = new PortalEscopoService(prisma);

// Telefones de teste — prefixo improvavel de existir no banco real.
const TEL_UNICO = '5585970001111';
const TEL_DUPLO = '5585970002222';
const TEL_SEM_CADASTRO = '5585970003333';
const MARCA = '[TESTE-PORTAL]';

async function limpar() {
  const tutores = await prisma.tutor.findMany({
    where: { name: { startsWith: MARCA } },
    select: { id: true },
  });
  const ids = tutores.map((t) => t.id);
  if (ids.length) {
    await prisma.pet.deleteMany({ where: { tutorId: { in: ids } } });
    await prisma.contact.deleteMany({ where: { tutorId: { in: ids } } });
    await prisma.tutor.deleteMany({ where: { id: { in: ids } } });
  }
  for (const tel of [TEL_UNICO, TEL_DUPLO, TEL_SEM_CADASTRO]) {
    const tel8 = tel.slice(-8);
    await prisma.portalSessao.deleteMany({ where: { telefone: tel } });
    await prisma.portalCodigo.deleteMany({ where: { telefone8: tel8 } });
    await prisma.portalAcesso.deleteMany({ where: { telefone8: tel8 } });
  }
}

async function criarTutor(nome, telefone, pets) {
  const t = await prisma.tutor.create({ data: { name: `${MARCA} ${nome}` } });
  await prisma.contact.create({
    data: { tutorId: t.id, number: telefone, isWhatsApp: true, isPrimary: true },
  });
  for (const p of pets) {
    await prisma.pet.create({
      data: { tutorId: t.id, name: p, species: 'CANINE', status: 'ACTIVE' },
    });
  }
  return t.id;
}

/** Pula a janela de 60s entre pedidos de codigo, envelhecendo os registros. */
async function envelhecerCodigos(tel) {
  const tel8 = tel.slice(-8);
  await prisma.portalCodigo.updateMany({
    where: { telefone8: tel8 },
    data: { createdAt: new Date(Date.now() - 5 * 60_000) },
  });
}

async function main() {
  await limpar();

  const tutorUnico = await criarTutor('Solo', TEL_UNICO, ['Thor']);
  const tutorA = await criarTutor('Familia A', TEL_DUPLO, ['Mel']);
  const tutorB = await criarTutor('Familia B', TEL_DUPLO, ['Bidu']);

  console.log('\n1) Telefone de UM cadastro so');
  const pedido = await auth.solicitarCodigo(TEL_UNICO, '127.0.0.1');
  checa('responde "enviado" sem revelar cadastro', pedido.enviado === true);
  checa('mascara o telefone', /^\(85\) 9••••-1111$/.test(pedido.telefoneMascarado), pedido.telefoneMascarado);
  checa('mandou 1 mensagem', espiao.enviados === 1);
  const codigoCerto = espiao.ultimoCodigo;
  checa('codigo tem 6 digitos', /^\d{6}$/.test(codigoCerto || ''), codigoCerto);

  const guardado = await prisma.portalCodigo.findFirst({
    where: { telefone8: TEL_UNICO.slice(-8), tipo: 'ACESSO' },
    orderBy: { createdAt: 'desc' },
  });
  checa('codigo NAO fica em texto no banco', guardado && !guardado.codigoHash.includes(codigoCerto));

  const errado = await auth.verificarCodigo(TEL_UNICO, '000000');
  checa('codigo errado e recusado', errado.status === 'invalido', JSON.stringify(errado));
  checa('avisa quantas tentativas restam', errado.tentativasRestantes === 2, String(errado.tentativasRestantes));

  const entrou = await auth.verificarCodigo(TEL_UNICO, codigoCerto, { ip: '127.0.0.1' });
  checa('codigo certo entra', entrou.status === 'ok', JSON.stringify(entrou));
  checa('entrou no cadastro certo', entrou.tutor && entrou.tutor.id === tutorUnico);

  console.log('\n2) O cofre (so ve o proprio pet)');
  const tutorDaSessao = await auth.tutorDaSessao(entrou.token);
  checa('token devolve o tutor', tutorDaSessao === tutorUnico);
  checa('token adulterado nao vale', (await auth.tutorDaSessao(entrou.token + 'x')) === null);

  const meusPets = await escopo.petsDoTutor(tutorUnico);
  checa('ve so o pet dele', meusPets.length === 1 && meusPets[0].nome === 'Thor', JSON.stringify(meusPets.map((p) => p.nome)));

  const petDeOutro = await prisma.pet.findFirst({ where: { tutorId: tutorA }, select: { id: true } });
  let barrou = false;
  try {
    await escopo.assertPetDoTutor(tutorUnico, petDeOutro.id);
  } catch {
    barrou = true;
  }
  checa('pet de outro tutor e barrado', barrou);

  console.log('\n3) Codigo usado nao serve de novo');
  const reuso = await auth.verificarCodigo(TEL_UNICO, codigoCerto);
  checa('codigo ja usado e recusado', reuso.status === 'invalido', JSON.stringify(reuso));

  console.log('\n4) Telefone repetido em 2 cadastros');
  await auth.solicitarCodigo(TEL_DUPLO);
  const codigoDuplo = espiao.ultimoCodigo;
  const desempate = await auth.verificarCodigo(TEL_DUPLO, codigoDuplo);
  checa('pede desempate em vez de adivinhar', desempate.status === 'escolher', JSON.stringify(desempate));
  checa('oferece os 2 cadastros', desempate.opcoes && desempate.opcoes.length === 2);
  checa('mostra o pet para reconhecer', desempate.opcoes.some((o) => o.pets.some((p) => p.nome === 'Mel')));
  checa('mostra so o primeiro nome', desempate.opcoes.every((o) => !o.primeiroNome.includes(' ')));

  const invasao = await auth.escolherCadastro(desempate.desempateToken, tutorUnico);
  checa('nao deixa escolher cadastro de fora do telefone', invasao.status === 'invalido', JSON.stringify(invasao));

  const escolheu = await auth.escolherCadastro(desempate.desempateToken, tutorB);
  checa('escolha valida entra', escolheu.status === 'ok', JSON.stringify(escolheu));
  checa('entrou no cadastro escolhido', escolheu.tutor.id === tutorB);
  const petsB = await escopo.petsDoTutor(await auth.tutorDaSessao(escolheu.token));
  checa('ve o pet do cadastro escolhido (e so ele)', petsB.length === 1 && petsB[0].nome === 'Bidu');

  const reusoDesempate = await auth.escolherCadastro(desempate.desempateToken, tutorA);
  checa('ticket de desempate nao serve 2x', reusoDesempate.status === 'invalido');

  console.log('\n5) Numero sem cadastro');
  await auth.solicitarCodigo(TEL_SEM_CADASTRO);
  const semCadastro = await auth.verificarCodigo(TEL_SEM_CADASTRO, espiao.ultimoCodigo);
  checa('so diz "sem cadastro" DEPOIS do codigo certo', semCadastro.status === 'sem_cadastro', JSON.stringify(semCadastro));

  console.log('\n6) Freios');
  const antes = espiao.enviados;
  await auth.solicitarCodigo(TEL_UNICO);
  checa('nao reenvia em rajada (60s)', espiao.enviados === antes);

  await envelhecerCodigos(TEL_UNICO);
  await auth.solicitarCodigo(TEL_UNICO);
  const codigoNovo = espiao.ultimoCodigo;
  checa('reenvia depois da espera', espiao.enviados === antes + 1);

  await auth.verificarCodigo(TEL_UNICO, '111111');
  await auth.verificarCodigo(TEL_UNICO, '222222');
  const terceiro = await auth.verificarCodigo(TEL_UNICO, '333333');
  checa('3 erros seguidos bloqueiam', terceiro.status === 'bloqueado', JSON.stringify(terceiro));
  const durante = await auth.verificarCodigo(TEL_UNICO, codigoNovo);
  checa('durante o bloqueio nem o codigo certo entra', durante.status === 'bloqueado');
  const pedidoBloqueado = await auth.solicitarCodigo(TEL_UNICO);
  checa('bloqueado nao gera mensagem nova', espiao.enviados === antes + 1);
  checa('mas a resposta continua identica', pedidoBloqueado.enviado === true);

  console.log('\n7) Sair');
  await auth.sair(escolheu.token);
  checa('sessao encerrada nao vale mais', (await auth.tutorDaSessao(escolheu.token)) === null);

  console.log('\n8) Rastro (LGPD)');
  const eventos = await prisma.portalAcesso.findMany({
    where: { telefone8: { in: [TEL_UNICO.slice(-8), TEL_DUPLO.slice(-8), TEL_SEM_CADASTRO.slice(-8)] } },
    select: { evento: true },
  });
  const tipos = new Set(eventos.map((e) => e.evento));
  checa(
    'registra envio, erro, entrada, desempate, sem cadastro e bloqueio',
    ['CODIGO_ENVIADO', 'CODIGO_ERRADO', 'ENTROU', 'DESEMPATE', 'SEM_CADASTRO', 'BLOQUEADO'].every((e) => tipos.has(e)),
    [...tipos].join(','),
  );

  console.log('\n9) Nada foi escrito no CRM');
  const tutorIntacto = await prisma.tutor.findUnique({ where: { id: tutorUnico }, select: { updatedAt: true, createdAt: true } });
  checa('cadastro do tutor nao foi alterado', tutorIntacto.updatedAt.getTime() === tutorIntacto.createdAt.getTime());
}

main().catch(erroFatal).finally(() => fim(typeof limpar === 'function' ? limpar : undefined));
