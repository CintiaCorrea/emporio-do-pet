import { Controller, Get, Header } from '@nestjs/common';

const PRIVACIDADE_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Política de Privacidade — Empório do Pet</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
         line-height: 1.65; color: #1f2d2e; max-width: 820px; margin: 0 auto;
         padding: 32px 20px 64px; }
  h1 { color: #014D5E; font-size: 1.8rem; }
  h2 { color: #009AAC; font-size: 1.2rem; margin-top: 2rem; }
  a { color: #009AAC; }
  .meta { color: #5a6b6c; font-size: .9rem; }
  ul { padding-left: 1.2rem; }
</style>
</head>
<body>
  <h1>Política de Privacidade</h1>
  <p class="meta">Última atualização: 19 de junho de 2026</p>

  <p>Esta Política de Privacidade descreve como a <strong>Empório do Pet</strong>
  (EMPÓRIO DO PET COMÉRCIO DE RAÇÕES LTDA, CNPJ 13.310.475/0001-26, com sede na
  Av. Engenheiro Leal Lima Verde, 205, Sapiranga, Fortaleza/CE) coleta, usa, armazena
  e protege os dados pessoais de seus clientes e contatos, em conformidade com a
  Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).</p>

  <h2>1. Dados que coletamos</h2>
  <p>Podemos coletar os seguintes dados pessoais, conforme a forma de contato:</p>
  <ul>
    <li><strong>Dados de identificação e contato:</strong> nome, telefone, e-mail.</li>
    <li><strong>Dados do seu pet:</strong> nome, espécie, raça e informações de
        atendimento, quando você é nosso cliente.</li>
    <li><strong>Dados de atendimento:</strong> histórico de contatos, agendamentos e
        interações com nossa equipe.</li>
  </ul>

  <h2>2. Dados coletados via Meta (Facebook e Instagram)</h2>
  <p>Quando você preenche um <strong>formulário de anúncio (Lead Ad)</strong> das nossas
  páginas no Facebook ou Instagram, coletamos os dados que você informa (como nome,
  telefone e e-mail) por meio das APIs da Meta Platforms. Esses dados são recebidos
  automaticamente no nosso sistema de atendimento (CRM) e usados
  <strong>exclusivamente</strong> para entrarmos em contato com você sobre nossos
  produtos e serviços veterinários. <strong>Não vendemos nem compartilhamos</strong>
  esses dados com terceiros para fins de marketing.</p>

  <h2>3. Como usamos seus dados</h2>
  <ul>
    <li>Entrar em contato e responder às suas solicitações;</li>
    <li>Agendar e realizar atendimentos e serviços para o seu pet;</li>
    <li>Enviar informações sobre produtos, serviços e cuidados, quando autorizado;</li>
    <li>Cumprir obrigações legais e regulatórias.</li>
  </ul>

  <h2>4. Base legal</h2>
  <p>Tratamos seus dados com base no seu <strong>consentimento</strong> (por exemplo, ao
  preencher um formulário de anúncio), na <strong>execução de contrato</strong> ou
  medidas pré-contratuais (atendimento solicitado) e no <strong>legítimo interesse</strong>
  de prestar um bom atendimento, sempre respeitando seus direitos.</p>

  <h2>5. Compartilhamento</h2>
  <p>Não comercializamos seus dados. Eles podem ser tratados por prestadores de serviço
  que nos apoiam na operação (por exemplo, plataformas de CRM e comunicação), sempre sob
  obrigação de confidencialidade e apenas para as finalidades aqui descritas.</p>

  <h2>6. Armazenamento e segurança</h2>
  <p>Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso
  não autorizado, perda ou uso indevido. Mantemos seus dados apenas pelo tempo necessário
  às finalidades informadas ou conforme exigido por lei.</p>

  <h2>7. Seus direitos (LGPD)</h2>
  <p>Você pode, a qualquer momento, solicitar: confirmação e acesso aos seus dados;
  correção de dados incompletos ou desatualizados; anonimização ou
  <strong>exclusão</strong> de dados; informação sobre compartilhamento; e revogação do
  consentimento. Para exercer esses direitos, consulte nossa
  <a href="/exclusao-de-dados.html">página de Exclusão de Dados</a>
  ou fale conosco.</p>

  <h2>8. Exclusão de dados</h2>
  <p>Para solicitar a exclusão dos seus dados, envie um e-mail para
  <a href="mailto:adm.emporiodopet@gmail.com">adm.emporiodopet@gmail.com</a> ou acesse
  nossa <a href="/exclusao-de-dados.html">página de Exclusão de
  Dados</a>. Atenderemos sua solicitação no prazo legal.</p>

  <h2>9. Contato</h2>
  <p>Dúvidas sobre esta Política ou sobre seus dados? Fale com a gente pelo e-mail
  <a href="mailto:adm.emporiodopet@gmail.com">adm.emporiodopet@gmail.com</a>.</p>

  <p class="meta">Esta política pode ser atualizada periodicamente. A data da última
  atualização está indicada no topo desta página.</p>
</body>
</html>`;

const EXCLUSAO_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Exclusão de Dados — Empório do Pet</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
         line-height: 1.65; color: #1f2d2e; max-width: 820px; margin: 0 auto;
         padding: 32px 20px 64px; }
  h1 { color: #014D5E; font-size: 1.8rem; }
  h2 { color: #009AAC; font-size: 1.2rem; margin-top: 2rem; }
  a { color: #009AAC; }
  .meta { color: #5a6b6c; font-size: .9rem; }
  ol { padding-left: 1.2rem; }
  .box { background: #f1f8f9; border: 1px solid #cfe7ea; border-radius: 10px;
         padding: 16px 20px; }
</style>
</head>
<body>
  <h1>Exclusão de Dados</h1>
  <p class="meta">Última atualização: 19 de junho de 2026</p>

  <p>A <strong>Empório do Pet</strong> (EMPÓRIO DO PET COMÉRCIO DE RAÇÕES LTDA,
  CNPJ 13.310.475/0001-26) respeita o seu direito, previsto na Lei Geral de Proteção de
  Dados (LGPD), de solicitar a exclusão dos seus dados pessoais, inclusive aqueles
  coletados por meio dos formulários de anúncio (Lead Ads) do Facebook e do Instagram.</p>

  <h2>Como solicitar a exclusão dos seus dados</h2>
  <ol>
    <li>Envie um e-mail para
        <a href="mailto:adm.emporiodopet@gmail.com">adm.emporiodopet@gmail.com</a>
        com o assunto <strong>"Exclusão de dados"</strong>.</li>
    <li>Informe o <strong>nome</strong> e o <strong>telefone ou e-mail</strong> usados no
        contato conosco, para localizarmos o seu cadastro.</li>
    <li>Confirmaremos o recebimento e realizaremos a exclusão dos seus dados pessoais dos
        nossos sistemas no prazo legal, salvo quando a manutenção for exigida por
        obrigação legal ou regulatória.</li>
  </ol>

  <div class="box">
    <p style="margin:0"><strong>Contato direto:</strong>
    <a href="mailto:adm.emporiodopet@gmail.com">adm.emporiodopet@gmail.com</a></p>
  </div>

  <h2>Quais dados são excluídos</h2>
  <p>A exclusão abrange os dados pessoais de contato (nome, telefone, e-mail) e o
  histórico de atendimento associado, mantidos no nosso CRM, incluindo dados recebidos
  via APIs da Meta (Facebook/Instagram).</p>

  <p>Para mais informações sobre como tratamos seus dados, consulte nossa
  <a href="/privacidade.html">Política de Privacidade</a>.</p>
</body>
</html>`;

/**
 * Páginas legais públicas (fora do prefixo /api, via exclude no main.ts):
 *  - /privacidade.html        -> Política de Privacidade
 *  - /exclusao-de-dados.html  -> Exclusão de Dados
 * Usadas na submissão de App Review do Meta (URL de privacidade e de exclusão).
 */
@Controller()
export class LegalController {
  @Get('privacidade.html')
  @Header('Content-Type', 'text/html; charset=utf-8')
  privacidade(): string {
    return PRIVACIDADE_HTML;
  }

  @Get('exclusao-de-dados.html')
  @Header('Content-Type', 'text/html; charset=utf-8')
  exclusaoDeDados(): string {
    return EXCLUSAO_HTML;
  }
}
