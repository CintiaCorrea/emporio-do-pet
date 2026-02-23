import Link from "next/link";

export const metadata = {
  title: "Termos de Serviço | Empório do Pet",
  description: "Termos de Serviço da plataforma Empório do Pet - Sistema de gestão veterinária.",
};

export default function TermosDeServico() {
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
            <Link href="/politica-de-privacidade" className="text-gray-600 hover:text-blue-600 transition-colors">
              Política de Privacidade
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Termos de Serviço</h1>
            <p className="text-gray-500 text-sm">Última atualização: 07 de fevereiro de 2026</p>
          </div>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-700">
            {/* 1 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg">1</span>
                Aceitação dos Termos
              </h2>
              <p className="leading-relaxed">
                Ao acessar e utilizar a plataforma <strong>Empório do Pet</strong> (&quot;Plataforma&quot;), disponível em{" "}
                <a href="https://app.emporiodopet.com.br" className="text-blue-600 hover:text-blue-500 transition-colors">
                  app.emporiodopet.com.br
                </a>, você concorda com estes Termos de Serviço e com a nossa{" "}
                <Link href="/politica-de-privacidade" className="text-blue-600 hover:text-blue-500 transition-colors">
                  Política de Privacidade
                </Link>. Caso não concorde com algum dos termos, solicitamos que não utilize a Plataforma.
              </p>
            </section>

            {/* 2 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg">2</span>
                Descrição do Serviço
              </h2>
              <p className="leading-relaxed mb-4">
                A Empório do Pet é uma plataforma de gestão veterinária que oferece funcionalidades integradas de ERP e CRM,
                incluindo, mas não se limitando a:
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { icon: "📋", title: "Gestão de Clientes e Tutores", desc: "Cadastro e gerenciamento de tutores e seus pets." },
                  { icon: "📅", title: "Agendamentos", desc: "Sistema de agendamento de consultas e procedimentos." },
                  { icon: "🏥", title: "Prontuários e Internações", desc: "Registro de consultas, tratamentos e internações." },
                  { icon: "📦", title: "Estoque e Produtos", desc: "Controle de estoque, produtos e movimentações." },
                  { icon: "💰", title: "Financeiro", desc: "Gestão financeira, comissões e relatórios." },
                  { icon: "📊", title: "CRM e Campanhas", desc: "Gestão de leads, pipelines e campanhas de marketing." },
                  { icon: "🤖", title: "Agentes de IA", desc: "Automações e agentes inteligentes para otimização do trabalho." },
                  { icon: "📈", title: "Dashboard e Relatórios", desc: "Painéis de controle com insights e métricas do negócio." },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">
                      <span className="mr-1">{item.icon}</span> {item.title}
                    </h3>
                    <p className="text-xs text-gray-600">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 3 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg">3</span>
                Cadastro e Conta do Usuário
              </h2>
              <div className="space-y-3 text-sm">
                <p className="leading-relaxed">
                  <strong>3.1.</strong> Para utilizar a Plataforma, você deverá criar uma conta fornecendo informações
                  verdadeiras, completas e atualizadas. Você é responsável por manter a confidencialidade de suas credenciais
                  de acesso (e-mail e senha).
                </p>
                <p className="leading-relaxed">
                  <strong>3.2.</strong> Ao se cadastrar, você declara ter capacidade civil para celebrar este contrato e, quando
                  aplicável, possuir a devida autorização para representar a empresa ou clínica veterinária.
                </p>
                <p className="leading-relaxed">
                  <strong>3.3.</strong> Cada conta é pessoal e intransferível. O compartilhamento de credenciais é proibido e
                  pode resultar na suspensão da conta.
                </p>
                <p className="leading-relaxed">
                  <strong>3.4.</strong> Novas contas podem estar sujeitas a aprovação por um administrador antes de obterem
                  acesso completo à Plataforma.
                </p>
              </div>
            </section>

            {/* 4 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg">4</span>
                Responsabilidades do Usuário
              </h2>
              <p className="leading-relaxed mb-3">Ao utilizar a Plataforma, o usuário se compromete a:</p>
              <ul className="space-y-2">
                {[
                  "Utilizar a Plataforma de forma ética, legal e em conformidade com estes Termos",
                  "Fornecer dados verdadeiros e manter suas informações atualizadas",
                  "Não utilizar a Plataforma para fins ilegais ou não autorizados",
                  "Manter sigilo sobre dados de clientes, tutores e pacientes conforme legislação vigente",
                  "Não tentar acessar áreas restritas, explorar vulnerabilidades ou interferir no funcionamento da Plataforma",
                  "Respeitar a propriedade intelectual da Empório do Pet e de terceiros",
                  "Comunicar imediatamente qualquer uso não autorizado da sua conta",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <svg className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* 5 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg">5</span>
                Propriedade Intelectual
              </h2>
              <div className="space-y-3 text-sm">
                <p className="leading-relaxed">
                  <strong>5.1.</strong> Todos os direitos de propriedade intelectual da Plataforma, incluindo software, design,
                  logotipos, textos e funcionalidades, pertencem exclusivamente à Empório do Pet ou seus licenciadores.
                </p>
                <p className="leading-relaxed">
                  <strong>5.2.</strong> Os dados inseridos pelo usuário na Plataforma (cadastros de tutores, pets, prontuários, etc.)
                  permanecem de propriedade do usuário. A Empório do Pet terá licença limitada para armazenar e processar esses
                  dados conforme necessário para a prestação dos serviços.
                </p>
                <p className="leading-relaxed">
                  <strong>5.3.</strong> É proibida a reprodução, modificação, distribuição ou uso comercial de qualquer parte
                  da Plataforma sem autorização prévia por escrito.
                </p>
              </div>
            </section>

            {/* 6 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg">6</span>
                Disponibilidade e Suporte
              </h2>
              <div className="space-y-3 text-sm">
                <p className="leading-relaxed">
                  <strong>6.1.</strong> A Empório do Pet se esforça para manter a Plataforma disponível 24 horas por dia,
                  7 dias por semana. No entanto, podem ocorrer interrupções programadas para manutenção ou atualizações, e
                  interrupções não programadas por motivos de força maior.
                </p>
                <p className="leading-relaxed">
                  <strong>6.2.</strong> Não garantimos que a Plataforma será livre de erros ou que operará de forma ininterrupta.
                  Faremos nossos melhores esforços para corrigir problemas reportados em tempo hábil.
                </p>
                <p className="leading-relaxed">
                  <strong>6.3.</strong> O suporte técnico é disponibilizado por meio dos canais oficiais de comunicação da
                  Plataforma.
                </p>
              </div>
            </section>

            {/* 7 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg">7</span>
                Limitação de Responsabilidade
              </h2>
              <div className="bg-amber-50 rounded-xl p-6 border border-amber-100">
                <div className="space-y-3 text-sm">
                  <p className="leading-relaxed">
                    <strong>7.1.</strong> A Plataforma é uma ferramenta de gestão e não substitui o julgamento clínico do
                    profissional veterinário. Todas as decisões médicas são de responsabilidade exclusiva do profissional
                    habilitado.
                  </p>
                  <p className="leading-relaxed">
                    <strong>7.2.</strong> A Empório do Pet não se responsabiliza por danos diretos, indiretos, incidentais ou
                    consequenciais decorrentes do uso ou impossibilidade de uso da Plataforma, incluindo perda de dados
                    resultante de falhas do usuário.
                  </p>
                  <p className="leading-relaxed">
                    <strong>7.3.</strong> Os recursos de inteligência artificial disponíveis na Plataforma são fornecidos como
                    auxílio e não devem ser considerados como aconselhamento médico ou profissional definitivo.
                  </p>
                </div>
              </div>
            </section>

            {/* 8 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg">8</span>
                Suspensão e Encerramento
              </h2>
              <div className="space-y-3 text-sm">
                <p className="leading-relaxed">
                  <strong>8.1.</strong> A Empório do Pet reserva-se o direito de suspender ou encerrar o acesso de qualquer
                  usuário que viole estes Termos de Serviço, sem necessidade de aviso prévio.
                </p>
                <p className="leading-relaxed">
                  <strong>8.2.</strong> O usuário pode solicitar o encerramento da sua conta a qualquer momento. Após o
                  encerramento, seus dados serão tratados conforme descrito na{" "}
                  <Link href="/politica-de-privacidade" className="text-blue-600 hover:text-blue-500 transition-colors">
                    Política de Privacidade
                  </Link>.
                </p>
                <p className="leading-relaxed">
                  <strong>8.3.</strong> Em caso de encerramento, o usuário poderá solicitar a exportação dos seus dados antes
                  da exclusão, conforme os direitos previstos na LGPD.
                </p>
              </div>
            </section>

            {/* 9 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg">9</span>
                Modificações nos Termos
              </h2>
              <p className="leading-relaxed text-sm">
                A Empório do Pet pode modificar estes Termos de Serviço a qualquer momento. As alterações entrarão em vigor
                após a publicação na Plataforma. O uso continuado da Plataforma após a publicação das alterações implica
                na aceitação dos novos termos. Em caso de alterações substanciais, notificaremos os usuários por e-mail ou
                aviso na Plataforma com pelo menos 15 (quinze) dias de antecedência.
              </p>
            </section>

            {/* 10 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg">10</span>
                Disposições Gerais
              </h2>
              <div className="space-y-3 text-sm">
                <p className="leading-relaxed">
                  <strong>10.1.</strong> Estes Termos são regidos pelas leis da República Federativa do Brasil.
                </p>
                <p className="leading-relaxed">
                  <strong>10.2.</strong> Eventuais disputas serão submetidas ao foro da comarca da sede da Empório do Pet,
                  com exclusão de qualquer outro, por mais privilegiado que seja.
                </p>
                <p className="leading-relaxed">
                  <strong>10.3.</strong> Se qualquer disposição destes Termos for considerada inválida ou inexequível, as
                  demais disposições permanecerão em pleno vigor e efeito.
                </p>
                <p className="leading-relaxed">
                  <strong>10.4.</strong> A tolerância ou não exercício de qualquer direito previsto nestes Termos não
                  constituirá renúncia ao mesmo.
                </p>
              </div>
            </section>

            {/* 11 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg">11</span>
                Contato
              </h2>
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                <p className="leading-relaxed text-sm mb-3">
                  Em caso de dúvidas sobre estes Termos de Serviço, entre em contato conosco:
                </p>
                <div className="space-y-2 text-sm">
                  <p><strong>Empório do Pet</strong></p>
                  <p>E-mail: <a href="mailto:contato@emporiodopet.com.br" className="text-blue-600 hover:text-blue-500 transition-colors">contato@emporiodopet.com.br</a></p>
                  <p>Site: <a href="https://app.emporiodopet.com.br" className="text-blue-600 hover:text-blue-500 transition-colors">app.emporiodopet.com.br</a></p>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center space-y-4">
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/politica-de-privacidade" className="text-gray-600 hover:text-blue-600 transition-colors">
              Política de Privacidade
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
