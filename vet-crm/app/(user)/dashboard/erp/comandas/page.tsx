"use client";
// [EMP-COWORK] Vendas · Em atendimento (Fatia 1A) — comandas abertas de todas as origens + baixar no caixa.
// Comanda aberta = appointment com value>0 e paymentStatus != PAID (exceto internação, faturada pela conta da F5).
// Baixar = POST /api/caixa/{caixaAberto}/recebimento {appointmentId, valorTotal, formas}. Valores sensíveis com olhinho.

import { useEffect, useMemo, useState , useRef, Fragment } from "react";
import Link from "next/link";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { useSession } from "next-auth/react";
import { carregarMeuCaixa, carregarMeusCaixasAbertos, rotuloCaixa, caixaParaReceber, CaixaAberto, CaixaParaReceber } from "@/lib/caixaAtual";
import EscolhaDoCaixa from "@/components/caixa/EscolhaDoCaixa";
import AbrirMeuCaixaModal from "@/components/caixa/AbrirMeuCaixaModal";
import { imprimirVendasAbertas } from "@/lib/documentos/vendas-abertas-print";
import PagamentoFormas from "@/components/financeiro/PagamentoFormas";
import { carregarFormasRecebimento, validarPagamentosCartao, type PagForma, type FormaCfg, type TaxaRow } from "@/lib/formasPagamento";
import { hojeNaClinicaISO } from "@/lib/datas";
import { fundoDeModal } from "@/lib/ui/fundoDeModal";

const FORMAS = ["Dinheiro", "Pix", "Cartão de crédito", "Cartão de débito", "Crédito do cliente"];
const ORIGEM: Record<string, { lbl: string; bg: string; fg: string }> = {
  ATENDIMENTO: { lbl: "🩺 Atendimento", bg: "#E8F1F8", fg: "#1f5a82" },
  VENDA: { lbl: "🛒 Venda", bg: "#F0EBE0", fg: "#8A7B63" },
};
function especieEmoji(s?: string) { const k = (s || "").toUpperCase(); if (k.startsWith("CAN") || k.startsWith("DOG")) return "🐶"; if (k.startsWith("FEL") || k.startsWith("CAT") || k.startsWith("GAT")) return "🐱"; return "🐾"; }
const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
function tempoDe(s?: string) { if (!s) return ""; try { const min = Math.max(0, Math.round((Date.now() - new Date(s).getTime()) / 60000)); if (min < 60) return `há ${min} min`; const h = Math.floor(min / 60); if (h < 24) return `há ${h} h`; return `há ${Math.floor(h / 24)} d`; } catch { return ""; } }
const hojeISO = () => hojeNaClinicaISO();

export default function ComandasPage() {
  usePageTitle("Vendas em aberto", "Vendas que ainda não foram recebidas no caixa");
  const [loading, setLoading] = useState(true);
  const jaCarregou = useRef(false);
  const [comandas, setComandas] = useState<any[]>([]);
  const [caixaAberto, setCaixaAberto] = useState<string | null>(null); // id do MEU caixa (lib/caixaAtual)
  const [caixaUsado, setCaixaUsado] = useState<CaixaParaReceber | null>(null); // decisão dos 3 casos
  // Sem caixa próprio não há baixa (regra da casa, 08/09/2026) — então a tela ABRE o caixa aqui,
  // em vez de mandar a pessoa para outra tela no meio do recebimento.
  const [abrirCaixaMotivo, setAbrirCaixaMotivo] = useState<string | null>(null);
  const [meuCaixa, setMeuCaixa] = useState<CaixaAberto | null>(null);
  const [caixasDeOutros, setCaixasDeOutros] = useState<CaixaAberto[]>([]);
  const { data: session } = useSession();
  const meId = (session?.user as any)?.id || "";
  const [baixadoHoje, setBaixadoHoje] = useState(0);
  const [olho, setOlho] = useState(false); // valores ocultos por padrão
  // Cliente com varias vendas comeca FECHADO: uma linha por cliente. A Cintia viu as 7 vendas
  // da mesma cliente abertas e disse "somente quando clicar no nome abre todas as vendas".
  const [gruposAbertos, setGruposAbertos] = useState<Set<string>>(new Set());
  const alternarGrupo = (k: string) => setGruposAbertos((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const [formasCfg, setFormasCfg] = useState<string[]>([]); // formas configuradas (Fase 2)
  // Busca por cliente/pet. NAO e filtro do que ja veio: o backend corta a lista de abertas,
  // entao quem esta fora desse corte so aparece se a busca for ao banco.
  const [busca, setBusca] = useState("");
  const [buscando, setBuscando] = useState(false);

  const [det, setDet] = useState<any | null>(null);
  const [detItens, setDetItens] = useState<any[]>([]);
  const [detLoading, setDetLoading] = useState(false);
  const [forma, setForma] = useState("Dinheiro");
  // Pagamento UNICO do grupo: varias formas (Pix + cartao + dinheiro), como no ponto de venda.
  const [formasLote, setFormasLote] = useState<PagForma[]>([]);
  const [formasConfig, setFormasConfig] = useState<FormaCfg[]>([]);
  const [taxas, setTaxas] = useState<TaxaRow[]>([]);
  const [baixando, setBaixando] = useState(false);
  const [detGrupo, setDetGrupo] = useState<any | null>(null); // baixar todas as comandas de um cliente (1B)

  const urlComandas = (q: string) => {
    const p = new URLSearchParams({ abertas: "1" });
    if (q.trim()) p.set("busca", q.trim());
    return `/api/caixa/vendas?${p.toString()}`;
  };

  const load = async () => {
    if (!jaCarregou.current) setLoading(true);
    try {
      const hoje = hojeISO();
      const [c, cx, rec, fm] = await Promise.all([
        fetch(urlComandas(busca)).then((r) => r.json()).catch(() => []),
        Promise.resolve([]),  // caixa: quem decide é lib/caixaAtual (abaixo)

        fetch(`/api/caixa/recebimentos?from=${hoje}&to=${hoje}`).then((r) => r.json()).catch(() => []),
        fetch("/api/listas?lista=formasrecebimento").then((r) => r.json()).catch(() => []),
      ]);
      setComandas(Array.isArray(c) ? c : (c.data || []));
      // O caixa NÃO é resolvido aqui: depende da sessão, que carrega depois. Ver o efeito abaixo.
      const recArr = Array.isArray(rec) ? rec : (rec.data || []);
      setBaixadoHoje(recArr.reduce((s: number, r: any) => s + Number(r.valorTotal || 0), 0));
      const fmArr = (Array.isArray(fm) ? fm : (fm.itens || fm.data || [])).map((x: any) => { try { return JSON.parse(x.valor); } catch { return null; } }).filter((v: any) => v && v.ativo !== false).map((v: any) => v.nome);
      setFormasCfg(fmArr);
    } catch {}
    jaCarregou.current = true; setLoading(false);
  };
  useEffect(() => { load(); }, []);
  // Config de formas e taxas: o mesmo carregador do ponto de venda, para o pagamento unico
  // aceitar cartao com operadora/NSU e calcular taxa igual la'.
  useEffect(() => {
    carregarFormasRecebimento()
      .then(({ formasConfig: fc, taxas: tx }) => { setFormasConfig(fc); setTaxas(tx); })
      .catch(() => undefined);
  }, []);
  // Digitar refaz SO a lista; caixa e "baixado hoje" nao mudam com a busca.
  const primeiraBusca = useRef(true);
  const buscaSeq = useRef(0); // resposta atrasada de busca antiga nao pode sobrescrever a atual
  useEffect(() => {
    if (primeiraBusca.current) { primeiraBusca.current = false; return; }
    setBuscando(true);
    const t = setTimeout(() => {
      const seq = ++buscaSeq.current;
      fetch(urlComandas(busca))
        .then((r) => r.json())
        .catch(() => [])
        .then((c) => {
          if (seq !== buscaSeq.current) return; // chegou tarde: ja existe busca mais nova
          setComandas(Array.isArray(c) ? c : (c.data || []));
          setBuscando(false);
        });
    }, 350);
    return () => clearTimeout(t);
  }, [busca]);
  // O recebimento entra no caixa de QUEM ESTÁ LOGADA (lib/caixaAtual). Só dá pra saber depois que a
  // sessão carrega — por isso este efeito separado, e não dentro do load().
  useEffect(() => {
    if (!meId) return;
    carregarMeuCaixa(meId).then((m) => {
      setMeuCaixa(m.meu); setCaixasDeOutros(m.deOutros);
      // Três casos (lib/caixaAtual): o meu; ou o único aberto; ou recusa se há mais de um
      // e nenhum é meu. Antes bastava não ter o meu pra travar a baixa.
      const r = caixaParaReceber(m);
      setCaixaUsado(r); setCaixaAberto(r.caixa?.id || null);
    });
    carregarMeusCaixasAbertos(meId).then(setMeusAbertos);
  }, [meId]);

  // TODOS os meus caixas abertos, de qualquer dia — a lista da escolha. Diferente de
  // `meuCaixa`, que so enxerga os de HOJE e por isso nao via os dias reabertos.
  const [meusAbertos, setMeusAbertos] = useState<CaixaAberto[]>([]);

  const emAberto = useMemo(() => comandas.filter((c: any) => !c.futura).reduce((s, c) => s + Number(c.aberto || c.valor || 0), 0), [comandas]);
  const money = (v: number) => (olho ? fmtBRL(v) : "R$ •••");
  const formasList = formasCfg.length ? formasCfg : FORMAS;

  const abrir = async (c: any) => {
    setDet(c); setForma("Dinheiro"); setDetItens([]); setDetLoading(true);
    try {
      const d = await fetch(`/api/atendimentos/${c.id}`).then((r) => r.json()).catch(() => null);
      const arr = d?.items || d?.itens || [];
      setDetItens(Array.isArray(arr) ? arr : []);
    } catch { setDetItens([]); }
    setDetLoading(false);
  };

  const baixar = async () => {
    if (!det) return;
    if (!meId) { alert("Só um instante — ainda estou identificando o seu usuário. Tente de novo em 2 segundos."); return; }
    if (!caixaAberto) { setAbrirCaixaMotivo(`Para receber a venda de ${det.tutor || "o cliente"}`); return; }
    const valor = Number(det.aberto || det.valor || 0);
    if (!confirm(`Receber a venda de ${det.tutor} em ${forma}? (${fmtBRL(valor)})`)) return;
    setBaixando(true);
    try {
      const res = await fetch(`/api/caixa/${caixaAberto}/recebimento`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ appointmentId: det.id, valorTotal: valor, desconto: 0, troco: 0, formas: [{ forma, valor }] }),
      });
      const dd = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dd?.message || "Erro ao baixar");
      setDet(null); load();
    } catch (e: any) { alert(e?.message || "Erro ao receber a venda."); }
    finally { setBaixando(false); }
  };

  // 1B — agrupa comandas abertas por cliente (uma linha por cliente; baixa tudo junto)
  // Venda lançada com data pra frente sai da lista principal e vai pra faixa "a cobrar em breve"
  // (antes ela sumia da tela — ninguém cobrava). O backend marca com `futura`.
  const agora = useMemo(() => comandas.filter((c: any) => !c.futura), [comandas]);
  const futuras = useMemo(
    () => comandas.filter((c: any) => c.futura).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [comandas],
  );
  const grupos = useMemo(() => {
    const m = new Map<string, any>();
    for (const c of agora) {
      const key = c.tutorId || c.tutor || c.id;
      if (!m.has(key)) m.set(key, { key, tutor: c.tutor, petSpecies: c.petSpecies, comandas: [] as any[], total: 0 });
      const g = m.get(key); g.comandas.push(c); g.total += Number(c.aberto || c.valor || 0);
    }
    return [...m.values()];
  }, [agora]);

  const baixarGrupo = async () => {
    if (!detGrupo) return;
    if (!meId) { alert("Só um instante — ainda estou identificando o seu usuário. Tente de novo em 2 segundos."); return; }
    if (!caixaAberto) { setAbrirCaixaMotivo(`Para receber as vendas de ${detGrupo.tutor || "o cliente"}`); return; }
    if (!confirm(`Receber TODAS as ${detGrupo.comandas.length} vendas de ${detGrupo.tutor} em ${forma}? (${fmtBRL(detGrupo.total)})`)) return;
    setBaixando(true);
    try {
      // Cartao exige operadora + NSU + AUT: e' o que casa a venda com a linha do extrato.
      const falta = validarPagamentosCartao(formasLote.filter((f) => Number(f.valor) > 0), formasConfig);
      if (falta) { alert(falta); setBaixando(false); return; }
      const res = await fetch(`/api/caixa/${caixaAberto}/recebimento-lote`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          appointmentIds: detGrupo.comandas.map((c: any) => c.id),
          formas: formasLote.filter((f) => Number(f.valor) > 0),
        }),
      });
      const dd = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dd?.message || "Erro ao receber");
      // O servidor valida tudo ANTES de gravar; se ainda assim algo falhar, ele diz o que.
      if (Array.isArray(dd?.falhou) && dd.falhou.length) {
        alert(`Recebi ${dd.quitadas} de ${dd.comandas} comanda(s). Nao consegui: ${dd.falhou.length}. Confira a lista antes de tentar de novo.`);
      } else {
        const resto = Number(dd?.restanteEmAberto || 0);
        alert(resto > 0.009
          ? `Recebido ${fmtBRL(dd.valorRecebido)}. Ainda em aberto: ${fmtBRL(resto)}.`
          : `Recebido ${fmtBRL(dd.valorRecebido)} — tudo quitado.${Number(dd?.troco) > 0.009 ? ` Troco: ${fmtBRL(dd.troco)}.` : ""}`);
      }
      setDetGrupo(null); setFormasLote([]); load();
    } catch (e: any) { alert(e?.message || "Erro ao receber as vendas."); }
    finally { setBaixando(false); }
  };

  // UMA LINHA da lista. A Cintia pediu lista, nao caixinhas: em cartao cabiam 3 por fileira e
  // ela precisava rolar a tela inteira pra conferir os valores de um dia. Aqui cabe tudo junto,
  // com o valor sempre na mesma coluna — que e o que se le de cima a baixo.
  const linhaComanda = (c: any, agrupada = false) => {
    const org = ORIGEM[c.origem] || ORIGEM.VENDA;
    return (
      <tr key={c.id} className="hover:bg-[#FAFAF7]" style={{ borderTop: "1px solid #F0EBE0" }}>
        {agrupada ? (
          <td className="px-3 py-2.5 text-[12.5px] text-[#5C6B70] truncate" colSpan={2} style={{ paddingLeft: 34 }}>
            ↳ {c.pet || "—"}{c.vet ? ` · ${c.vet}` : ""}
          </td>
        ) : (
          <>
            <td className="px-3 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base flex-shrink-0">{especieEmoji(c.petSpecies)}</span>
                <span className="text-[13px] font-medium text-[#014D5E] truncate">{c.tutor}</span>
              </div>
            </td>
            <td className="px-3 py-2.5 text-[12.5px] text-[#5C6B70] truncate">{c.pet || "—"}{c.vet ? ` · ${c.vet}` : ""}</td>
          </>
        )}
        <td className="px-3 py-2.5">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: org.bg, color: org.fg }}>{org.lbl}</span>
        </td>
        <td className="px-3 py-2.5 text-right text-[13.5px] font-medium text-[#014D5E] tabular-nums whitespace-nowrap">{money(Number(c.aberto || c.valor || 0))}</td>
        <td className="px-3 py-2.5 text-[11.5px] text-[#374151] whitespace-nowrap">{tempoDe(c.date)}</td>
        <td className="px-3 py-2.5">
          <div className="flex gap-1.5 justify-end flex-nowrap">
            <Link href={`/dashboard/erp/ponto-de-venda?editar=${c.id}`} title="Abrir esta venda no formulário do Ponto de venda" className="text-[11.5px] font-medium text-[#00798A] border border-[#009AAC] px-2.5 py-1 rounded-lg whitespace-nowrap">✏️ Editar</Link>
            <button onClick={() => abrir(c)} className="text-[11.5px] font-medium text-[#00798A] bg-[#E0F4F6] px-2.5 py-1 rounded-lg whitespace-nowrap">Abrir</button>
            <button onClick={() => abrir(c)} className="text-[11.5px] font-medium text-white bg-[#009AAC] px-2.5 py-1 rounded-lg whitespace-nowrap">💰 Baixar</button>
          </div>
        </td>
      </tr>
    );
  };

  // Relatorio de cobranca: leva as futuras junto — elas tambem estao em aberto, e quem
  // cobra precisa ver a conta inteira do cliente, nao so o que ja venceu.
  const relatorio = () => {
    const lista = [...agora, ...futuras];
    const nomes = [...new Set(lista.map((c: any) => c.tutor).filter(Boolean))];
    const titulo = nomes.length === 1 ? String(nomes[0]) : (busca.trim() ? `Busca: ${busca.trim()}` : "Todos os clientes");
    imprimirVendasAbertas(titulo, lista as any);
  };

  return (
    <div className="p-6 w-full">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="text-[13px] text-[#374151]">
          {buscando ? "buscando…" : `${agora.length} venda(s) em aberto`}
          {busca.trim() && !buscando ? <span className="text-[#00798A]"> · filtrando por “{busca.trim()}”</span> : null}
          {meuCaixa ? ` · ${rotuloCaixa(meuCaixa)}` : (meId ? " · ⚠️ você não tem caixa aberto" : "")}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente ou pet..."
              className="text-[12.5px] bg-white border rounded-lg pl-8 pr-7 py-1.5 w-[230px] outline-none focus:border-[#009AAC]"
              style={{ borderColor: "#E8E2D6", color: "#014D5E" }}
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[#9aa0a8]">🔍</span>
            {busca && (
              <button onClick={() => setBusca("")} title="Limpar busca" className="absolute right-2 top-1/2 -translate-y-1/2 text-[13px] text-[#9aa0a8] leading-none">✕</button>
            )}
          </div>
          <button
            onClick={relatorio}
            disabled={agora.length + futuras.length === 0}
            className="text-[12px] font-medium text-[#5C6B70] bg-white border px-3 py-1.5 rounded-lg disabled:opacity-45"
            style={{ borderColor: "#E8E2D6" }}
          >🖨️ Relatório</button>
          <button onClick={() => setOlho((v) => !v)} className="text-[12px] font-medium text-[#5C6B70] bg-white border px-3 py-1.5 rounded-lg" style={{ borderColor: "#E8E2D6" }}>{olho ? "🙈 Ocultar valores" : "👁️ Mostrar valores"}</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { l: "🟡 Vendas em aberto", v: String(agora.length), plain: true },
          { l: "💰 Em aberto", v: money(emAberto) },
          { l: "✅ Baixado hoje", v: money(baixadoHoje) },
        ].map((k) => (
          <div key={k.l} className="bg-white border rounded-xl px-4 py-3" style={{ borderColor: "#E8E2D6" }}>
            <div className="text-[10.5px] text-[#374151] uppercase tracking-wide">{k.l}</div>
            <div className="mt-1 text-[22px] font-medium text-[#014D5E] tabular-nums">{k.v}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="px-6 py-16 text-center text-sm text-[#374151]">Carregando...</div>
      ) : agora.length === 0 && futuras.length === 0 ? (
        <div className="bg-white border rounded-[14px] px-6 py-14 text-center" style={{ borderColor: "#E8E2D6" }}>
          <div className="text-3xl mb-2">{busca.trim() ? "🔍" : "🛎️"}</div>
          <div className="text-sm text-[#5C6B70]">
            {busca.trim() ? `Nenhuma venda em aberto para “${busca.trim()}”.` : "Nenhuma venda em aberto no momento."}
          </div>
          <div className="text-[12px] text-[#374151] mt-1">
            {busca.trim() ? "A busca procura por nome do cliente ou do pet, no sistema inteiro." : "Vendas de consulta e balcão aparecem aqui até serem recebidas no caixa."}
          </div>
          {busca.trim() ? <button onClick={() => setBusca("")} className="mt-3 text-[12px] font-medium text-[#00798A] bg-[#E0F4F6] px-3 py-1.5 rounded-lg">Limpar busca</button> : null}
        </div>
      ) : (
        <div className="bg-white border rounded-[14px] overflow-hidden" style={{ borderColor: "#E8E2D6" }}>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wide text-[#5C6B70]" style={{ background: "#FBF9F4" }}>
                  <th className="px-3 py-2 text-left font-medium">Cliente</th>
                  <th className="px-3 py-2 text-left font-medium">Pet</th>
                  <th className="px-3 py-2 text-left font-medium">Origem</th>
                  <th className="px-3 py-2 text-right font-medium">Valor</th>
                  <th className="px-3 py-2 text-left font-medium">Aberta</th>
                  <th className="px-3 py-2 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {grupos.map((g) => {
                  // Cliente com UMA venda: uma linha e pronto.
                  if (g.comandas.length === 1) return linhaComanda(g.comandas[0]);
                  // Cliente com 2+ vendas: uma linha-titulo com o total e o "baixar tudo", e as
                  // vendas dele logo abaixo, recuadas. Baixar tudo de uma vez continua existindo —
                  // era a unica coisa boa que o cartao agrupado tinha.
                  const aberto = gruposAbertos.has(g.key);
                  return (
                    <Fragment key={g.key}>
                      <tr onClick={() => alternarGrupo(g.key)} title={aberto ? "Fechar as vendas deste cliente" : "Ver as vendas deste cliente"} className="cursor-pointer hover:bg-[#EAF7F8]" style={{ borderTop: "1px solid #E8E2D6", background: "#F2FBFC" }}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[#00798A] text-[11px] w-3 flex-shrink-0">{aberto ? "▾" : "▸"}</span>
                            <span className="text-base flex-shrink-0">{especieEmoji(g.petSpecies)}</span>
                            <span className="text-[13px] font-medium text-[#014D5E] truncate">{g.tutor}</span>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0" style={{ background: "#E0F4F6", color: "#00707E" }}>🧾 {g.comandas.length}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-[11.5px] text-[#374151]" colSpan={2}>{g.comandas.length} vendas em aberto · <span className="text-[#00798A]">{aberto ? "clique pra fechar" : "clique pra ver"}</span></td>
                        <td className="px-3 py-2 text-right text-[13.5px] font-medium text-[#014D5E] tabular-nums whitespace-nowrap">{money(g.total)}</td>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={(e) => { e.stopPropagation(); setFormasLote([{ forma: "Dinheiro", valor: Number(g.total.toFixed(2)) }]); setDetGrupo(g); }} className="text-[11.5px] font-medium text-white bg-[#009AAC] px-2.5 py-1 rounded-lg whitespace-nowrap">💰 Baixar tudo</button>
                        </td>
                      </tr>
                      {aberto && g.comandas.map((c: any) => linhaComanda(c, true))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== A COBRAR EM BREVE — venda lançada com data pra frente ===== */}
      {futuras.length > 0 && (
        <div className="mt-6">
          <div className="flex items-baseline gap-2 mb-2">
            <h2 className="text-[13px] font-medium text-[#014D5E]">🗓️ A cobrar em breve</h2>
            <span className="text-[11.5px] text-[#374151]">{futuras.length} venda(s) com data pra frente · {money(futuras.reduce((s: number, c: any) => s + Number(c.aberto || c.valor || 0), 0))}</span>
          </div>
          <div className="bg-white border rounded-[13px] divide-y" style={{ borderColor: "#E8E2D6" }}>
            {futuras.map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-lg">{especieEmoji(c.petSpecies)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-[#014D5E] truncate">{c.tutor}<span className="text-[11px] text-[#374151]"> · {c.pet || "—"}</span></div>
                  <div className="text-[11px] text-[#374151]">{new Date(c.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</div>
                </div>
                <div className="text-[14px] text-[#014D5E] tabular-nums">{money(Number(c.aberto || c.valor || 0))}</div>
                <button onClick={() => abrir(c)} className="text-[11.5px] font-medium text-[#00798A] bg-[#E0F4F6] px-3 py-1.5 rounded-lg">Abrir</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== VENDA (por dentro) ===== */}
      {det && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50" {...fundoDeModal(() => setDet(null))}>
          <div className="rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D6" }}>
              <div>
                <h3 className="text-base font-medium text-[#014D5E]">{especieEmoji(det.petSpecies)} {det.tutor} <span className="text-[12px] text-[#374151] font-normal">· {det.pet}</span></h3>
                <div className="text-[11px] text-[#374151] mt-0.5">{(ORIGEM[det.origem] || ORIGEM.VENDA).lbl} · aberta {tempoDe(det.date)}</div>
              </div>
              <button onClick={() => setDet(null)} className="text-[#374151] text-lg leading-none">✕</button>
            </div>

            <div className="p-0">
              {detLoading ? (
                <div className="px-5 py-6 text-center text-[12.5px] text-[#374151]">Carregando itens...</div>
              ) : detItens.length === 0 ? (
                <div className="px-5 py-5 text-[12.5px] text-[#374151]">Sem itens detalhados nesta venda.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[12.5px]">
                    <thead><tr className="text-[10px] text-[#374151] uppercase tracking-wide">
                      <th className="text-left font-medium px-5 py-2">Item</th><th className="text-left font-medium px-2 py-2">Profissional</th><th className="text-right font-medium px-2 py-2">Qtd</th><th className="text-right font-medium px-5 py-2">Valor</th>
                    </tr></thead>
                    <tbody>
                      {detItens.map((it, i) => (
                        <tr key={i} className="border-t" style={{ borderColor: "#F0EBE0" }}>
                          <td className="px-5 py-2 text-[#1F2A2E]">{it.descricao || it.servico?.nome || "Item"}</td>
                          <td className="px-2 py-2 text-[#5C6B70] whitespace-nowrap">{it.executorUser?.name || "—"}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{it.quantidade ?? 1}</td>
                          <td className="px-5 py-2 text-right tabular-nums">{money(Number(it.valorUnitario ?? it.servico?.valorPadrao ?? 0) * (Number(it.quantidade) || 1))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center px-5 py-3 border-t" style={{ borderColor: "#F0EBE0" }}>
              <span className="text-[13px] text-[#5C6B70]">Total a receber</span>
              <span className="text-[18px] font-medium text-[#014D5E] tabular-nums">{money(Number(det.aberto || det.valor || 0))}</span>
            </div>

            {/* EM QUAL CAIXA ESTA BAIXA ENTRA. Fica FORA do `caixaAberto ?` de proposito: quando
                a pessoa nao tem caixa de hoje mas tem um de outro dia reaberto, e esta faixa
                que descobre isso e destrava o recebimento. Some sozinha quando so ha um caixa. */}
            <div className="px-5 pt-3">
              <EscolhaDoCaixa meusAbertos={meusAbertos} dataDaVenda={det.date} valor={caixaAberto} onEscolher={setCaixaAberto} />
            </div>

            {caixaAberto ? (
              <>
                <div className="px-5 py-3 border-t" style={{ borderColor: "#F0EBE0" }}>
                  <div className="text-[10.5px] text-[#374151] uppercase tracking-wide mb-2">Forma de recebimento</div>
                  <div className="flex gap-2 flex-wrap">
                    {formasList.map((f) => (
                      <button key={f} onClick={() => setForma(f)} className="text-[12px] px-3 py-1.5 rounded-full border" style={forma === f ? { background: "#E0F4F6", borderColor: "#009AAC", color: "#014D5E" } : { background: "#fff", borderColor: "#E8E2D6", color: "#5C6B70" }}>{f}</button>
                    ))}
                  </div>
                </div>
                <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#E8E2D6" }}>
                  <button onClick={() => setDet(null)} className="px-4 py-2 text-[13px] text-[#5C6B70] bg-white border rounded-lg" style={{ borderColor: "#E8E2D6" }}>Fechar</button>
                  <button onClick={baixar} disabled={baixando} className="px-5 py-2 text-[13px] font-medium text-white bg-[#009AAC] rounded-lg disabled:opacity-60">{baixando ? "Baixando..." : "💰 Registrar recebimento"}</button>
                </div>
              </>
            ) : (
              <div className="px-5 py-4 border-t" style={{ borderColor: "#E8E2D6" }}>
                <div className="text-[12.5px] text-[#b23b39] bg-[#FDECEC] border rounded-lg px-3 py-2" style={{ borderColor: "#F3D2D0" }}>⚠️ Não há caixa aberto. Abra um caixa em <b>Vendas → Caixa</b> para poder receber.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== GRUPO (baixar todas as comandas do cliente) ===== */}
      {detGrupo && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50" {...fundoDeModal(() => setDetGrupo(null))}>
          <div className="rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D6" }}>
              <div>
                <h3 className="text-base font-medium text-[#014D5E]">{especieEmoji(detGrupo.petSpecies)} {detGrupo.tutor}</h3>
                <div className="text-[11px] text-[#374151] mt-0.5">{detGrupo.comandas.length} comandas abertas · baixar tudo junto</div>
              </div>
              <button onClick={() => setDetGrupo(null)} className="text-[#374151] text-lg leading-none">✕</button>
            </div>
            <div className="px-5 py-3">
              {detGrupo.comandas.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-1.5 border-b last:border-b-0 text-[12.5px]" style={{ borderColor: "#F0EBE0" }}>
                  <span className="text-[#5C6B70] truncate">{(ORIGEM[c.origem] || ORIGEM.VENDA).lbl} · {c.pet || "—"}</span>
                  <span className="text-[#1F2A2E] tabular-nums flex-shrink-0 ml-2">{money(Number(c.aberto || c.valor || 0))}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center px-5 py-3 border-t" style={{ borderColor: "#F0EBE0" }}>
              <span className="text-[13px] text-[#5C6B70]">Total a receber</span>
              <span className="text-[18px] font-medium text-[#014D5E] tabular-nums">{money(detGrupo.total)}</span>
            </div>
            {/* EM QUAL CAIXA ESTA BAIXA ENTRA. Fica FORA do `caixaAberto ?` de proposito: quando
                a pessoa nao tem caixa de hoje mas tem um de outro dia reaberto, e esta faixa
                que descobre isso e destrava o recebimento. Some sozinha quando so ha um caixa. */}
            <div className="px-5 pt-3">
              <EscolhaDoCaixa meusAbertos={meusAbertos} dataDaVenda={detGrupo.comandas.map((c: any) => c.date).sort()[0] || null} valor={caixaAberto} onEscolher={setCaixaAberto} />
            </div>

            {caixaAberto ? (
              <>
                <div className="px-5 py-3 border-t" style={{ borderColor: "#F0EBE0" }}>
                  <div className="text-[10.5px] text-[#374151] uppercase tracking-wide mb-2">
                    Como o cliente pagou — pode dividir entre formas
                  </div>
                  <PagamentoFormas formas={formasLote} onChange={setFormasLote} formasList={formasList} formasConfig={formasConfig} taxas={taxas} />
                  {(() => {
                    const pago = formasLote.reduce((sm, f) => sm + Number(f.valor || 0), 0);
                    const falta = detGrupo.total - pago;
                    if (Math.abs(falta) < 0.01) return <div className="mt-2 text-[12px] font-medium text-[#0F6E56]">✓ Fecha certo com o total.</div>;
                    return falta > 0
                      ? <div className="mt-2 text-[12px] text-[#b23b39]">Falta lançar {money(falta)} — o que sobrar em aberto continua na lista, da comanda mais nova.</div>
                      : <div className="mt-2 text-[12px] text-[#8a6400]">Passou {money(-falta)} do total — sai como troco.</div>;
                  })()}
                </div>
                <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#E8E2D6" }}>
                  <button onClick={() => setDetGrupo(null)} className="px-4 py-2 text-[13px] text-[#5C6B70] bg-white border rounded-lg" style={{ borderColor: "#E8E2D6" }}>Fechar</button>
                  <button
                    onClick={baixarGrupo}
                    disabled={baixando || formasLote.reduce((sm, f) => sm + Number(f.valor || 0), 0) <= 0.009}
                    className="px-5 py-2 text-[13px] font-medium text-white bg-[#009AAC] rounded-lg disabled:opacity-60"
                  >{baixando ? "Recebendo..." : "💰 Receber num pagamento só"}</button>
                </div>
              </>
            ) : (
              <div className="px-5 py-4 border-t" style={{ borderColor: "#E8E2D6" }}>
                <div className="text-[12.5px] text-[#b23b39] bg-[#FDECEC] border rounded-lg px-3 py-2" style={{ borderColor: "#F3D2D0" }}>
                  {caixaUsado?.erro || "Você não tem caixa aberto."}
                  <button onClick={() => setAbrirCaixaMotivo("Para receber esta venda")} className="ml-2 underline font-semibold" style={{ color: "#0E7C86" }}>Abrir o meu caixa</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {abrirCaixaMotivo !== null && (
        <AbrirMeuCaixaModal
          motivo={abrirCaixaMotivo}
          onClose={() => setAbrirCaixaMotivo(null)}
          onAberto={(c) => { setMeuCaixa(c); setCaixaAberto(c.id); setCaixaUsado({ caixa: c }); }}
        />
      )}
    </div>
  );
}
