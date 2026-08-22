"use client";
// 🔎 Busca global (Ctrl/⌘+K ou "/"): cliente, pet, telefone, nº da ficha — resultados ao vivo,
// navegáveis por teclado. Um único lugar, o que o SimplesVet não tem. Abre também via evento "cmdk:open".
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type PetLite = { id: string; name: string; species?: string };
type TutorLite = { id: string; name: string; codigo?: number; contacts?: { number?: string }[]; pets?: PetLite[] };
type Row = { key: string; label: string; sub: string; href: string };

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [sel, setSel] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Abertura: Ctrl/⌘+K, "/" (fora de campo de texto) e evento "cmdk:open" (clique na busca do topo).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); return; }
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key === "/") {
        const t = e.target as HTMLElement;
        if (!/input|textarea|select/i.test(t?.tagName || "") && !t?.isContentEditable) { e.preventDefault(); setOpen(true); }
      }
    }
    function onOpen() { setOpen(true); }
    window.addEventListener("keydown", onKey);
    window.addEventListener("cmdk:open", onOpen as any);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("cmdk:open", onOpen as any); };
  }, []);

  useEffect(() => { if (open) { setQ(""); setRows([]); setSel(0); setTimeout(() => inputRef.current?.focus(), 20); } }, [open]);

  // Busca com debounce, usando o endpoint que já casa nome + nº da ficha + telefone e traz os pets.
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/tutors?search=${encodeURIComponent(term)}&take=8`, { cache: "no-store" });
        const d = await r.json();
        const arr: TutorLite[] = Array.isArray(d) ? d : (d.tutors || d.data || d.itens || []);
        const out: Row[] = [];
        for (const t of arr) {
          const tel = t.contacts?.[0]?.number || "";
          const cod = t.codigo ? `#${t.codigo}` : "";
          for (const p of (t.pets || [])) {
            out.push({ key: `p:${p.id}`, label: `🐾 ${p.name}`, sub: `${t.name}${cod ? " · " + cod : ""}`, href: `/dashboard/erp/pets/${p.id}` });
          }
          out.push({ key: `t:${t.id}`, label: `👤 ${t.name}`, sub: `${[cod, tel].filter(Boolean).join(" · ")}${cod || tel ? " · " : ""}cliente`, href: `/dashboard/erp/tutores?q=${encodeURIComponent(t.codigo ? String(t.codigo) : t.name)}` });
        }
        setRows(out.slice(0, 30)); setSel(0);
      } catch { setRows([]); } finally { setLoading(false); }
    }, 220);
    return () => clearTimeout(timer);
  }, [q, open]);

  const go = useCallback((row?: Row) => { const r = row || rows[sel]; if (!r) return; setOpen(false); router.push(r.href); }, [rows, sel, router]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-black/40 print:hidden" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "#F0EBE0" }}>
          <span style={{ fontSize: 15 }}>🔎</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(rows.length - 1, s + 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              else if (e.key === "Enter") { e.preventDefault(); go(); }
            }}
            placeholder="Buscar cliente, pet, telefone ou nº da ficha…"
            className="flex-1 outline-none text-[14px] text-[#1F2A2E] placeholder-[#94a3b8] bg-transparent"
          />
          <kbd className="text-[10px] text-[#94a3b8] border rounded px-1.5 py-0.5" style={{ borderColor: "#E8E2D6" }}>Esc</kbd>
        </div>
        <div className="max-h-[52vh] overflow-auto">
          {q.trim().length < 2 ? (
            <div className="px-4 py-7 text-[13px] text-[#94a3b8] text-center">Digite ao menos 2 letras — nome do cliente/pet, telefone ou nº da ficha.</div>
          ) : loading && rows.length === 0 ? (
            <div className="px-4 py-7 text-[13px] text-[#94a3b8] text-center">Buscando…</div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-7 text-[13px] text-[#94a3b8] text-center">Nada encontrado.</div>
          ) : rows.map((r, i) => (
            <button
              key={r.key}
              onMouseEnter={() => setSel(i)}
              onClick={() => go(r)}
              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left border-b last:border-b-0"
              style={{ borderColor: "#F5F1E8", background: i === sel ? "#F0FBFC" : "#fff" }}
            >
              <div className="min-w-0">
                <div className="text-[13.5px] text-[#1F2A2E] truncate">{r.label}</div>
                <div className="text-[11.5px] text-[#8A857A] truncate">{r.sub}</div>
              </div>
              <span className="text-[11px] text-[#009AAC] shrink-0">abrir →</span>
            </button>
          ))}
        </div>
        <div className="px-4 py-2 border-t text-[10.5px] text-[#94a3b8] flex gap-3" style={{ borderColor: "#F0EBE0" }}>
          <span>↑↓ navegar</span><span>↵ abrir</span><span>Esc fechar</span><span className="ml-auto">Ctrl/⌘ + K</span>
        </div>
      </div>
    </div>
  );
}
