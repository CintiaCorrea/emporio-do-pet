"use client";
// 🔑 Minha senha — cada pessoa troca a própria senha (exige a senha atual).
// Pedido da Cintia (23/07): ninguém mais depende do suporte pra trocar senha.
import { useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import toast from "react-hot-toast";

export default function MinhaSenhaPage() {
  usePageTitle("🔑 Minha senha", "Troque a sua senha de acesso");
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [nova2, setNova2] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mostrar, setMostrar] = useState(false);

  const salvar = async () => {
    if (!atual) { toast.error("Digite a sua senha atual."); return; }
    if (nova.length < 8) { toast.error("A nova senha precisa ter pelo menos 8 caracteres."); return; }
    if (nova !== nova2) { toast.error("A confirmação não confere com a nova senha."); return; }
    if (nova === atual) { toast.error("A nova senha precisa ser diferente da atual."); return; }
    setSalvando(true);
    try {
      const r = await fetch("/api/conta/senha", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ senhaAtual: atual, novaSenha: nova }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(d?.message || d?.error || "Não foi possível trocar a senha."); return; }
      toast.success("Senha trocada com sucesso! Use a nova no próximo login. ✅");
      setAtual(""); setNova(""); setNova2("");
    } catch { toast.error("Erro ao trocar a senha."); }
    finally { setSalvando(false); }
  };

  const inp = "w-full border rounded-lg px-3 py-2.5 text-[13.5px] focus:outline-none focus:border-[#009AAC]";
  const lbl = "text-[11.5px] font-medium text-[#374151] block mb-1";

  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="bg-white border rounded-[13px] p-5" style={{ borderColor: "#E8E2D6" }}>
        <h2 className="text-[15px] font-semibold text-[#014D5E] mb-1">🔑 Trocar a minha senha</h2>
        <p className="text-[12px] text-[#5C6B70] mb-4">Sua sessão atual continua aberta — a senha nova vale a partir do próximo login.</p>

        <div className="space-y-3">
          <div>
            <label className={lbl}>Senha atual</label>
            <input type={mostrar ? "text" : "password"} value={atual} onChange={(e) => setAtual(e.target.value)} className={inp} style={{ borderColor: "#E8E2D6" }} autoComplete="current-password" />
          </div>
          <div>
            <label className={lbl}>Nova senha (mínimo 8 caracteres)</label>
            <input type={mostrar ? "text" : "password"} value={nova} onChange={(e) => setNova(e.target.value)} className={inp} style={{ borderColor: "#E8E2D6" }} autoComplete="new-password" />
          </div>
          <div>
            <label className={lbl}>Repetir a nova senha</label>
            <input type={mostrar ? "text" : "password"} value={nova2} onChange={(e) => setNova2(e.target.value)} className={inp} style={{ borderColor: "#E8E2D6" }} autoComplete="new-password" />
          </div>
          <label className="flex items-center gap-2 text-[12px] text-[#5C6B70] cursor-pointer">
            <input type="checkbox" checked={mostrar} onChange={(e) => setMostrar(e.target.checked)} /> Mostrar senhas
          </label>
          <button onClick={salvar} disabled={salvando} className="w-full text-[13.5px] font-medium text-white bg-[#009AAC] py-2.5 rounded-lg disabled:opacity-60">
            {salvando ? "Trocando..." : "Trocar senha"}
          </button>
        </div>

        <p className="text-[11px] text-[#8A8778] mt-4">Esqueceu a senha atual? Peça a um administrador pra redefinir.</p>
      </div>
    </div>
  );
}
