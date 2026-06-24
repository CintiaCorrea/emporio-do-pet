// DESTINO: vet-crm/app/(user)/dashboard/erp/ponto-de-venda/page.tsx
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';
import { LuSearch, LuPlus, LuTrash2, LuUser, LuShoppingCart, LuCheck } from 'react-icons/lu';

const TEAL = '#009AAC';
const TEAL_DARK = '#014D5E';
const GREEN = '#0f6e56';
const ORANGE = '#D85A30';
const LINE = '#e6eaed';

interface Pet { id: string; name: string }
interface Tutor { id: string; name: string; pets?: Pet[] }
interface Servico { id: string; nome: string; valorPadrao?: number | null; category?: { nome: string } | null }
interface CartItem { servicoId?: string; descricao: string; quantidade: number; valorUnitario: number; desconto: number }
interface Forma { forma: string; valor: number }

const FORMAS = ['Dinheiro', 'Pix', 'Cartão crédito', 'Cartão débito', 'Crédito do pet'];
const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(v) ? v : 0);
const num = (s: any) => Number(String(s).replace(',', '.')) || 0;
const inp: React.CSSProperties = { padding: '9px 10px', border: '1px solid #d7e0e2', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' };

export default function PDVPage() {
  usePageTitle('Ponto de venda', 'Registrar venda e recebimento no caixa');

  const [cliBusca, setCliBusca] = useState('');
  const [cliRes, setCliRes] = useState<Tutor[]>([]);
  const [cliAberto, setCliAberto] = useState(false);
  const [cliente, setCliente] = useState<Tutor | null>(null);
  const [petId, setPetId] = useState('');

  const [servicos, setServicos] = useState<Servico[]>([]);
  const [itemBusca, setItemBusca] = useState('');
  const [carrinho, setCarrinho] = useState<CartItem[]>([]);
  const [descontoGlobal, setDescontoGlobal] = useState('');
  const [formas, setFormas] = useState<Forma[]>([{ forma: 'Dinheiro', valor: 0 }]);
  const [obs, setObs] = useState('');
  const [finalizando, setFinalizando] = useState(false);
  const buscaTimer = useRef<any>(null);

  // catálogo de serviços (uma vez)
  useEffect(() => {
    (async () => {
      try { const r = await fetch('/api/servicos/itens', { cache: 'no-store' }); if (r.ok) setServicos(await r.json()); } catch { /* */ }
    })();
  }, []);

  // busca de clientes (debounce)
  useEffect(() => {
    if (buscaTimer.current) clearTimeout(buscaTimer.current);
    if (cliBusca.trim().length < 2) { setCliRes([]); return; }
    buscaTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/tutors?search=${encodeURIComponent(cliBusca.trim())}&take=8`, { cache: 'no-store' });
        if (!r.ok) return;
        const d = await r.json();
        setCliRes(d.tutors || d.data || d || []);
        setCliAberto(true);
      } catch { /* */ }
    }, 350);
  }, [cliBusca]);

  const selecionarCliente = (t: Tutor) => {
    setCliente(t); setCliAberto(false); setCliBusca('');
    const pets = t.pets || [];
    setPetId(pets.length === 1 ? pets[0].id : '');
  };

  const itensFiltrados = useMemo(() => {
    const q = itemBusca.trim().toLowerCase();
    if (!q) return servicos.slice(0, 30);
    return servicos.filter((s) => (s.nome || '').toLowerCase().includes(q)).slice(0, 30);
  }, [servicos, itemBusca]);

  const addItem = (s: Servico) => {
    setCarrinho((c) => {
      const i = c.findIndex((x) => x.servicoId === s.id);
      if (i >= 0) { const cp = [...c]; cp[i] = { ...cp[i], quantidade: cp[i].quantidade + 1 }; return cp; }
      return [...c, { servicoId: s.id, descricao: s.nome, quantidade: 1, valorUnitario: Number(s.valorPadrao || 0), desconto: 0 }];
    });
  };
  const addAvulso = () => setCarrinho((c) => [...c, { descricao: '', quantidade: 1, valorUnitario: 0, desconto: 0 }]);
  const updItem = (i: number, patch: Partial<CartItem>) => setCarrinho((c) => c.map((x, j) => j === i ? { ...x, ...patch } : x));
  const rmItem = (i: number) => setCarrinho((c) => c.filter((_, j) => j !== i));

  const itemTotal = (it: CartItem) => Math.max(0, it.quantidade * it.valorUnitario - it.desconto);
  const subtotal = useMemo(() => carrinho.reduce((s, it) => s + itemTotal(it), 0), [carrinho]);
  const total = useMemo(() => Math.max(0, subtotal - num(descontoGlobal)), [subtotal, descontoGlobal]);
  const somaFormas = useMemo(() => formas.reduce((s, f) => s + Number(f.valor || 0), 0), [formas]);
  const temDinheiro = formas.some((f) => /dinheiro/i.test(f.forma));
  const troco = temDinheiro && somaFormas > total ? somaFormas - total : 0;
  const pago = Math.max(0, somaFormas - troco);
  const restante = Math.max(0, total - pago);

  const pets = cliente?.pets || [];
  const podeFinalizar = !!cliente && !!petId && carrinho.length > 0 && carrinho.every((it) => it.descricao.trim() && it.valorUnitario >= 0) && !finalizando;

  const preencherPagamento = () => setFormas((f) => f.length === 1 ? [{ ...f[0], valor: Number(total.toFixed(2)) }] : f);

  const finalizar = async () => {
    if (!podeFinalizar) return;
    setFinalizando(true);
    try {
      const r = await fetch('/api/caixa/pdv', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutorId: cliente!.id, petId,
          itens: carrinho.map((it) => ({ servicoId: it.servicoId, descricao: it.descricao, quantidade: it.quantidade, valorUnitario: it.valorUnitario, desconto: it.desconto })),
          desconto: num(descontoGlobal),
          formas: formas.filter((f) => Number(f.valor) > 0),
          observacao: obs || null,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || 'Erro ao finalizar venda');
      toast.success(`Venda registrada! ${brl(d.valorVenda || total)}${d.troco ? ' · troco ' + brl(d.troco) : ''}`);
      setCliente(null); setPetId(''); setCarrinho([]); setDescontoGlobal(''); setFormas([{ forma: 'Dinheiro', valor: 0 }]); setObs('');
    } catch (e: any) { toast.error(e.message || 'Erro ao finalizar venda'); } finally { setFinalizando(false); }
  };

  const card: React.CSSProperties = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 11, padding: 16 };
  const h = (t: string) => <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#1f2d33' }}>{t}</div>;

  return (
    <div style={{ width: '100%', background: '#f7f9fa', minHeight: '100%' }}>
      <div style={{ width: '100%', padding: '20px 26px 60px', boxSizing: 'border-box', display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* ESQUERDA: cliente + itens */}
        <div style={{ flex: '1 1 460px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={card}>
            {h('1. Cliente e pet')}
            {!cliente ? (
              <div style={{ position: 'relative' }}>
                <LuSearch size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
                <input value={cliBusca} onChange={(e) => setCliBusca(e.target.value)} placeholder="Buscar cliente por nome, telefone ou e-mail…" style={{ ...inp, width: '100%', paddingLeft: 32 }} />
                {cliAberto && cliRes.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: 4, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, boxShadow: '0 8px 24px -6px rgba(0,0,0,.15)', maxHeight: 260, overflowY: 'auto' }}>
                    {cliRes.map((t) => (
                      <button key={t.id} onClick={() => selecionarCliente(t)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none', borderBottom: '1px solid #f1f5f6', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                        <span style={{ color: '#1f2d33' }}>{t.name}</span>
                        <span style={{ color: '#94a3b8', fontSize: 11.5 }}> · {(t.pets || []).length} pet(s)</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: '#f8fafb', borderRadius: 8, padding: '9px 12px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: '#1f2d33', fontWeight: 500 }}><LuUser size={15} color={TEAL} /> {cliente.name}</span>
                  <button onClick={() => { setCliente(null); setPetId(''); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 12 }}>trocar</button>
                </div>
                <div style={{ marginTop: 10 }}>
                  <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 5 }}>Pet</label>
                  {pets.length === 0 ? (
                    <p style={{ fontSize: 12.5, color: ORANGE }}>Este cliente não tem pets cadastrados.</p>
                  ) : (
                    <select value={petId} onChange={(e) => setPetId(e.target.value)} style={{ ...inp, width: '100%' }}>
                      <option value="">Selecione o pet…</option>
                      {pets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={card}>
            {h('2. Itens')}
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <LuSearch size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
              <input value={itemBusca} onChange={(e) => setItemBusca(e.target.value)} placeholder="Buscar serviço/produto…" style={{ ...inp, width: '100%', paddingLeft: 32 }} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 168, overflowY: 'auto' }}>
              {itensFiltrados.map((s) => (
                <button key={s.id} onClick={() => addItem(s)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 10px', borderRadius: 8, border: `1px solid ${LINE}`, background: '#fff', cursor: 'pointer', color: '#1f2d33' }}>
                  <LuPlus size={12} color={TEAL} /> {s.nome} <span style={{ color: '#94a3b8' }}>{brl(Number(s.valorPadrao || 0))}</span>
                </button>
              ))}
            </div>
            <button onClick={addAvulso} style={{ marginTop: 10, border: 'none', background: 'none', color: TEAL, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}><LuPlus size={13} /> item avulso (digitar)</button>
          </div>
        </div>

        {/* DIREITA: carrinho + pagamento */}
        <div style={{ width: 400, flex: '1 1 360px', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#1f2d33', display: 'flex', alignItems: 'center', gap: 7 }}><LuShoppingCart size={15} color={TEAL} /> Carrinho</div>
            {carrinho.length === 0 && <p style={{ fontSize: 12.5, color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>Nenhum item adicionado.</p>}
            {carrinho.map((it, i) => (
              <div key={i} style={{ borderBottom: '1px solid #f1f5f6', padding: '8px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <input value={it.descricao} onChange={(e) => updItem(i, { descricao: e.target.value })} placeholder="Descrição" style={{ ...inp, flex: 1, padding: '6px 8px' }} />
                  <button onClick={() => rmItem(i)} style={{ border: 'none', background: 'none', cursor: 'pointer' }} title="Remover"><LuTrash2 size={14} color="#b0408a" /></button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="number" min={1} value={it.quantidade} onChange={(e) => updItem(i, { quantidade: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} title="Qtd" style={{ ...inp, width: 52, padding: '6px 6px', textAlign: 'center' }} />
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>×</span>
                  <input value={it.valorUnitario || ''} inputMode="decimal" placeholder="Unit." onChange={(e) => updItem(i, { valorUnitario: num(e.target.value) })} title="Valor unitário" style={{ ...inp, flex: 1, padding: '6px 8px' }} />
                  <input value={it.desconto || ''} inputMode="decimal" placeholder="Desc." onChange={(e) => updItem(i, { desconto: num(e.target.value) })} title="Desconto" style={{ ...inp, width: 70, padding: '6px 8px' }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: TEAL_DARK, minWidth: 72, textAlign: 'right' }}>{brl(itemTotal(it))}</span>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              <span style={{ fontSize: 12.5, color: '#475569' }}>Desconto na venda</span>
              <input value={descontoGlobal} inputMode="decimal" placeholder="0,00" onChange={(e) => setDescontoGlobal(e.target.value)} style={{ ...inp, width: 110, textAlign: 'right' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid #d7e0e2' }}>
              <span style={{ fontWeight: 600 }}>Total</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: TEAL_DARK }}>{brl(total)}</span>
            </div>
          </div>

          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              {h('Pagamento')}
              <button onClick={preencherPagamento} style={{ border: 'none', background: 'none', color: TEAL, fontSize: 11.5, fontWeight: 500, cursor: 'pointer' }}>preencher total</button>
            </div>
            {formas.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <select value={f.forma} onChange={(e) => setFormas(formas.map((x, j) => j === i ? { ...x, forma: e.target.value } : x))} style={{ ...inp, flex: 1.3, padding: '7px 8px' }}>{FORMAS.map((op) => <option key={op} value={op}>{op}</option>)}</select>
                <input value={f.valor || ''} inputMode="decimal" placeholder="R$" onChange={(e) => setFormas(formas.map((x, j) => j === i ? { ...x, valor: num(e.target.value) } : x))} style={{ ...inp, flex: 1, padding: '7px 8px' }} />
                {formas.length > 1 && <button onClick={() => setFormas(formas.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><LuTrash2 size={14} color="#94a3b8" /></button>}
              </div>
            ))}
            <button onClick={() => setFormas([...formas, { forma: 'Pix', valor: 0 }])} style={{ border: 'none', background: 'none', color: TEAL, fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}><LuPlus size={13} /> outra forma</button>

            <div style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.9 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Pago</span><b>{brl(pago)}</b></div>
              {troco > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Troco</span><b style={{ color: GREEN }}>{brl(troco)}</b></div>}
              {restante > 0.001 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Saldo a receber</span><b style={{ color: ORANGE }}>{brl(restante)}</b></div>}
            </div>

            <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observação (opcional)" style={{ ...inp, width: '100%', marginTop: 10 }} />

            <button onClick={finalizar} disabled={!podeFinalizar} style={{ width: '100%', marginTop: 12, background: podeFinalizar ? TEAL : '#cbd5d8', color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, padding: '12px', borderRadius: 10, cursor: podeFinalizar ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <LuCheck size={17} /> {finalizando ? 'Registrando…' : 'Finalizar venda'}
            </button>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '8px 0 0', textAlign: 'center' }}>A venda entra no caixa aberto. Abra o caixa antes de vender.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
