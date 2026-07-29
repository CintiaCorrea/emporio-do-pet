/**
 * Teste do envio do codigo pelo WhatsApp, com as respostas da Meta SIMULADAS.
 * Nao gasta mensagem e nao precisa de credencial.
 */

const { checa, fim, erroFatal } = require('./_ambiente');
const { PortalWhatsappService } = require('../../dist/modules/portal/portal-whatsapp.service');

const configFalso = (extra = {}) => ({
  get: (k) =>
    ({
      'whatsapp.accessToken': 'token-de-mentira',
      'whatsapp.phoneNumberId': '123456',
      'whatsapp.apiVersion': 'v21.0',
      ...extra,
    })[k],
});

/** Troca o fetch global por um espiao que responde o que o teste mandar. */
function espionarFetch(respostas) {
  const chamadas = [];
  global.fetch = async (url, init) => {
    chamadas.push({ url, corpo: JSON.parse(init.body) });
    const r = respostas[chamadas.length - 1] || respostas[respostas.length - 1];
    return { ok: r.ok, status: r.status || (r.ok ? 200 : 400), json: async () => r.body };
  };
  return chamadas;
}

const OK = { ok: true, body: { messages: [{ id: 'wamid.TESTE' }] } };
const ERRO_BOTAO = {
  ok: false,
  status: 400,
  body: { error: { code: 132000, message: 'number of parameters does not match' } },
};
const ERRO_NOME = {
  ok: false,
  status: 404,
  body: { error: { code: 132001, message: 'template name does not exist in the translation' } },
};

async function main() {
  console.log('\n1) Modelo COM botao de copiar (o nosso)');
  let chamadas = espionarFetch([OK]);
  let wa = new PortalWhatsappService(configFalso());
  let enviou = await wa.enviarCodigo('5585999999999', '472913');
  checa('envia e da certo', enviou === true);
  checa('so precisou de 1 chamada', chamadas.length === 1);
  checa('usa o modelo portal_tutor_codigo', chamadas[0].corpo.template.name === 'portal_tutor_codigo', chamadas[0].corpo.template.name);
  checa('manda em portugues', chamadas[0].corpo.template.language.code === 'pt_BR');
  checa('codigo vai no corpo', chamadas[0].corpo.template.components[0].parameters[0].text === '472913');
  checa('codigo vai tambem no botao', chamadas[0].corpo.template.components[1].parameters[0].text === '472913');

  console.log('\n2) Modelo SEM botao (a Meta reclama dos parametros)');
  chamadas = espionarFetch([ERRO_BOTAO, OK]);
  wa = new PortalWhatsappService(configFalso());
  enviou = await wa.enviarCodigo('5585999999999', '111222');
  checa('tenta de novo sozinho', chamadas.length === 2);
  checa('a 2a tentativa vai so com o corpo', chamadas[1].corpo.template.components.length === 1);
  checa('e o codigo chega assim mesmo', enviou === true);

  console.log('\n3) Modelo so em ingles — cai no idioma reserva (situacao de hoje)');
  chamadas = espionarFetch([ERRO_NOME, OK]);
  wa = new PortalWhatsappService(configFalso());
  enviou = await wa.enviarCodigo('5585999999999', '333444');
  checa('tenta primeiro em portugues', chamadas[0].corpo.template.language.code === 'pt_BR');
  checa('reenvia em ingles sozinho', chamadas[1] && chamadas[1].corpo.template.language.code === 'en_US', String(chamadas.length));
  checa('o tutor recebe o codigo assim mesmo', enviou === true);

  console.log('\n3b) Quando o portugues existir, nem chega a usar o reserva');
  chamadas = espionarFetch([OK]);
  wa = new PortalWhatsappService(configFalso());
  await wa.enviarCodigo('5585999999999', '777888');
  checa('uma chamada so, em portugues', chamadas.length === 1 && chamadas[0].corpo.template.language.code === 'pt_BR');

  console.log('\n3c) Nome errado de verdade — desiste e avisa');
  chamadas = espionarFetch([ERRO_NOME, ERRO_NOME, ERRO_NOME]);
  wa = new PortalWhatsappService(configFalso());
  checa('devolve falso', (await wa.enviarCodigo('5585999999999', '999888')) === false);

  console.log('\n4) Da para trocar de modelo sem mexer no codigo');
  chamadas = espionarFetch([OK]);
  wa = new PortalWhatsappService(
    configFalso({ PORTAL_OTP_TEMPLATE: 'outro_modelo', PORTAL_OTP_IDIOMA: 'en_US' }),
  );
  await wa.enviarCodigo('5585999999999', '555666');
  checa('respeita o modelo configurado', chamadas[0].corpo.template.name === 'outro_modelo');
  checa('respeita o idioma configurado', chamadas[0].corpo.template.language.code === 'en_US');

  console.log('\n5) Sem credencial nao explode');
  wa = new PortalWhatsappService({ get: () => undefined });
  checa('devolve falso em vez de estourar', (await wa.enviarCodigo('5585999999999', '000000')) === false);
}

main().catch(erroFatal).finally(() => fim(typeof limpar === 'function' ? limpar : undefined));
