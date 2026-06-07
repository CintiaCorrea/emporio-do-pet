"use client";
/* ─────────────────────────────────────────────────────────────
   EMPÓRIO DO PET · versão Cintia + Claude (Cowork)   [EMP-COWORK]
   Tela........: Sistema antigo (legacy) — comparação  (dashboard/legacy)
   Atualizado..: 06/06/2026 — Cintia + Claude
   ✔ Salvar SEMPRE no main (é a versão que publica).
   ✔ Backup periódico ativo.
   ⚠ NÃO sobrescrever por "Add files via upload".
     Toda mudança = commit pequeno e direto. Em dúvida, perguntar.
   ─────────────────────────────────────────────────────────────
   Ponto de acesso ao sistema do DEV (original), só pra comparação.
   Mesmo banco de dados; telas separadas. Conforme migramos cada
   módulo pro padrão Base44, a versão antiga fica guardada/linkada aqui.
   ───────────────────────────────────────────────────────────── */

import Link from "next/link";
import { LuArrowLeft, LuExternalLink } from "react-icons/lu";

const TELAS_DEV = [
  { href: "/dashboard/erp/tutores", label: "Tutores", desc: "Lista, ficha, editar e novo (versão do dev)" },
  { href: "/dashboard/erp/pets", label: "Pets", desc: "Lista, ficha, editar e novo (versão do dev)" },
  { href: "/dashboard/crm/leads", label: "Leads", desc: "Lista e ficha (versão do dev)" },
  { href: "/dashboard/erp/agendamentos", label: "Agenda de consultas", desc: "Calendário de agendamento (não usado)" },
  { href: "/dashboard/inbox", label: "Inbox BC", desc: "Caixa de entrada BotConversa" },
];

export default function LegacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm mb-4" style={{ color: "#009AAC" }}>
          <LuArrowLeft size={16} /> Voltar
        </Link>
        <h1 className="text-xl font-semibold" style={{ color: "#0E2244" }}>Sistema antigo (dev) — comparação</h1>
        <p className="text-sm text-gray-500 mt-1 mb-5">
          Telas originais do dev, só pra você comparar quando quiser. <strong>Mesmo banco de dados</strong> da versão nova — muda só a tela.
          Conforme migramos cada módulo pro padrão Base44, a versão antiga de cada tela fica guardada aqui.
        </p>
        <div className="rounded-xl p-3 mb-5 text-xs" style={{ background: "#FFFBEB", border: "0.5px solid #FDE68A", color: "#78350F" }}>
          As telas de cadastro antigas (/novo de cliente, pet, lead e agendamento) foram <strong>congeladas</strong>: ao acessá-las, o sistema redireciona automaticamente para as telas novas. As telas de lista/ficha abaixo continuam acessíveis pra comparação.
        </div>
        <div className="space-y-2">
          {TELAS_DEV.map(t => (
            <Link key={t.href} href={t.href} className="flex items-center justify-between px-4 py-3 rounded-xl border hover:shadow-sm transition" style={{ borderColor: "#E8DFC8" }}>
              <div>
                <div className="text-sm font-medium" style={{ color: "#0E2244" }}>{t.label}</div>
                <div className="text-xs text-gray-500">{t.desc}</div>
              </div>
              <LuExternalLink size={16} className="text-gray-300" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
