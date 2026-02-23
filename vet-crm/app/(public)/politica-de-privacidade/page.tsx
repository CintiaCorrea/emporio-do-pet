import Link from "next/link";

export const metadata = {
  title: "Política de Privacidade | Empório do Pet",
  description: "Política de Privacidade da plataforma Empório do Pet - Sistema de gestão veterinária.",
};

export default function PoliticaDePrivacidade() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md group-hover:bg-blue-700 transition-colors">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900">Empório do Pet</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-4 text-sm">
            <Link href="/termos-de-servico" className="text-gray-600 hover:text-blue-600 transition-colors">
              Termos de Serviço
            </Link>
            <Link href="/dados" className="text-gray-600 hover:text-blue-600 transition-colors">
              Seus Dados
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12">
          {/* Title */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Política de Privacidade</h1>
            <p className="text-gray-500 text-sm">Última atualização: 07 de fevereiro de 2026</p>
          </div>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-700">
            {/* 1 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg">1</span>
                Introdução
              </h2>
              <p className="leading-relaxed">
                A <strong>Empório do Pet</strong> (&quot;nós&quot;, &quot;nosso&quot; ou &quot;Plataforma&quot;) está comprometida com a proteção da sua
                privacidade. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos as
                informações pessoais dos usuários da nossa plataforma de gestão veterinária, em conformidade com a
                Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
              </p>
            </section>

            {/* 2 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg">2</span>
                Dados que Coletamos
              </h2>
              <p className="leading-relaxed mb-4">
                Coletamos as seguintes categorias de dados pessoais:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-1">Dados de Identificação</h3>
                  <p className="text-sm">Nome completo, CPF/CNPJ, endereço de e-mail, telefone e endereço.</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-1">Dados Profissionais</h3>
                  <p className="text-sm">Cargo/função, CRMV (para veterinários), dados da clínica ou estabelecimento.</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-1">Dados de Clientes e Pacientes</h3>
                  <p className="text-sm">Informações de tutores, pets (espécie, raça, histórico médico), agendamentos, tratamentos, internações e prontuários.</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-1">Dados Financeiros</h3>
                  <p className="text-sm">Informações de transações, pagamentos, comissões e movimentações financeiras realizadas na plataforma.</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-1">Dados de Uso</h3>
                  <p className="text-sm">Logs de acesso, endereço IP, tipo de navegador, páginas visitadas e interações com a plataforma.</p>
                </div>
              </div>
            </section>

            {/* 3 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg">3</span>
                Finalidade do Tratamento
              </h2>
              <p className="leading-relaxed mb-4">Utilizamos seus dados para as seguintes finalidades:</p>
              <ul className="space-y-2">
                {[
                  "Prestação dos serviços de gestão veterinária (ERP, CRM, agendamentos, prontuários)",
                  "Criação e manutenção da sua conta de usuário",
                  "Comunicação sobre atualizações, novidades e suporte técnico",
                  "Envio de newsletters e campanhas de marketing (com seu consentimento)",
                  "Geração de relatórios, dashboards e insights para o seu negócio",
                  "Processamento de operações financeiras e comissões",
                  "Cumprimento de obrigações legais e regulatórias",
                  "Melhoria contínua da plataforma e experiência do usuário",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* 4 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg">4</span>
                Base Legal para o Tratamento
              </h2>
              <p className="leading-relaxed">
                O tratamento dos seus dados pessoais é realizado com base nas seguintes hipóteses previstas na LGPD:
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-gray-900 shrink-0">Art. 7º, I:</span>
                  <span>Consentimento do titular para finalidades específicas (ex.: newsletters).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-gray-900 shrink-0">Art. 7º, V:</span>
                  <span>Execução de contrato ou procedimentos preliminares (prestação dos serviços contratados).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-gray-900 shrink-0">Art. 7º, IX:</span>
                  <span>Legítimo interesse do controlador (melhoria da plataforma e segurança).</span>
                </li>
              </ul>
            </section>

            {/* 5 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg">5</span>
                Compartilhamento de Dados
              </h2>
              <p className="leading-relaxed">
                Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins comerciais.
                Seus dados poderão ser compartilhados apenas nas seguintes situações:
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span>Com prestadores de serviços essenciais (hospedagem, e-mail, processamento de pagamentos) sob contratos de confidencialidade.</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span>Para cumprimento de obrigações legais, judiciais ou administrativas.</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span>Com serviços de inteligência artificial para geração de insights e enriquecimento de dados, sempre de forma anonimizada quando possível.</span>
                </li>
              </ul>
            </section>

            {/* 6 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg">6</span>
                Segurança dos Dados
              </h2>
              <p className="leading-relaxed">
                Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados pessoais contra acesso
                não autorizado, destruição, perda, alteração ou qualquer forma de tratamento inadequado, incluindo:
              </p>
              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                {[
                  { title: "Criptografia", desc: "Dados sensíveis são criptografados em trânsito (TLS/SSL) e em repouso." },
                  { title: "Controle de Acesso", desc: "Autenticação robusta com JWT e controle de permissões por cargo." },
                  { title: "Monitoramento", desc: "Logs de auditoria e monitoramento contínuo de atividades suspeitas." },
                  { title: "Backups", desc: "Rotinas de backup regulares para garantir a disponibilidade dos dados." },
                ].map((item, i) => (
                  <div key={i} className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.title}</h3>
                    <p className="text-xs text-gray-600">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 7 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg">7</span>
                Seus Direitos (LGPD)
              </h2>
              <p className="leading-relaxed mb-4">
                De acordo com a LGPD, você tem os seguintes direitos sobre seus dados pessoais:
              </p>
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <ul className="space-y-3 text-sm">
                  {[
                    "Confirmação da existência de tratamento dos seus dados",
                    "Acesso aos dados pessoais que mantemos sobre você",
                    "Correção de dados incompletos, inexatos ou desatualizados",
                    "Anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos",
                    "Portabilidade dos dados a outro fornecedor de serviço",
                    "Eliminação dos dados tratados com consentimento",
                    "Informação sobre com quem seus dados foram compartilhados",
                    "Revogação do consentimento a qualquer momento",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-green-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-4 text-sm">
                Para exercer seus direitos, acesse a página{" "}
                <Link href="/dados" className="text-blue-600 hover:text-blue-500 font-medium transition-colors">
                  Seus Dados
                </Link>{" "}
                ou entre em contato conosco pelo e-mail{" "}
                <a href="mailto:privacidade@emporiodopet.com.br" className="text-blue-600 hover:text-blue-500 font-medium transition-colors">
                  privacidade@emporiodopet.com.br
                </a>.
              </p>
            </section>

            {/* 8 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg">8</span>
                Retenção de Dados
              </h2>
              <p className="leading-relaxed">
                Seus dados pessoais serão armazenados pelo tempo necessário para cumprimento das finalidades descritas nesta
                política, respeitando os prazos legais aplicáveis. Dados de prontuários e históricos médicos de animais são
                mantidos conforme exigências do CFMV (Conselho Federal de Medicina Veterinária). Após o encerramento da
                relação contratual, os dados serão eliminados ou anonimizados, salvo quando a retenção for necessária para
                cumprimento de obrigação legal.
              </p>
            </section>

            {/* 9 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg">9</span>
                Cookies e Tecnologias Similares
              </h2>
              <p className="leading-relaxed">
                Utilizamos cookies e tecnologias similares para manter sua sessão ativa, armazenar preferências (como tema
                claro/escuro) e coletar informações sobre o uso da plataforma. Você pode gerenciar as preferências de cookies
                através das configurações do seu navegador.
              </p>
            </section>

            {/* 10 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg">10</span>
                Alterações nesta Política
              </h2>
              <p className="leading-relaxed">
                Podemos atualizar esta Política de Privacidade periodicamente. Quando isso ocorrer, a data de &quot;Última
                atualização&quot; será alterada e, em caso de mudanças significativas, notificaremos você por e-mail ou por
                aviso na plataforma.
              </p>
            </section>

            {/* 11 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg">11</span>
                Contato
              </h2>
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                <p className="leading-relaxed text-sm mb-3">
                  Em caso de dúvidas sobre esta Política de Privacidade ou sobre o tratamento dos seus dados pessoais,
                  entre em contato conosco:
                </p>
                <div className="space-y-2 text-sm">
                  <p><strong>Empório do Pet</strong></p>
                  <p>E-mail: <a href="mailto:privacidade@emporiodopet.com.br" className="text-blue-600 hover:text-blue-500 transition-colors">privacidade@emporiodopet.com.br</a></p>
                  <p>Site: <a href="https://app.emporiodopet.com.br" className="text-blue-600 hover:text-blue-500 transition-colors">app.emporiodopet.com.br</a></p>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center space-y-4">
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/termos-de-servico" className="text-gray-600 hover:text-blue-600 transition-colors">
              Termos de Serviço
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/dados" className="text-gray-600 hover:text-blue-600 transition-colors">
              Seus Dados
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/" className="text-gray-600 hover:text-blue-600 transition-colors">
              Voltar ao Login
            </Link>
          </div>
          <p className="text-xs text-gray-500">
            © 2026 Empório do Pet. Todos os direitos reservados.
          </p>
        </div>
      </main>
    </div>
  );
}
