"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Lê o token do link (?token=...). Evita a exigência de Suspense do useSearchParams.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    setToken(t);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (senha.length < 8) { setErro("A nova senha precisa ter pelo menos 8 caracteres."); return; }
    if (senha !== confirma) { setErro("As senhas não são iguais."); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: senha }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.ok === false) {
        setErro(d?.message || "Não foi possível redefinir. Peça um novo link.");
        setLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setErro("Sem conexão. Tente de novo em instantes.");
      setLoading(false);
    }
  }

  const inp =
    "appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200";

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="mx-auto h-16 w-16 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg text-white text-3xl">✓</div>
          <h2 className="text-3xl font-bold text-gray-900">Senha redefinida!</h2>
          <p className="text-sm text-gray-600">Sua nova senha já está valendo. Você já pode entrar com ela.</p>
          <Link href="/" className="inline-block w-full py-3 px-4 rounded-lg text-white bg-blue-600 hover:bg-blue-700 font-medium transition-all shadow-md">
            Ir para o login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg text-white text-3xl">🔒</div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Criar nova senha</h2>
          <p className="mt-2 text-sm text-gray-600">Escolha uma nova senha para sua conta.</p>
        </div>

        {token === null ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 text-center">
            Este link está incompleto ou inválido. Peça um novo em{" "}
            <Link href="/forgot-password" className="font-medium underline">Esqueci minha senha</Link>.
          </div>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
              <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={8} placeholder="Pelo menos 8 caracteres" className={inp} disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
              <input type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} required minLength={8} placeholder="Digite de novo" className={inp} disabled={loading} />
            </div>

            {erro && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{erro}</div>}

            <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 rounded-lg text-white bg-blue-600 hover:bg-blue-700 font-medium transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? "Salvando..." : "Salvar nova senha"}
            </button>

            <div className="text-center">
              <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-500">← Voltar para o login</Link>
            </div>
          </form>
        )}

        <div className="text-center">
          <p className="text-xs text-gray-500">© 2026 Empório do Pet. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
