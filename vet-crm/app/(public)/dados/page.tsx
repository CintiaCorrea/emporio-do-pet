import Link from "next/link";

export const metadata = {
  title: "Seus Dados | Empório do Pet",
  description: "Gerencie seus dados pessoais na plataforma Empório do Pet - Direitos LGPD.",
};

export default function DadosPage() {
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
            <Link href="/termos-de-servico" className="text-gray-600 hover:text-blue-600 transition-colors">
              Termos de Serviço
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Seus Dados</h1>
            <p className="text-gray-500 text-sm max-w-lg mx-auto">
              Gerencie seus dados pessoais e exerça seus direitos conforme a Lei Geral de Proteção de Dados (LGPD).
            </p>
          </div>

          <div className="space-y-8 text-gray-700">
            {/* Intro */}
            <section>
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900 mb-1">Seus direitos sob a LGPD</h2>
                    <p className="text-sm leading-relaxed">
                      A Lei Geral de Proteção de Dados (Lei nº 13.709/2018) garante a você, titular dos dados,
                      uma série de direitos sobre suas informações pessoais. A Empório do Pet respeita e facilita
                      o exercício desses direitos.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Rights Cards */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Seus Direitos</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  {
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ),
                    title: "Acesso aos Dados",
                    desc: "Você pode solicitar uma cópia completa de todos os dados pessoais que mantemos sobre você.",
                    color: "blue",
                  },
                  {
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    ),
                    title: "Correção de Dados",
                    desc: "Solicite a correção de dados pessoais incompletos, inexatos ou desatualizados.",
                    color: "green",
                  },
                  {
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    ),
                    title: "Exclusão de Dados",
                    desc: "Solicite a eliminação dos seus dados pessoais tratados com base no seu consentimento.",
                    color: "red",
                  },
                  {
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    ),
                    title: "Portabilidade",
                    desc: "Solicite a transferência dos seus dados pessoais para outro fornecedor de serviço.",
                    color: "purple",
                  },
                  {
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    ),
                    title: "Revogação do Consentimento",
                    desc: "Revogue o consentimento dado anteriormente para o tratamento dos seus dados.",
                    color: "orange",
                  },
                  {
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                    title: "Informações sobre Compartilhamento",
                    desc: "Saiba com quem seus dados pessoais foram compartilhados e para quais finalidades.",
                    color: "teal",
                  },
                ].map((item, i) => {
                  const colorMap: Record<string, { bg: string; iconBg: string; iconColor: string }> = {
                    blue: { bg: "bg-blue-50", iconBg: "bg-blue-100", iconColor: "text-blue-600" },
                    green: { bg: "bg-green-50", iconBg: "bg-green-100", iconColor: "text-green-600" },
                    red: { bg: "bg-red-50", iconBg: "bg-red-100", iconColor: "text-red-600" },
                    purple: { bg: "bg-purple-50", iconBg: "bg-purple-100", iconColor: "text-purple-600" },
                    orange: { bg: "bg-orange-50", iconBg: "bg-orange-100", iconColor: "text-orange-600" },
                    teal: { bg: "bg-teal-50", iconBg: "bg-teal-100", iconColor: "text-teal-600" },
                  };
                  const colors = colorMap[item.color];
                  return (
                    <div key={i} className={`${colors.bg} rounded-xl p-5 border border-gray-100 hover:shadow-md transition-shadow`}>
                      <div className={`w-10 h-10 ${colors.iconBg} rounded-lg flex items-center justify-center mb-3 ${colors.iconColor}`}>
                        {item.icon}
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.title}</h3>
                      <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* How to Request */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Como Exercer Seus Direitos</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Identifique sua solicitação</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Determine qual direito deseja exercer (acesso, correção, exclusão, portabilidade, etc.) e
                      prepare as informações necessárias para identificação.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Entre em contato</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Envie sua solicitação para nosso e-mail dedicado à proteção de dados:{" "}
                      <a href="mailto:privacidade@emporiodopet.com.br" className="text-blue-600 hover:text-blue-500 font-medium transition-colors">
                        privacidade@emporiodopet.com.br
                      </a>. Inclua seu nome completo, e-mail cadastrado na plataforma e a descrição detalhada do
                      pedido.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Verificação de identidade</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Para sua segurança, poderemos solicitar informações adicionais para confirmar sua identidade
                      antes de processar a solicitação.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                    4
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Prazo de resposta</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Responderemos à sua solicitação em até <strong>15 dias úteis</strong>, conforme previsto na
                      LGPD. Em casos complexos, poderemos solicitar prazo adicional, sempre com comunicação prévia.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Data We Collect Summary */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Dados que Coletamos</h2>
              <p className="text-sm leading-relaxed mb-4">
                Para total transparência, abaixo estão as categorias de dados pessoais que coletamos e tratamos
                através da plataforma:
              </p>
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Categoria</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Exemplos</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Finalidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      { cat: "Identificação", ex: "Nome, e-mail, telefone", fin: "Criação de conta e comunicação" },
                      { cat: "Profissional", ex: "Cargo, CRMV, clínica", fin: "Gestão de acesso e permissões" },
                      { cat: "Clientes/Pacientes", ex: "Tutores, pets, prontuários", fin: "Prestação do serviço veterinário" },
                      { cat: "Financeiro", ex: "Transações, comissões", fin: "Gestão financeira" },
                      { cat: "Uso da Plataforma", ex: "Logs, IP, navegador", fin: "Segurança e melhoria do serviço" },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-900">{row.cat}</td>
                        <td className="py-3 px-4 text-gray-600">{row.ex}</td>
                        <td className="py-3 px-4 text-gray-600">{row.fin}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Para mais detalhes sobre coleta e tratamento de dados, consulte nossa{" "}
                <Link href="/politica-de-privacidade" className="text-blue-600 hover:text-blue-500 transition-colors">
                  Política de Privacidade
                </Link> completa.
              </p>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Retenção e Exclusão</h2>
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <div className="space-y-3 text-sm">
                  <p className="leading-relaxed">
                    <strong>Período de retenção:</strong> Mantemos seus dados pelo tempo necessário para prestação
                    dos serviços e cumprimento de obrigações legais. Dados de prontuários veterinários seguem os
                    prazos estabelecidos pelo CFMV.
                  </p>
                  <p className="leading-relaxed">
                    <strong>Após encerramento da conta:</strong> Ao solicitar o encerramento da sua conta, seus dados
                    pessoais serão eliminados em até 30 dias, exceto quando a retenção for necessária para cumprimento
                    de obrigação legal ou regulatória.
                  </p>
                  <p className="leading-relaxed">
                    <strong>Dados anonimizados:</strong> Dados que foram devidamente anonimizados podem ser mantidos
                    para fins estatísticos, uma vez que não permitem a identificação do titular.
                  </p>
                </div>
              </div>
            </section>

            {/* DPO / Contact */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Encarregado de Proteção de Dados (DPO)</h2>
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                <p className="text-sm leading-relaxed mb-4">
                  A Empório do Pet possui um Encarregado de Proteção de Dados (DPO) responsável por garantir a
                  conformidade com a LGPD e atender suas solicitações. Para entrar em contato:
                </p>
                <div className="space-y-2 text-sm">
                  <p><strong>Empório do Pet - Proteção de Dados</strong></p>
                  <p>
                    E-mail:{" "}
                    <a href="mailto:privacidade@emporiodopet.com.br" className="text-blue-600 hover:text-blue-500 transition-colors">
                      privacidade@emporiodopet.com.br
                    </a>
                  </p>
                  <p>
                    Site:{" "}
                    <a href="https://app.emporiodopet.com.br" className="text-blue-600 hover:text-blue-500 transition-colors">
                      app.emporiodopet.com.br
                    </a>
                  </p>
                </div>
              </div>
            </section>

            {/* ANPD */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Autoridade Nacional de Proteção de Dados</h2>
              <p className="text-sm leading-relaxed">
                Caso considere que o tratamento dos seus dados pessoais não está em conformidade com a LGPD, você
                tem o direito de apresentar reclamação junto à Autoridade Nacional de Proteção de Dados (ANPD)
                através do site{" "}
                <a
                  href="https://www.gov.br/anpd"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-500 font-medium transition-colors"
                >
                  www.gov.br/anpd
                </a>.
              </p>
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
            <Link href="/termos-de-servico" className="text-gray-600 hover:text-blue-600 transition-colors">
              Termos de Serviço
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
