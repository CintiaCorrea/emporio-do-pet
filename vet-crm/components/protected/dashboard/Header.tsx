"use client";

import { useSession } from "next-auth/react";
import { LuSearch, LuBell } from "react-icons/lu";
import { usePageHeader } from "@/lib/ui/PageHeaderContext";
import { normalizeRole } from "@/lib/ui/role";

interface Props {
  sidebarOpen: boolean;
}

export default function Header({ sidebarOpen }: Props) {
  const { data: session } = useSession();
  const role = normalizeRole(session?.user?.role);
  const userName = session?.user?.name || "Usuário";
  const initials = ((userName.split(/\s+/)[0]?.[0] || "") + (userName.split(/\s+/)[1]?.[0] || "")).toUpperCase() || "??";
  const { header } = usePageHeader();

  return (
    <header
      className="h-16 bg-white border-b flex items-center justify-between px-6 fixed top-0 right-0 z-40 transition-all duration-200"
      style={{ borderColor: "#e8edf0", left: sidebarOpen ? 252 : 64 }}
    >
      <div className="min-w-0 flex-1">
        <h1 className="text-[19px] font-bold leading-tight truncate" style={{ color: "#014D5E" }}>
          {header.title || "—"}
        </h1>
        {header.subtitle && (
          <p className="text-[12.5px] text-[#64748b] mt-[2px] truncate">{header.subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-[14px] shrink-0">
        <div className="hidden md:flex items-center gap-2 bg-[#f6f8f9] border rounded-[9px] px-3 py-2 w-[240px]" style={{ borderColor: "#e8edf0" }}>
          <LuSearch size={15} className="text-[#94a3b8]" />
          <input
            placeholder="Buscar tutor, pet ou lead..."
            className="bg-transparent outline-none text-[13px] text-[#1e293b] placeholder-[#94a3b8] flex-1"
          />
        </div>

        <button
          className="w-[38px] h-[38px] rounded-[9px] border bg-white flex items-center justify-center text-[#64748b] hover:text-[#009AAC] relative transition"
          style={{ borderColor: "#e8edf0" }}
          title="Notificações"
        >
          <LuBell size={17} />
          <span className="absolute top-2 right-[9px] w-[7px] h-[7px] rounded-full bg-[#ef4444] border-2 border-white" />
        </button>

        <div
          className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-[#009AAC] to-[#014D5E] text-white flex items-center justify-center text-[13px] font-semibold cursor-pointer"
          title={`${userName} · ${role}`}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
