"use client";

import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { LuMail, LuMessageSquare, LuBook } from "react-icons/lu";

export default function AjudaPage() {
  usePageTitle("Ajuda", "Documentação, contato e suporte");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <a href="mailto:cintia@emporiodopet.com.br" className="bg-white border rounded-2xl p-5 hover:shadow-sm transition" style={{ borderColor: "#e8edf0" }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: "#e6f6f8", color: "#009AAC" }}>
            <LuMail size={18} />
          </div>
          <div className="font-semibold text-[14px] text-[#014D5E]">Falar com o time</div>
          <div className="text-xs text-[#64748b] mt-1">Dúvidas, sugestões e problemas técnicos.</div>
        </a>
        <div className="bg-white border rounded-2xl p-5" style={{ borderColor: "#e8edf0" }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: "#e6f6f8", color: "#009AAC" }}>
            <LuMessageSquare size={18} />
          </div>
          <div className="font-semibold text-[14px] text-[#014D5E]">Chat de suporte</div>
          <div className="text-xs text-[#64748b] mt-1">Em breve.</div>
        </div>
        <div className="bg-white border rounded-2xl p-5" style={{ borderColor: "#e8edf0" }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: "#e6f6f8", color: "#009AAC" }}>
            <LuBook size={18} />
          </div>
          <div className="font-semibold text-[14px] text-[#014D5E]">Documentação</div>
          <div className="text-xs text-[#64748b] mt-1">Em breve.</div>
        </div>
      </div>

      <div className="mt-8 text-[11.5px] text-[#94a3b8] text-center">
        Empório do Pet · CRM próprio · build interno
      </div>
    </div>
  );
}
