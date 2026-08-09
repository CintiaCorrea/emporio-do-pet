'use client';
// Estoque — repaginado no padrão Base44 (largura cheia, paleta #009AAC/#014D5E/#E8DFC8).
// Mantém toda a lógica: entrada/saída, custo médio, histórico por produto.
// Novos: 🖨️ Imprimir + filtro de PERÍODO nas movimentações (painel e histórico).

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';
import { usePodeEditar } from '@/lib/permissions/context';
import { useCanSeeCost } from '@/lib/permissions/useCanSeeCost';

// Tipos
type ProductType = 'MEDICINE' | 'VACCINE';
type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

interface Product {
  id: string;
  name: string;
  type: ProductType;
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  date: string;
  user: string;
  userId?: string;
  userName?: string;
}

interface ApiProduct {
  id: string;
  name: string;
  type: ProductType;
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
  _count: { treatments: number };
}

const TYPE_PILL: Record<string, { bg: string; fg: string; emoji: string; label: string }> = {
  MEDICINE: { bg: '#E6F1FB', fg: '#0C447C', emoji: '💊', label: 'Medicamento' },
  VACCINE: { bg: '#E7F6EE', fg: '#1c7a47', emoji: '💉', label: 'Vacina' },
};
const stockStyle = (stock: number) =>
  stock === 0 ? { bg: '#FCE9E7', fg: '#b23b39', label: 'Sem estoque' }
  : stock < 10 ? { bg: '#FBF3D9', fg: '#8a6400', label: 'Estoque baixo' }
  : { bg: '#E7F6EE', fg: '#1c7a47', label: 'Normal' };

const CSS = `
.est-page{width:100%;padding:2px 2px 48px}
.est-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:14px}
.est-in{border:1px solid #E8E2D6;border-radius:9px;padding:8px 12px;font-size:13px;background:#fff;color:#1F2A2E;font-family:inherit;min-width:210px;flex:1;max-width:340px}
.est-sel{border:1px solid #E8E2D6;border-radius:9px;padding:8px 12px;font-size:13px;background:#fff;color:#1F2A2E;font-family:inherit}
.est-btn{border:1px solid #E8E2D6;background:#fff;color:#5C6B70;border-radius:9px;padding:8px 12px;font-size:12.5px;cursor:pointer;font-weight:500;display:inline-flex;align-items:center;gap:6px}
.est-btn:hover{border-color:#009AAC;color:#009AAC}
.est-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(158px,1fr));gap:12px;margin-bottom:16px}
.est-card{background:#fff;border:1px solid #E8E2D6;border-radius:14px;padding:14px 16px}
.est-card .lbl{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#5C6B70;font-weight:600;display:flex;align-items:center;gap:6px}
.est-card .val{font-size:22px;font-weight:700;color:#014D5E;margin-top:6px;font-variant-numeric:tabular-nums}
.est-panel{background:#fff;border:1px solid #E8E2D6;border-radius:14px;overflow:hidden;margin-bottom:16px}
.est-ph{padding:11px 15px;border-bottom:1px solid #F0EBE0;font-size:13px;font-weight:600;color:#014D5E;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.est-scroll{overflow-x:auto}
.est-tbl{width:100%;border-collapse:collapse;font-size:13px}
.est-tbl th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;color:#374151;font-weight:600;padding:9px 14px;background:#FBF9F4;white-space:nowrap}
.est-tbl th.r{text-align:right}
.est-tbl td{padding:10px 14px;border-bottom:1px solid #F0EBE0;white-space:nowrap;color:#1F2A2E}
.est-tbl td.r{text-align:right;font-variant-numeric:tabular-nums}
.est-tbl tr:last-child td{border-bottom:0}
.est-pill{font-size:11px;font-weight:600;padding:2px 9px;border-radius:999px;display:inline-flex;align-items:center;gap:4px}
.est-empty{padding:40px;text-align:center;color:#374151;font-size:13px}
.est-mov{padding:11px 15px;border-bottom:1px solid #F0EBE0;display:flex;justify-content:space-between;align-items:center;gap:10px}
.est-mov:last-child{border-bottom:0}
.est-act{border:none;background:none;cursor:pointer;font-size:15px;padding:5px 7px;border-radius:8px;line-height:1}
.est-act:hover{background:#F0EBE0}
.est-datein{border:1px solid #E8E2D6;border-radius:8px;padding:5px 8px;font-size:12px;font-family:inherit;color:#1F2A2E;background:#fff}
.est-print-h{display:none}
@media print{
  .no-print{display:none!important}
  body{background:#fff}
  .est-page{padding:0}
  .est-print-h{display:block;margin-bottom:14px;border-bottom:2px solid #014D5E;padding-bottom:8px}
  .est-card,.est-panel{break-inside:avoid;box-shadow:none}
}
`;

export default function StockPage() {
  usePageTitle('Estoque', 'Controle de estoque de medicamentos e vacinas.');
  const podeEditar = usePodeEditar(); // perfil VISUALIZA = esconde Entrada/Saída
  const canSeeCost = useCanSeeCost(); // custo de compra só p/ ADMIN
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<ProductType | 'all'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'ok'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<'IN' | 'OUT'>('IN');

  // Período das movimentações (painel + histórico)
  const [movDe, setMovDe] = useState('');
  const [movAte, setMovAte] = useState('');
  const [histDe, setHistDe] = useState('');
  const [histAte, setHistAte] = useState('');

  // Form state
  const [movementForm, setMovementForm] = useState({ quantity: 1, reason: '', custoUnitario: '' });
  // #3 — motivos padronizados de saída (configuráveis: lista estoque_motivo_saida; auto-cresce ao digitar "Outro")
  const MOTIVOS_SAIDA_PADRAO = ['Perda / vencimento', 'Avaria / quebra', 'Consumo interno - Cirurgia', 'Consumo interno - Clínica', 'Consumo interno - Exames', 'Consumo interno - Internação', 'Doação', 'Devolução ao fornecedor', 'Uso em atendimento'];
  const [motivosSaida, setMotivosSaida] = useState<string[]>(MOTIVOS_SAIDA_PADRAO);
  const [motivoOutro, setMotivoOutro] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchMovements();
  }, []);

  // #3 — carrega motivos de saída salvos (mescla com os padrões, sem duplicar)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/listas?lista=estoque_motivo_saida', { cache: 'no-store' });
        const d = await r.json();
        const arr = (Array.isArray(d) ? d : (d.itens || d.data || [])).map((i: any) => i.valor).filter(Boolean);
        if (arr.length) setMotivosSaida((prev) => Array.from(new Set([...prev, ...arr])));
      } catch { /* usa os padrões */ }
    })();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append('limit', '1000');
      params.append('excludeService', '1'); // estoque = só itens estocáveis (catálogo unificado)
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (stockFilter === 'low') params.append('lowStock', 'true');

      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) throw new Error('Erro ao carregar produtos');
      const data = await response.json();
      const productsList = (data.products || []).filter((p: any) => p.type !== 'SERVICE');
      const formattedProducts: Product[] = productsList.map((p: ApiProduct) => ({
        id: p.id, name: p.name, type: p.type, price: p.price, stock: p.stock,
        createdAt: p.createdAt, updatedAt: p.updatedAt,
      }));
      setProducts(formattedProducts);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    try {
      const response = await fetch('/api/stock/movements?limit=100');
      if (!response.ok) throw new Error('Erro ao carregar movimentações');
      const data = await response.json();
      const formattedMovements: StockMovement[] = (data.movements || []).map((m: any) => ({
        id: m.id, productId: m.productId, productName: m.productName, type: m.type,
        quantity: m.quantity, previousStock: m.previousStock, newStock: m.newStock,
        reason: m.reason || '', date: m.createdAt,
        user: m.userName || m.user || 'Sistema', userId: m.userId, userName: m.userName,
      }));
      setMovements(formattedMovements);
    } catch (err) {
      console.error('Erro ao carregar movimentações:', err);
    }
  };

  // Filtrar produtos
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || product.type === typeFilter;
    let matchesStock = true;
    if (stockFilter === 'low') matchesStock = product.stock > 0 && product.stock < 10;
    else if (stockFilter === 'out') matchesStock = product.stock === 0;
    else if (stockFilter === 'ok') matchesStock = product.stock >= 10;
    return matchesSearch && matchesType && matchesStock;
  });

  // Estatísticas
  const stats = {
    totalProducts: products.length,
    totalItems: products.reduce((acc, p) => acc + p.stock, 0),
    lowStock: products.filter(p => p.stock > 0 && p.stock < 10).length,
    outOfStock: products.filter(p => p.stock === 0).length,
    totalValue: products.reduce((acc, p) => acc + (p.stock * p.price), 0),
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatDate = (s: string) => new Date(s).toLocaleDateString('pt-BR');
  const formatDateTime = (s: string) => new Date(s).toLocaleString('pt-BR');

  // Período: filtra por data (YYYY-MM-DD, inclusivo)
  const dentroPeriodo = (dateStr: string, de: string, ate: string) => {
    const d = String(dateStr).slice(0, 10);
    if (de && d < de) return false;
    if (ate && d > ate) return false;
    return true;
  };

  // Abrir modal de movimentação
  const openMovementModal = (product: Product, type: 'IN' | 'OUT') => {
    setSelectedProduct(product);
    setMovementType(type);
    setMovementForm({ quantity: 1, reason: '', custoUnitario: '' }); setMotivoOutro(false);
    setIsMovementModalOpen(true);
  };

  // Registrar movimentação
  const handleMovement = async () => {
    if (!selectedProduct || movementForm.quantity <= 0) return;
    const newStock = movementType === 'IN'
      ? selectedProduct.stock + movementForm.quantity
      : selectedProduct.stock - movementForm.quantity;
    if (newStock < 0) {
      setError('Quantidade insuficiente em estoque');
      toast.error('Quantidade insuficiente em estoque');
      return;
    }
    try {
      setError(null);
      const response = await fetch('/api/stock/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          type: movementType,
          quantity: movementForm.quantity,
          reason: movementForm.reason || (movementType === 'IN' ? (movementForm.custoUnitario ? 'Entrada de compra' : 'Entrada de estoque') : 'Saída de estoque'),
          ...(movementType === 'IN' && movementForm.custoUnitario ? { custoUnitario: Number(String(movementForm.custoUnitario).replace(',', '.')) } : {}),
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao registrar movimentação');
      }
      const newMovement = await response.json();
      setProducts(products.map(p =>
        p.id === selectedProduct.id
          ? ({ ...p, stock: newStock, ...(newMovement.novoCustoMedio != null ? { custoPadrao: newMovement.novoCustoMedio } : {}) } as any)
          : p
      ));
      setMovements([{
        id: newMovement.id, productId: newMovement.productId, productName: newMovement.productName,
        type: newMovement.type, quantity: newMovement.quantity, previousStock: newMovement.previousStock,
        newStock: newMovement.newStock, reason: newMovement.reason || '', date: newMovement.createdAt,
        user: newMovement.userName || 'Sistema', userId: newMovement.userId, userName: newMovement.userName,
      }, ...movements]);
      // #3 — se digitou um motivo novo ("Outro"), salva na lista pra aparecer da próxima vez
      if (movementType === 'OUT' && movementForm.reason.trim() && !motivosSaida.includes(movementForm.reason.trim())) {
        const nv = movementForm.reason.trim();
        fetch('/api/listas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lista: 'estoque_motivo_saida', valor: nv }) }).catch(() => {});
        setMotivosSaida((prev) => [...prev, nv]);
      }
      setIsMovementModalOpen(false);
      setSelectedProduct(null);
      setMovementForm({ quantity: 1, reason: '', custoUnitario: '' }); setMotivoOutro(false);
      toast.success(`Movimentação de ${movementType === 'IN' ? 'entrada' : 'saída'} registrada!${newMovement.novoCustoMedio != null ? ` Novo custo médio: R$ ${Number(newMovement.novoCustoMedio).toFixed(2)}` : ''}`);
    } catch (err) {
      console.error('Erro ao registrar movimentação:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Abrir histórico
  const openHistory = async (product: Product) => {
    setSelectedProduct(product);
    setHistDe(''); setHistAte('');
    setIsHistoryModalOpen(true);
    try {
      const response = await fetch(`/api/stock/movements/${product.id}`);
      if (response.ok) {
        const data = await response.json();
        const formattedMovements: StockMovement[] = (data || []).map((m: any) => ({
          id: m.id, productId: m.productId, productName: m.productName, type: m.type,
          quantity: m.quantity, previousStock: m.previousStock, newStock: m.newStock,
          reason: m.reason || '', date: m.createdAt,
          user: m.userName || m.user || 'Sistema', userId: m.userId, userName: m.userName,
        }));
        setMovements(formattedMovements);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    }
  };

  // Movimentações do painel (período) e do produto selecionado (histórico)
  const movimentacoesPainel = movements.filter(m => dentroPeriodo(m.date, movDe, movAte));
  const productMovements = selectedProduct
    ? movements.filter(m => m.productId === selectedProduct.id && dentroPeriodo(m.date, histDe, histAte))
    : [];

  return (
    <div className="est-page">
      <style>{CSS}</style>

      {/* Cabeçalho de impressão */}
      <div className="est-print-h">
        <div style={{ fontSize: 18, fontWeight: 700, color: '#014D5E' }}>Estoque — Empório do Pet</div>
        <div style={{ fontSize: 12, color: '#5C6B70' }}>Emitido em {new Date().toLocaleString('pt-BR')} · {filteredProducts.length} produto(s)</div>
      </div>

      {/* Barra de ações */}
      <div className="est-bar no-print">
        <input className="est-in" placeholder="🔍 Buscar produto…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <select className="est-sel" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value as ProductType | 'all'); fetchProducts(); }}>
          <option value="all">Todos os tipos</option>
          <option value="MEDICINE">Medicamentos</option>
          <option value="VACCINE">Vacinas</option>
        </select>
        <select className="est-sel" value={stockFilter} onChange={(e) => setStockFilter(e.target.value as any)}>
          <option value="all">Todos os status</option>
          <option value="ok">Estoque normal</option>
          <option value="low">Estoque baixo</option>
          <option value="out">Sem estoque</option>
        </select>
        <button className="est-btn" onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')} style={stockFilter === 'low' ? { borderColor: '#8a6400', color: '#8a6400', fontWeight: 600 } : undefined}>⚠️ Alertas</button>
        <div style={{ flex: 1 }} />
        <button className="est-btn" onClick={() => { fetchProducts(); fetchMovements(); toast.success('Dados atualizados!'); }}>↻ Atualizar</button>
        <button className="est-btn" onClick={() => window.print()}>🖨️ Imprimir</button>
      </div>

      {error && (
        <div className="no-print" style={{ marginBottom: 14, padding: '12px 14px', background: '#FCE9E7', border: '1px solid #f0c4be', borderRadius: 12, color: '#b23b39', fontSize: 13 }}>
          {error}
          <button onClick={() => setError(null)} style={{ float: 'right', border: 'none', background: 'none', cursor: 'pointer', color: '#b23b39' }}>✕</button>
        </div>
      )}

      {/* Cards de resumo */}
      <div className="est-cards">
        <div className="est-card"><div className="lbl">📦 Produtos</div><div className="val">{stats.totalProducts}</div></div>
        <div className="est-card"><div className="lbl">🔢 Itens em estoque</div><div className="val">{stats.totalItems}</div></div>
        <div className="est-card"><div className="lbl">⚠️ Estoque baixo</div><div className="val" style={{ color: stats.lowStock ? '#8a6400' : '#014D5E' }}>{stats.lowStock}</div></div>
        <div className="est-card"><div className="lbl">📉 Sem estoque</div><div className="val" style={{ color: stats.outOfStock ? '#b23b39' : '#014D5E' }}>{stats.outOfStock}</div></div>
        <div className="est-card"><div className="lbl">🏬 Valor total</div><div className="val" style={{ fontSize: 18 }}>{formatCurrency(stats.totalValue)}</div></div>
      </div>

      {/* Tabela de produtos */}
      <div className="est-panel">
        <div className="est-ph">
          <span>Controle de estoque</span>
          <span style={{ fontWeight: 400, color: '#5C6B70', fontSize: 12.5 }}>{filteredProducts.length} de {products.length} produto(s)</span>
        </div>
        <div className="est-scroll">
          <table className="est-tbl">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Tipo</th>
                <th className="r">Estoque</th>
                <th>Status</th>
                <th className="r">Valor</th>
                <th className="no-print" style={{ textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="est-empty">Carregando estoque…</td></tr>}
              {!loading && filteredProducts.length === 0 && <tr><td colSpan={6} className="est-empty">Nenhum produto encontrado.</td></tr>}
              {!loading && filteredProducts.map((product) => {
                const tp = TYPE_PILL[product.type] || { bg: '#EEF0EF', fg: '#5C6B70', emoji: '📦', label: product.type };
                const st = stockStyle(product.stock);
                return (
                  <tr key={product.id}>
                    <td style={{ whiteSpace: 'normal', minWidth: 180 }}>
                      <div style={{ fontWeight: 600, color: '#1F2A2E' }}>{product.name}</div>
                      <div style={{ fontSize: 11.5, color: '#5C6B70' }}>{formatCurrency(product.price)} / unidade</div>
                    </td>
                    <td><span className="est-pill" style={{ background: tp.bg, color: tp.fg }}>{tp.emoji} {tp.label}</span></td>
                    <td className="r"><b style={{ color: '#014D5E' }}>{product.stock}</b> <span style={{ color: '#5C6B70', fontSize: 11.5 }}>un.</span></td>
                    <td>
                      <span className="est-pill" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                      {product.updatedAt && <div style={{ fontSize: 11, color: '#5C6B70', marginTop: 2 }}>📅 {formatDate(product.updatedAt)}</div>}
                    </td>
                    <td className="r" style={{ fontWeight: 600, color: '#014D5E' }}>{formatCurrency(product.stock * product.price)}</td>
                    <td className="no-print" style={{ textAlign: 'center' }}>
                      {podeEditar && (
                        <>
                          <button className="est-act" title="Entrada" style={{ color: '#1c7a47' }} onClick={() => openMovementModal(product, 'IN')}>➕</button>
                          <button className="est-act" title="Saída" style={{ color: '#b23b39', opacity: product.stock === 0 ? 0.4 : 1 }} disabled={product.stock === 0} onClick={() => openMovementModal(product, 'OUT')}>➖</button>
                        </>
                      )}
                      <button className="est-act" title="Histórico" style={{ color: '#0C447C' }} onClick={() => openHistory(product)}>🕑</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Movimentações (com período) */}
      <div className="est-panel">
        <div className="est-ph">
          <span>🔄 Movimentações</span>
          <span className="no-print" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 400 }}>
            <span style={{ fontSize: 11.5, color: '#5C6B70' }}>Período:</span>
            <input type="date" className="est-datein" value={movDe} onChange={(e) => setMovDe(e.target.value)} />
            <span style={{ color: '#5C6B70' }}>→</span>
            <input type="date" className="est-datein" value={movAte} onChange={(e) => setMovAte(e.target.value)} />
            {(movDe || movAte) && <button className="est-btn" style={{ padding: '5px 9px' }} onClick={() => { setMovDe(''); setMovAte(''); }}>limpar</button>}
          </span>
        </div>
        <div>
          {movimentacoesPainel.length === 0 ? (
            <div className="est-empty">Nenhuma movimentação{(movDe || movAte) ? ' no período' : ' registrada'}.</div>
          ) : movimentacoesPainel.map((m) => (
            <div key={m.id} className="est-mov">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="est-pill" style={{ background: m.type === 'IN' ? '#E7F6EE' : '#FCE9E7', color: m.type === 'IN' ? '#1c7a47' : '#b23b39' }}>{m.type === 'IN' ? '↘ Entrada' : '↗ Saída'}</span>
                <div>
                  <div style={{ fontWeight: 600, color: '#1F2A2E', fontSize: 13 }}>{m.type === 'IN' ? '+' : '−'}{m.quantity} · {m.productName}</div>
                  <div style={{ fontSize: 11.5, color: '#5C6B70' }}>{m.reason || 'Movimentação de estoque'} · {m.previousStock} → {m.newStock} un.</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: '#5C6B70' }}>{formatDateTime(m.date)}</div>
                <div style={{ fontSize: 11, color: '#94a3a0' }}>{m.user}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Movimentação */}
      {isMovementModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print" style={{ background: 'rgba(1,30,36,.45)' }} onClick={() => setIsMovementModalOpen(false)}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: '#E8DFC8' }}>
              <span className="text-base font-bold" style={{ color: '#014D5E' }}>{movementType === 'IN' ? '➕ Entrada de estoque' : '➖ Saída de estoque'}</span>
              <button onClick={() => setIsMovementModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 15, color: '#5C6B70' }}>✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div style={{ background: '#FBF9F4', border: '1px solid #F0EBE0', borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 600, color: '#1F2A2E' }}>{selectedProduct.name}</div>
                <div style={{ fontSize: 12.5, color: '#5C6B70' }}>Estoque atual: {selectedProduct.stock} unidades</div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#014D5E' }}>Quantidade</label>
                <input type="number" min="1" max={movementType === 'OUT' ? selectedProduct.stock : undefined} value={movementForm.quantity}
                  onChange={(e) => setMovementForm({ ...movementForm, quantity: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm" style={{ borderColor: '#E8DFC8' }} />
              </div>
              {movementType === 'IN' && canSeeCost && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#014D5E' }}>Custo unitário da compra <span style={{ color: '#94a3a0', fontWeight: 400 }}>(opcional)</span></label>
                  <input type="text" inputMode="decimal" placeholder="R$ por unidade" value={movementForm.custoUnitario}
                    onChange={(e) => setMovementForm({ ...movementForm, custoUnitario: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-lg text-sm" style={{ borderColor: '#E8DFC8' }} />
                  <div style={{ fontSize: 11, color: '#5C6B70', marginTop: 4 }}>Preencha pra recalcular o <b>custo médio</b> do item automaticamente.</div>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#014D5E' }}>Motivo{movementType === 'OUT' ? ' *' : ''}</label>
                {movementType === 'IN' ? (
                  <input type="text" placeholder="Ex: Compra - NF 12345" value={movementForm.reason}
                    onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-lg text-sm" style={{ borderColor: '#E8DFC8' }} />
                ) : (
                  <>
                    <select value={motivoOutro ? '__OUTRO__' : movementForm.reason}
                      onChange={(e) => { const v = e.target.value; if (v === '__OUTRO__') { setMotivoOutro(true); setMovementForm((f) => ({ ...f, reason: '' })); } else { setMotivoOutro(false); setMovementForm((f) => ({ ...f, reason: v })); } }}
                      className="w-full px-3 py-2.5 border rounded-lg text-sm" style={{ borderColor: '#E8DFC8' }}>
                      <option value="">Selecione o motivo…</option>
                      {motivosSaida.map((m) => <option key={m} value={m}>{m}</option>)}
                      <option value="__OUTRO__">➕ Outro (digitar)…</option>
                    </select>
                    {motivoOutro && (
                      <input type="text" autoFocus placeholder="Descreva o motivo (fica salvo pra próxima)" value={movementForm.reason}
                        onChange={(e) => setMovementForm((f) => ({ ...f, reason: e.target.value }))}
                        className="w-full mt-2 px-3 py-2.5 border rounded-lg text-sm" style={{ borderColor: '#E8DFC8' }} />
                    )}
                  </>
                )}
              </div>
              <div style={{ background: '#EAF6F7', borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 12.5, color: '#5C6B70' }}>Novo estoque após a movimentação:</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#014D5E' }}>{movementType === 'IN' ? selectedProduct.stock + movementForm.quantity : selectedProduct.stock - movementForm.quantity} unidades</div>
              </div>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: '#E8DFC8' }}>
              <button onClick={() => setIsMovementModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: '#E8DFC8', color: '#475569' }}>Cancelar</button>
              <button onClick={handleMovement} disabled={movementForm.quantity <= 0 || (movementType === 'OUT' && movementForm.quantity > selectedProduct.stock) || (movementType === 'OUT' && !movementForm.reason.trim())}
                className="px-4 py-2 rounded-lg text-sm text-white font-bold disabled:opacity-50"
                style={{ background: movementType === 'IN' ? '#1c7a47' : '#b23b39' }}>
                Confirmar {movementType === 'IN' ? 'entrada' : 'saída'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Histórico */}
      {isHistoryModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print" style={{ background: 'rgba(1,30,36,.45)' }} onClick={() => { setIsHistoryModalOpen(false); fetchMovements(); }}>
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden" style={{ maxHeight: '82vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: '#E8DFC8' }}>
              <div>
                <div className="text-base font-bold" style={{ color: '#014D5E' }}>🕑 Histórico de movimentações</div>
                <div style={{ fontSize: 12.5, color: '#5C6B70' }}>{selectedProduct.name}</div>
              </div>
              <button onClick={() => { setIsHistoryModalOpen(false); fetchMovements(); }} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 15, color: '#5C6B70' }}>✕</button>
            </div>
            <div className="px-5 py-2.5 border-b flex items-center gap-2 flex-wrap" style={{ borderColor: '#F0EBE0', background: '#FBFDFD' }}>
              <span style={{ fontSize: 11.5, color: '#5C6B70' }}>Período:</span>
              <input type="date" className="est-datein" value={histDe} onChange={(e) => setHistDe(e.target.value)} />
              <span style={{ color: '#5C6B70' }}>→</span>
              <input type="date" className="est-datein" value={histAte} onChange={(e) => setHistAte(e.target.value)} />
              {(histDe || histAte) && <button className="est-btn" style={{ padding: '5px 9px' }} onClick={() => { setHistDe(''); setHistAte(''); }}>limpar</button>}
            </div>
            <div style={{ overflowY: 'auto', maxHeight: '58vh' }}>
              {productMovements.length > 0 ? productMovements.map((m) => (
                <div key={m.id} className="est-mov">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="est-pill" style={{ background: m.type === 'IN' ? '#E7F6EE' : '#FCE9E7', color: m.type === 'IN' ? '#1c7a47' : '#b23b39' }}>{m.type === 'IN' ? '↘ Entrada' : '↗ Saída'}</span>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1F2A2E', fontSize: 13 }}>{m.type === 'IN' ? '+' : '−'}{m.quantity} unidades</div>
                      <div style={{ fontSize: 11.5, color: '#5C6B70' }}>{m.reason || 'Movimentação de estoque'} · {m.previousStock} → {m.newStock} un.</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: '#5C6B70' }}>{formatDateTime(m.date)}</div>
                    <div style={{ fontSize: 11, color: '#94a3a0' }}>{m.user}</div>
                  </div>
                </div>
              )) : (
                <div className="est-empty">Nenhuma movimentação{(histDe || histAte) ? ' no período' : ' registrada'}.</div>
              )}
            </div>
            <div className="px-5 py-4 border-t flex justify-end" style={{ borderColor: '#E8DFC8' }}>
              <button onClick={() => { setIsHistoryModalOpen(false); fetchMovements(); }} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: '#E8DFC8', color: '#475569' }}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
