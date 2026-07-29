/**
 * Teste das notificações do portal (Fatia 6).
 * O envio ao navegador é SIMULADO — não sai notificação de verdade.
 */
const { prisma, checa, fim, erroFatal } = require('./_ambiente');
const webpush = require('web-push');
const { PortalPushService } = require('../../dist/modules/portal/portal-push.service');

const MARCA = '[TESTE-PUSH]';

/** Chaves de verdade (geradas na hora) para o serviço se considerar ativo. */
const CHAVES = webpush.generateVAPIDKeys();
const configFalso = (extra = {}) => ({
  get: (k) =>
    ({
      PORTAL_VAPID_PUBLICA: CHAVES.publicKey,
      PORTAL_VAPID_PRIVADA: CHAVES.privateKey,
      PORTAL_VAPID_CONTATO: 'mailto:teste@exemplo.com',
      ...extra,
    })[k],
});

/** Troca o envio real por um espião. Devolve o que "foi para o navegador". */
function espionarEnvio(resposta = { ok: true }) {
  const enviados = [];
  webpush.sendNotification = async (inscricao, carga) => {
    enviados.push({ endpoint: inscricao.endpoint, carga: JSON.parse(carga) });
    if (!resposta.ok) {
      const e = new Error('falha simulada');
      e.statusCode = resposta.status;
      throw e;
    }
    return { statusCode: 201 };
  };
  return enviados;
}

const inscricaoFalsa = (n) => ({
  endpoint: `https://push.exemplo.com/${MARCA}/${n}`,
  keys: { p256dh: `chave-p256-${n}`, auth: `auth-${n}` },
});

async function limpar() {
  const tutores = await prisma.tutor.findMany({ where: { name: { startsWith: MARCA } }, select: { id: true } });
  const ids = tutores.map((t) => t.id);
  await prisma.portalPush.deleteMany({ where: { endpoint: { contains: MARCA } } });
  if (!ids.length) return;
  await prisma.portalPushEnviado.deleteMany({ where: { tutorId: { in: ids } } });
  await prisma.portalPush.deleteMany({ where: { tutorId: { in: ids } } });
  await prisma.tutor.deleteMany({ where: { id: { in: ids } } });
}

async function main() {
  await limpar();

  const tutor = await prisma.tutor.create({ data: { name: `${MARCA} Cintia` } });
  const outro = await prisma.tutor.create({ data: { name: `${MARCA} Outro` } });
  const push = new PortalPushService(prisma, configFalso());

  console.log('\n1) Sem chaves configuradas');
  const semChaves = new PortalPushService(prisma, { get: () => undefined });
  checa('o servico se declara inativo', semChaves.ativo === false);
  const r0 = await semChaves.avisar(tutor.id, { titulo: 'x', texto: 'y' });
  checa('nao envia e diz o motivo', r0.enviados === 0 && r0.motivo === 'SEM_CHAVES');

  console.log('\n2) Inscrever aparelho');
  checa('com chaves, o servico esta ativo', push.ativo === true);
  checa('entrega a chave publica pro navegador', push.chavePublica === CHAVES.publicKey);

  const i1 = await push.inscrever(tutor.id, inscricaoFalsa(1), 'iPhone');
  checa('inscreveu o celular', i1.inscrito === true);
  await push.inscrever(tutor.id, inscricaoFalsa(2), 'iPad');
  checa('o mesmo tutor pode ter 2 aparelhos', (await push.aparelhosDo(tutor.id)) === 2);

  await push.inscrever(tutor.id, inscricaoFalsa(1), 'iPhone');
  checa('inscrever de novo nao duplica', (await push.aparelhosDo(tutor.id)) === 2);

  const semNada = await push.inscrever(tutor.id, { endpoint: 'x' });
  checa('inscricao incompleta e recusada', semNada.inscrito === false);

  console.log('\n3) Enviar aviso');
  let enviados = espionarEnvio();
  const r1 = await push.avisar(tutor.id, {
    titulo: 'Amanhã tem visita 🐾',
    texto: 'O horário do Thor é amanhã às 09:00.',
    url: '/portal/agendar',
    assunto: 'agenda:teste-1',
  });
  checa('foi para os 2 aparelhos', r1.enviados === 2, String(r1.enviados));
  checa('com titulo', enviados[0].carga.titulo.includes('visita'));
  checa('com o link certo', enviados[0].carga.url === '/portal/agendar');

  console.log('\n4) Nunca duas vezes o mesmo assunto');
  enviados = espionarEnvio();
  const r2 = await push.avisar(tutor.id, {
    titulo: 'Amanhã tem visita 🐾',
    texto: 'de novo',
    assunto: 'agenda:teste-1',
  });
  checa('recusa o repetido', r2.enviados === 0 && r2.motivo === 'JA_ENVIADO');
  checa('e nao chamou o navegador', enviados.length === 0);

  const r3 = await push.avisar(tutor.id, { titulo: 'Outro assunto', texto: 'ok', assunto: 'agenda:teste-2' });
  checa('assunto novo passa', r3.enviados === 2);

  console.log('\n5) Cada tutor recebe so o seu');
  enviados = espionarEnvio();
  const r4 = await push.avisar(outro.id, { titulo: 'Oi', texto: 'teste' });
  checa('tutor sem aparelho nao recebe', r4.enviados === 0 && r4.motivo === 'SEM_APARELHO');
  checa('e nada foi enviado', enviados.length === 0);

  console.log('\n6) Aparelho que morreu sai da lista');
  espionarEnvio({ ok: false, status: 410 });
  const r5 = await push.avisar(tutor.id, { titulo: 'Teste', texto: 'x', assunto: 'agenda:teste-3' });
  checa('nao contabiliza envio', r5.enviados === 0);
  checa('e apaga as inscricoes mortas', (await push.aparelhosDo(tutor.id)) === 0, String(await push.aparelhosDo(tutor.id)));

  console.log('\n7) Falha temporaria NAO apaga o aparelho');
  await push.inscrever(tutor.id, inscricaoFalsa(3), 'Android');
  espionarEnvio({ ok: false, status: 500 });
  await push.avisar(tutor.id, { titulo: 'Teste', texto: 'x' });
  checa('aparelho continua inscrito', (await push.aparelhosDo(tutor.id)) === 1);
  const aparelho = await prisma.portalPush.findFirst({ where: { tutorId: tutor.id } });
  checa('mas a falha ficou contada', aparelho.falhas === 1, String(aparelho.falhas));

  console.log('\n8) Desligar avisos');
  espionarEnvio();
  const fora = await push.desinscrever(tutor.id, aparelho.endpoint);
  checa('removeu o aparelho', fora.removido === 1);
  const r6 = await push.avisar(tutor.id, { titulo: 'Teste', texto: 'x' });
  checa('depois de desligar, nao recebe mais', r6.enviados === 0);
}

main().catch(erroFatal).finally(() => fim(limpar));
