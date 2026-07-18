"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { LuChevronLeft } from "react-icons/lu";

// Papel timbrado: a folha A4 com o logo/rodapé da clínica. Guardado na lista
// `config_timbrado` (id + url). Os documentos impressos usam via lib/print.ts.
export default function TimbradoConfigPage() {
  const [url, setUrl] = useState<string>("");
  const [itemId, setItemId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [subindo, setSubindo] = useState(false);

  async function carregar() {
    try {
      const r = await fetch("/api/listas?lista=config_timbrado", { cache: "no-store" });
      const d = await r.json();
      const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
      if (arr[0]) { setUrl(arr[0].valor || ""); setItemId(arr[0].id); }
      else { setUrl(""); setItemId(null); }
    } catch { /* vazio */ }
    setCarregando(false);
  }
  useEffect(() => { carregar(); }, []);

  async function salvarUrl(novaUrl: string) {
    if (itemId) {
      await fetch(`/api/listas/${itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor: novaUrl }) });
    } else {
      const r = await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: "config_timbrado", valor: novaUrl }) });
      const d = await r.json().catch(() => ({}));
      if (d?.id) setItemId(d.id);
    }
  }

  async function onFile(file: File) {
    if (!/\.(png|jpe?g|webp)$/i.test(file.name) && !file.type.startsWith("image/")) {
      toast.error("Envie uma imagem (PNG ou JPG) no formato de uma folha A4.");
      return;
    }
    setSubindo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/media/upload?pasta=documentos&origem=timbrado", { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d?.url) throw new Error(d?.message || d?.error || "Falha no upload");
      await salvarUrl(d.url);
      setUrl(d.url);
      toast.success("Papel timbrado salvo ✅");
    } catch (e: any) { toast.error("Erro ao subir: " + (e?.message || "")); }
    finally { setSubindo(false); }
  }

  async function remover() {
    if (!confirm("Remover o papel timbrado? Os documentos voltam a imprimir sem o fundo.")) return;
    try {
      if (itemId) await fetch(`/api/listas/${itemId}`, { method: "DELETE" });
      setUrl(""); setItemId(null);
      toast.success("Papel timbrado removido");
    } catch { toast.error("Erro ao remover"); }
  }

  return (
    <div className="p-4 md:p-6 min-h-screen" style={{ background: "#F6F2EA" }}>
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard/configuracoes" className="text-[12.5px] text-[#5F5E5A] hover:text-[#009AAC] inline-flex items-center gap-1 mb-3"><LuChevronLeft size={15} /> Configurações</Link>
        <h1 className="text-[22px] font-extrabold flex items-center gap-2" style={{ color: "#014D5E" }}>📄 Papel timbrado</h1>
        <p className="text-[13.5px] mt-0.5 mb-4" style={{ color: "#5F5E5A" }}>
          A folha com o logo da clínica que entra de <b>fundo</b> nos documentos impressos (boletim, receituário, atestado…). Suba uma imagem no formato de uma <b>folha A4</b> (logo em cima, contatos embaixo, meio em branco).
        </p>

        <div className="bg-white border rounded-2xl p-5" style={{ borderColor: "#E8DFC8" }}>
          {carregando ? (
            <p className="text-[13px] text-gray-400">Carregando…</p>
          ) : url ? (
            <div>
              <div className="text-[12px] font-bold uppercase tracking-wide mb-2" style={{ color: "#8A8778" }}>Timbrado atual</div>
              <div className="border rounded-lg overflow-hidden inline-block" style={{ borderColor: "#E8DFC8", maxWidth: 320 }}>
                <img src={url} alt="Papel timbrado" className="block w-full" />
              </div>
              <div className="flex gap-2 mt-4">
                <label className="cursor-pointer text-[13px] font-medium text-white px-4 py-2 rounded-lg" style={{ background: "#009AAC" }}>
                  {subindo ? "Enviando…" : "🔄 Trocar imagem"}
                  <input type="file" accept="image/*" className="hidden" disabled={subindo} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ""; }} />
                </label>
                <button onClick={remover} className="text-[13px] px-4 py-2 rounded-lg border" style={{ borderColor: "#E8DFC8", color: "#A32D2D" }}>Remover</button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-[40px] mb-2">📄</div>
              <p className="text-[13.5px] mb-4" style={{ color: "#5F5E5A" }}>Nenhum papel timbrado ainda. Os documentos imprimem sem fundo.</p>
              <label className="cursor-pointer inline-block text-[13px] font-medium text-white px-5 py-2.5 rounded-lg" style={{ background: "#009AAC" }}>
                {subindo ? "Enviando…" : "⬆️ Subir papel timbrado"}
                <input type="file" accept="image/*" className="hidden" disabled={subindo} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ""; }} />
              </label>
            </div>
          )}
        </div>

        <p className="text-[11.5px] mt-3" style={{ color: "#8A8778" }}>
          Dica: o conteúdo do documento é impresso no <b>meio</b> da folha, com margem pra não encostar no logo (topo) nem no rodapé.
        </p>
      </div>
    </div>
  );
}
