"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuUpload, LuTrash2, LuDownload } from "react-icons/lu";
import { confirmDelete } from "@/lib/ui/confirmDelete";

interface Sticker { id: string; nome?: string | null; url: string; mime: string; createdAt: string; }
interface StickerChat { id: string; conversa: string; jaImportada: boolean; }

// Converte qualquer imagem (PNG/JPG/WebP) numa FIGURINHA válida do WhatsApp:
// .webp, 512x512, fundo transparente, "contain" (sem cortar). Reduz a qualidade
// até caber no limite de 100KB (figurinha estática).
async function paraFigurinhaWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não suportado neste navegador.");
  const escala = Math.min(512 / bitmap.width, 512 / bitmap.height);
  const w = bitmap.width * escala;
  const h = bitmap.height * escala;
  ctx.clearRect(0, 0, 512, 512);
  ctx.drawImage(bitmap, (512 - w) / 2, (512 - h) / 2, w, h);
  const exportar = (q: number) => new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), "image/webp", q));
  let q = 0.92;
  let blob = await exportar(q);
  while (blob && blob.size > 100 * 1024 && q > 0.4) {
    q -= 0.15;
    blob = await exportar(q);
  }
  if (!blob) throw new Error("Não consegui converter a imagem.");
  if (blob.type !== "image/webp") throw new Error("Seu navegador não exporta WebP. Use o Chrome/Edge mais recente.");
  return blob;
}

export default function FigurinhasPage() {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function carregar() {
    setLoading(true);
    try {
      const r = await fetch("/api/whatsapp/stickers", { cache: "no-store" });
      const d = await r.json().catch(() => []);
      setStickers(Array.isArray(d) ? d : []);
    } catch {
      setStickers([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { carregar(); }, []);

  async function subir(files: FileList | null) {
    if (!files || !files.length) return;
    setErro(null);
    setEnviando(true);
    let ok = 0;
    try {
      for (const file of Array.from(files)) {
        try {
          const webp = await paraFigurinhaWebp(file);
          const fd = new FormData();
          const base = (file.name || "figurinha").replace(/\.[^.]+$/, "");
          fd.append("file", webp, `${base}.webp`);
          fd.append("nome", base);
          const r = await fetch("/api/whatsapp/stickers", { method: "POST", body: fd });
          if (r.ok) ok++;
          else {
            const e = await r.json().catch(() => null);
            setErro(e?.error || e?.message || "Falha ao subir uma das figurinhas.");
          }
        } catch (e: any) {
          setErro(e?.message || "Falha ao converter uma das imagens.");
        }
      }
      if (ok) await carregar();
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remover(s: Sticker) {
    if (!(await confirmDelete({ entityLabel: "figurinha", itemName: s.nome || "figurinha" }))) return;
    setStickers((prev) => prev.filter((x) => x.id !== s.id)); // otimista
    const r = await fetch(`/api/whatsapp/stickers/${s.id}`, { method: "DELETE" });
    if (!r.ok) { await carregar(); }
  }

  // ===== Importar das conversas =====
  const [impOpen, setImpOpen] = useState(false);
  const [impLoading, setImpLoading] = useState(false);
  const [impList, setImpList] = useState<StickerChat[]>([]);
  const [impSel, setImpSel] = useState<Set<string>>(new Set());
  const [importando, setImportando] = useState(false);
  async function abrirImportar() {
    setImpOpen(true);
    setImpLoading(true);
    setImpSel(new Set());
    try {
      const r = await fetch("/api/whatsapp/stickers/das-conversas", { cache: "no-store" });
      const d = await r.json().catch(() => []);
      setImpList(Array.isArray(d) ? d : []);
    } catch {
      setImpList([]);
    } finally {
      setImpLoading(false);
    }
  }
  function toggleImp(id: string) {
    setImpSel((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function selecionarTodasNovas() {
    setImpSel(new Set(impList.filter((s) => !s.jaImportada).map((s) => s.id)));
  }
  async function importarSelecionadas() {
    if (!impSel.size || importando) return;
    setImportando(true);
    try {
      const r = await fetch("/api/whatsapp/stickers/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds: [...impSel] }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErro(d?.error || d?.message || "Falha ao importar."); return; }
      setImpOpen(false);
      await carregar();
    } finally {
      setImportando(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b" style={{ borderColor: "#E8DFC8" }}>
        <div className="px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-gray-100"><LuArrowLeft size={18} /></Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#0E2244" }}>Figurinhas da clínica</h1>
            <p className="text-sm text-gray-500">Suba as figurinhas uma vez aqui — depois é só enviar com 1 clique dentro do inbox.</p>
          </div>
          <button onClick={abrirImportar} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border hover:bg-[#F0FBFC]" style={{ borderColor: "#009AAC", color: "#00798A" }}>
            <LuDownload size={16} /> Importar das conversas
          </button>
          <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium cursor-pointer ${enviando ? "opacity-60" : "hover:opacity-90"}`} style={{ background: "#009AAC" }}>
            {enviando ? <span>Convertendo…</span> : <><LuUpload size={16} /> Adicionar figurinha</>}
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" disabled={enviando}
              onChange={(e) => subir(e.target.files)} />
          </label>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4 rounded-xl border p-3 text-[13px] text-[#5F5E5A]" style={{ borderColor: "#E8DFC8", background: "#FBFAF6" }}>
          💡 Pode subir <b>PNG, JPG ou WebP</b> — a gente converte automaticamente pro formato de figurinha do WhatsApp
          (quadrada 512×512, fundo transparente). Para o resultado ficar redondinho, prefira imagens <b>quadradas com fundo transparente (PNG)</b>.
        </div>

        {erro && <div className="mb-4 rounded-lg border px-3 py-2 text-[13px]" style={{ borderColor: "#F0C9C9", background: "#FDECEC", color: "#A32D2D" }}>{erro}</div>}

        {loading ? (
          <p className="text-sm text-gray-400 py-10 text-center">Carregando…</p>
        ) : stickers.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl block mb-3">🩹</span>
            <p className="text-sm text-gray-500">Nenhuma figurinha ainda. Clique em <b>“Adicionar figurinha”</b> pra subir as suas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {stickers.map((s) => (
              <div key={s.id} className="group relative rounded-2xl border p-2 flex items-center justify-center aspect-square" style={{ borderColor: "#E8DFC8", background: "#F4F8F9" }}>
                <img src={`/api/whatsapp/stickers/${s.id}/media`} alt={s.nome || "figurinha"} className="max-w-full max-h-full object-contain" loading="lazy" />
                <button onClick={() => remover(s)} title="Excluir figurinha"
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white border border-[#e8e1d2] text-[#C0392B] opacity-0 group-hover:opacity-100 transition flex items-center justify-center shadow-sm">
                  <LuTrash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL Importar das conversas */}
      {impOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !importando && setImpOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#E8DFC8" }}>
              <div>
                <h3 className="text-base font-semibold" style={{ color: "#0E2244" }}>Importar figurinhas das conversas</h3>
                <p className="text-[12px] text-gray-500">As que já apareceram no WhatsApp. Marque as que quer guardar na biblioteca.</p>
              </div>
              <button onClick={() => setImpOpen(false)} className="text-[#888780] text-xl leading-none">×</button>
            </div>
            <div className="px-5 py-2 border-b flex items-center gap-3 flex-wrap" style={{ borderColor: "#E8DFC8" }}>
              <button onClick={selecionarTodasNovas} className="text-[12px] px-2.5 py-1 rounded-full border" style={{ borderColor: "#E8DFC8", color: "#5F5E5A" }}>Selecionar todas as novas</button>
              <button onClick={() => setImpSel(new Set())} className="text-[12px] px-2.5 py-1 rounded-full border" style={{ borderColor: "#E8DFC8", color: "#5F5E5A" }}>Limpar seleção</button>
              <span className="text-[12px] text-gray-500 ml-auto">{impSel.size} selecionada(s)</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {impLoading ? (
                <p className="text-center text-[12px] text-gray-400 py-10">Carregando…</p>
              ) : impList.length === 0 ? (
                <p className="text-center text-[12px] text-gray-500 py-10">Nenhuma figurinha encontrada nas conversas.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {impList.map((s) => {
                    const sel = impSel.has(s.id);
                    return (
                      <button key={s.id} onClick={() => !s.jaImportada && toggleImp(s.id)} disabled={s.jaImportada}
                        title={s.jaImportada ? "Já está na biblioteca" : `De: ${s.conversa}`}
                        className={`relative rounded-xl border p-1.5 flex items-center justify-center aspect-square transition ${s.jaImportada ? "opacity-40 cursor-default" : sel ? "ring-2 ring-[#009AAC] ring-offset-1" : "hover:bg-[#F0FBFC]"}`}
                        style={{ borderColor: "#E8DFC8", background: "#F4F8F9" }}>
                        <img src={`/api/whatsapp/messages/${s.id}/media`} alt="figurinha" className="max-w-full max-h-full object-contain" loading="lazy" />
                        {s.jaImportada && <span className="absolute top-1 left-1 text-[8px] bg-[#0F6E56] text-white px-1 rounded">✓ na biblioteca</span>}
                        {sel && <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#009AAC] text-white text-[10px] flex items-center justify-center">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t flex justify-end gap-2" style={{ borderColor: "#E8DFC8" }}>
              <button onClick={() => setImpOpen(false)} disabled={importando} className="px-4 py-2 text-sm text-[#5F5E5A] disabled:opacity-50">Cancelar</button>
              <button onClick={importarSelecionadas} disabled={!impSel.size || importando} className="px-4 py-2 text-sm text-white rounded-xl font-medium disabled:opacity-50" style={{ background: "#009AAC" }}>
                {importando ? "Importando…" : `Importar ${impSel.size || ""}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
