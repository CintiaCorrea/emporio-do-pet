"use client";
/* ─────────────────────────────────────────────────────────────────────────────────────────
   RECEBER VÁRIAS VENDAS NUM PAGAMENTO SÓ — a peça, não a tela.

   Nasceu dentro de app/.../erp/comandas/page.tsx. Saiu de lá em 12/09/2026 porque a Cintia
   pediu que a Consulta de vendas passasse a ser a porta única ("quero que fique somente a
   opção de consulta de vendas") — e receber é justamente o que a Consulta não sabia fazer.

   Duas telas chamando o MESMO componente, e não duas cópias: recebimento é dinheiro, e dois
   caminhos parecidos significam corrigir um e esquecer o outro. Quem chama entrega o cliente
   e as comandas; a peça cuida de escolher o caixa, das formas de pagamento, da validação de
   cartão e da chamada ao servidor.

   O servidor valida TUDO antes de gravar (caixa.service.registrarRecebimentoLote) e distribui
   da comanda mais antiga para a mais nova. A conta em si mora em recebimento-lote.regras, com
   teste — aqui não se calcula dinheiro, só se mostra e se confere.
   ───────────────────────────────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { carregarMeuCaixa, carregarMeusCaixasAbertos, caixaParaReceber, CaixaAberto } from "@/lib/caixaAtual";
import EscolhaDoCaixa from "@/components/caixa/EscolhaDoCaixa";
import AbrirMeuCaixaModal from "@/components/caixa/AbrirMeuCaixaModal";
import PagamentoFormas from "@/components/financeiro/PagamentoFormas";
import { carregarFormasRecebimento, validarPagamentosCartao, type PagForma, type FormaCfg, type TaxaRow } from "@/lib/formasPagamento";
import { fundoDeModal } from "@/lib/ui/fundoDeModal";

const FORMAS_PADRAO = ["Dinheiro", "Pix", "Cartão de crédito", "Cartão de débito", "Crédito do cliente"];
const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const ORIGEM_LBL: Record<string, string> = {
  ATENDIMENTO: "🩺 Atendimento",
  VENDA: "🛒 Venda",
  INTERNACAO: "🏥 Internação",
};

export interface ComandaParaReceber {
  id: string;
  date?: string | null;
  pet?: string | null;
  origem?: string | null;
  numeroVenda?: number | string | null;
  aberto?: number;
  valor?: number;
}

export default function ReceberEmLoteModal({
  tutor,
  emoji,
  comandas,
  onFechar,
  onRecebido,
  ocultarValores,
}: {
  tutor: string;
  /** O bichinho da espécie, quando quem chama já sabe. Só enfeite do título. */
  emoji?: string;
  comandas: ComandaParaReceber[];
  onFechar: () => void;
  /** Recarregar a lista de quem chamou. Roda só quando alguma coisa foi de fato recebida. */
  onRecebido: () => void;
  /** Respeita o 👁️ da tela que chamou: na lista de comandas os valores ficam escondidos. */
  ocultarValores?: boolean;
}) {
  const { data: session } = useSession();
  const meId = (session?.user as any)?.id || "";

  const total = useMemo(
    () => comandas.reduce((s, c) => s + Number(c.aberto ?? c.valor ?? 0), 0),
    [comandas],
  );
  const money = (v: number) => (ocultarValores ? "R$ •••" : fmtBRL(v));

  const [caixaAberto, setCaixaAberto] = useState<string | null>(null);
  const [meusAbertos, setMeusAbertos] = useState<CaixaAberto[]>([]);
  // Sem caixa próprio não há baixa (regra da casa, 08/09/2026) — então a peça ABRE o caixa
  // aqui, em vez de mandar a pessoa para outra tela no meio do recebimento.
  const [abrirCaixaMotivo, setAbrirCaixaMotivo] = useState<string | null>(null);

  const [formasCfg, setFormasCfg] = useState<string[]>([]);
  const [formasConfig, setFormasConfig] = useState<FormaCfg[]>([]);
  const [taxas, setTaxas] = useState<TaxaRow[]>([]);
  // Abre com o total no dinheiro: é o caso mais comum e poupa digitar o valor de novo.
  const [formasLote, setFormasLote] = useState<PagForma[]>([{ forma: "Dinheiro", valor: Number(total.toFixed(2)) }]);
  const [baixando, setBaixando] = useState(false);

  useEffect(() => {
    if (!meId) return;
    carregarMeuCaixa(meId).then((m) => {
      // Três casos (lib/caixaAtual): o meu; ou o único aberto; ou recusa se há mais de um
      // e nenhum é meu.
      setCaixaAberto(caixaParaReceber(m).caixa?.id || null);
    });
    carregarMeusCaixasAbertos(meId).then(setMeusAbertos);
  }, [meId]);

  useEffect(() => {
    // O mesmo carregador do ponto de venda: as formas e as taxas são as configuradas na casa.
    carregarFormasRecebimento()
      .then(({ formasConfig: fc, formasList: fl, taxas: tx }) => {
        setFormasConfig(fc);
        setTaxas(tx);
        setFormasCfg(fl);
      })
      .catch(() => {});
  }, []);

  const formasList = formasCfg.length ? formasCfg : FORMAS_PADRAO;
  const lancado = formasLote.reduce((s, f) => s + Number(f.valor || 0), 0);
  const falta = total - lancado;

  const receber = async () => {
    if (baixando) return;   // trava no primeiro clique: dinheiro não se lança duas vezes
    if (!meId) { alert("Só um instante — ainda estou identificando o seu usuário. Tente de novo em 2 segundos."); return; }
    if (!caixaAberto) { setAbrirCaixaMotivo(`Para receber as vendas de ${tutor || "o cliente"}`); return; }
    if (!confirm(`Receber ${comandas.length} venda(s) de ${tutor} num pagamento só? (${fmtBRL(total)})`)) return;
    setBaixando(true);
    try {
      // Cartão exige operadora + NSU + AUT: é o que casa a venda com a linha do extrato.
      const pendente = validarPagamentosCartao(formasLote.filter((f) => Number(f.valor) > 0), formasConfig);
      if (pendente) { alert(pendente); setBaixando(false); return; }
      const res = await fetch(`/api/caixa/${caixaAberto}/recebimento-lote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          appointmentIds: comandas.map((c) => c.id),
          formas: formasLote.filter((f) => Number(f.valor) > 0),
        }),
      });
      const dd = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(dd?.message || "Erro ao receber");
      if (Array.isArray(dd?.falhou) && dd.falhou.length) {
        alert(`Recebi ${dd.quitadas} de ${dd.comandas} comanda(s). Não consegui: ${dd.falhou.length}. Confira a lista antes de tentar de novo.`);
      } else {
        const resto = Number(dd?.restanteEmAberto || 0);
        alert(resto > 0.009
          ? `Recebido ${fmtBRL(dd.valorRecebido)}. Ainda em aberto: ${fmtBRL(resto)}.`
          : `Recebido ${fmtBRL(dd.valorRecebido)} — tudo quitado.${Number(dd?.troco) > 0.009 ? ` Troco: ${fmtBRL(dd.troco)}.` : ""}`);
      }
      onRecebido();
      onFechar();
    } catch (e: any) {
      alert(e?.message || "Erro ao receber as vendas.");
    } finally {
      setBaixando(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50" {...fundoDeModal(onFechar)}>
        <div className="rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D6" }}>
            <div>
              <h3 className="text-base font-medium text-[#014D5E]">{emoji ? `${emoji} ` : ""}{tutor}</h3>
              <div className="text-[11px] text-[#374151] mt-0.5">{comandas.length} venda(s) em aberto · receber tudo junto</div>
            </div>
            <button onClick={onFechar} aria-label="Fechar" className="text-[#374151] text-lg leading-none">✕</button>
          </div>

          <div className="px-5 py-3">
            {comandas.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-1.5 border-b last:border-b-0 text-[12.5px]" style={{ borderColor: "#F0EBE0" }}>
                <span className="text-[#5C6B70] truncate">
                  {c.numeroVenda != null && c.numeroVenda !== "" ? `#${c.numeroVenda} · ` : ""}
                  {ORIGEM_LBL[String(c.origem || "")] || ORIGEM_LBL.VENDA} · {c.pet || "—"}
                </span>
                <span className="text-[#1F2A2E] tabular-nums flex-shrink-0 ml-2">{money(Number(c.aberto ?? c.valor ?? 0))}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center px-5 py-3 border-t" style={{ borderColor: "#F0EBE0" }}>
            <span className="text-[13px] text-[#5C6B70]">Total a receber</span>
            <span className="text-[18px] font-medium text-[#014D5E] tabular-nums">{money(total)}</span>
          </div>

          {/* EM QUAL CAIXA ESTA BAIXA ENTRA. Fica FORA do `caixaAberto ?` de propósito: quando
              a pessoa não tem caixa de hoje mas tem um de outro dia reaberto, é esta faixa
              que descobre isso e destrava o recebimento. Some sozinha quando só há um caixa. */}
          <div className="px-5 pt-3">
            <EscolhaDoCaixa
              meusAbertos={meusAbertos}
              dataDaVenda={comandas.map((c) => c.date || "").filter(Boolean).sort()[0] || null}
              valor={caixaAberto}
              onEscolher={setCaixaAberto}
            />
          </div>

          {caixaAberto ? (
            <>
              <div className="px-5 py-3 border-t" style={{ borderColor: "#F0EBE0" }}>
                <div className="text-[10.5px] text-[#374151] uppercase tracking-wide mb-2">
                  Como o cliente pagou — pode dividir entre formas
                </div>
                <PagamentoFormas formas={formasLote} onChange={setFormasLote} formasList={formasList} formasConfig={formasConfig} taxas={taxas} />
                {Math.abs(falta) < 0.01 ? (
                  <div className="mt-2 text-[12px] font-medium text-[#0F6E56]">✓ Fecha certo com o total.</div>
                ) : falta > 0 ? (
                  <div className="mt-2 text-[12px] text-[#b23b39]">Falta lançar {money(falta)} — o que sobrar em aberto continua na lista, da comanda mais nova.</div>
                ) : (
                  <div className="mt-2 text-[12px] text-[#8a6400]">Passou {money(-falta)} do total — sai como troco.</div>
                )}
              </div>
              <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#E8E2D6" }}>
                <button onClick={onFechar} className="px-4 py-2 text-[13px] text-[#5C6B70] bg-white border rounded-lg" style={{ borderColor: "#E8E2D6" }}>Fechar</button>
                <button
                  onClick={receber}
                  disabled={baixando || lancado <= 0.009}
                  className="px-5 py-2 text-[13px] font-medium text-white bg-[#009AAC] rounded-lg disabled:opacity-60"
                >{baixando ? "Recebendo..." : "💰 Receber num pagamento só"}</button>
              </div>
            </>
          ) : (
            <div className="px-5 py-4 border-t text-[12.5px] text-[#5C6B70]" style={{ borderColor: "#E8E2D6" }}>
              Você não tem caixa aberto. Clique em <b>💰 Receber num pagamento só</b> para abrir o seu e seguir.
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={onFechar} className="px-4 py-2 text-[13px] text-[#5C6B70] bg-white border rounded-lg" style={{ borderColor: "#E8E2D6" }}>Fechar</button>
                <button onClick={receber} className="px-5 py-2 text-[13px] font-medium text-white bg-[#009AAC] rounded-lg">💰 Receber num pagamento só</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {abrirCaixaMotivo !== null && (
        <AbrirMeuCaixaModal
          motivo={abrirCaixaMotivo}
          onClose={() => setAbrirCaixaMotivo(null)}
          onAberto={(c) => { setCaixaAberto(c.id); setMeusAbertos((a) => [c, ...a.filter((x) => x.id !== c.id)]); }}
        />
      )}
    </>
  );
}
