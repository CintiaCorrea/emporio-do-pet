"use client";
// [EMP-COWORK] busca topo: "tutor" -> "cliente" (Cintia 06/06).

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LuSearch, LuBell, LuSettings, LuLogOut, LuUser, LuChevronDown } from "react-icons/lu";
import { usePageHeader } from "@/lib/ui/PageHeaderContext";
import { useRolePreview } from "@/lib/ui/RolePreview";
import { roleLabel } from "@/lib/ui/role";

interface Props {
  sidebarOpen: boolean;
}

export default function Header({ sidebarOpen }: Props) {
  const { data: session } = useSession();
  const { effectiveRole, isPreviewing, realRole } = useRolePreview();
  const userName = session?.user?.name || "Usuario";
  const userEmail = session?.user?.email || "";
  const initials = ((userName.split(/\s+/)[0]?.[0] || "") + (userName.split(/\s+/)[1]?.[0] || "")).toUpperCase() || "??";
  const { header } = usePageHeader();

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <header
      className="h-16 bg-white border-b flex items-center justify-between px-6 fixed top-0 right-0 z-40 transition-all duration-200"
      style={{ borderColor: "#e8edf0", left: sidebarOpen ? 252 : 64 }}
    >
      <div className="min-w-0 flex-1 flex items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-[19px] font-bold leading-tight truncate" style={{ color: "#014D5E" }}>
            {header.title || "—"}
          </h1>
          {header.subtitle && (
            <p className="text-[12.5px] text-[#64748b] mt-[2px] truncate">{header.subtitle}</p>
          )}
        </div>
        {isPreviewing && (
          <span
            className="hidden sm:inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wide bg-[#fffbeb] border border-[#fde68a] text-[#d97706] px-2 py-[3px] rounded-md"
            title="Voce esta em modo preview de outro perfil"
          >
            👁 Preview · {roleLabel(effectiveRole)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-[14px] shrink-0">
        {/* Slot customizado para stats inline da pagina (ex: Inbox com esperando/streak) */}
        {header.rightSlot && (
          <div className="hidden xl:flex items-center pr-3 mr-1 border-r" style={{ borderColor: "#e8edf0" }}>
            {header.rightSlot}
          </div>
        )}

        <div className="hidden md:flex items-center gap-2 bg-[#f6f8f9] border rounded-[9px] px-3 py-2 w-[240px]" style={{ borderColor: "#e8edf0" }}>
          <LuSearch size={15} className="text-[#94a3b8]" />
          <input
            placeholder="Buscar cliente, pet ou lead..."
            className="bg-transparent outline-none text-[13px] text-[#1e293b] placeholder-[#94a3b8] flex-1"
          />
        </div>

        <button
          className="w-[38px] h-[38px] rounded-[9px] border bg-white flex items-center justify-center text-[#64748b] hover:text-[#009AAC] relative transition"
          style={{ borderColor: "#e8edf0" }}
          title="Notificacoes"
        >
          <LuBell size={17} />
          <span className="absolute top-2 right-[9px] w-[7px] h-[7px] rounded-full bg-[#ef4444] border-2 border-white" />
        </button>

        <div className="relative" ref={wrapRef}>
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1.5 group"
            title={`${userName} · ${roleLabel(effectiveRole)}`}
          >
            <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-[#009AAC] to-[#014D5E] text-white flex items-center justify-center text-[13px] font-semibold cursor-pointer">
              {initials}
            </div>
            <LuChevronDown size={14} className="text-[#94a3b8] group-hover:text-[#009AAC] transition" />
          </button>

          {open && (
            <div
              className="absolute right-0 top-[46px] w-[260px] bg-white rounded-xl border shadow-lg py-1 z-50"
              style={{ borderColor: "#e8edf0" }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: "#e8edf0" }}>
                <div className="flex items-center gap-3">
                  <div className="w-[40px] h-[40px] rounded-full bg-gradient-to-br from-[#009AAC] to-[#014D5E] text-white flex items-center justify-center text-[13px] font-semibold">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#0E2244] truncate">{userName}</div>
                    <div className="text-[11.5px] text-[#64748b] truncate">{userEmail}</div>
                    <div className="text-[10.5px] text-[#94a3b8] mt-0.5">
                      {roleLabel(realRole)}{isPreviewing && <span className="text-[#d97706]"> · preview ativo</span>}
                    </div>
                  </div>
                </div>
              </div>
              <Link
                href="/dashboard/perfil"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#475569] hover:bg-[#f6f8f9] transition"
              >
                <LuUser size={15} className="text-[#94a3b8]" /> Meu perfil
              </Link>
              {realRole === "ADMIN" && (
                <Link
                  href="/dashboard/configuracoes"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#475569] hover:bg-[#f6f8f9] transition"
                >
                  <LuSettings size={15} className="text-[#94a3b8]" /> Configuracoes
                </Link>
              )}
              <div className="border-t my-1" style={{ borderColor: "#e8edf0" }} />
              <button
                onClick={() => { setOpen(false); signOut({ callbackUrl: "/" }); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#ef4444] hover:bg-[#fef2f2] transition"
              >
                <LuLogOut size={15} /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
