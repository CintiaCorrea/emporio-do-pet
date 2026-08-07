"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuUpload, LuTrash2 } from "react-icons/lu";
import { confirmDelete } from "@/lib/ui/confirmDelete";

interface Sticker { id: string; nome?: string | null; url: string; mime: string; createdAt: string; }

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

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b" style={{ borderColor: "#E8DFC8" }}>
        <div className="px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-gray-100"><LuArrowLeft size={18} /></Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#0E2244" }}>Figurinhas da clínica</h1>
            <p className="text-sm text-gray-500">Suba as figurinhas uma vez aqui — depois é só enviar com 1 clique dentro do inbox.</p>
          </div>
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
                <img src={s.url} alt={s.nome || "figurinha"} className="max-w-full max-h-full object-contain" loading="lazy" />
                <button onClick={() => remover(s)} title="Excluir figurinha"
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white border border-[#e8e1d2] text-[#C0392B] opacity-0 group-hover:opacity-100 transition flex items-center justify-center shadow-sm">
                  <LuTrash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
