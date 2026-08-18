/**
 * Monta o TEXTO do boletim de fisioterapia a partir dos campos estruturados salvos
 * (lista `petboletim_<pet>`). Portado fiel do front (vet-crm/lib/pets/boletim.ts) pra o
 * Portal do Tutor exibir TODOS os boletins — inclusive os antigos, que guardam os dados
 * mas não guardavam o texto pronto.
 */

type ParamDef = { k: string; label: string };
type EquipDef = { key: string; params: ParamDef[]; cinesio?: boolean; free?: boolean };
type EquipVal = { on?: boolean; livre?: string; exercicios?: string[]; [param: string]: any };

const Fr: ParamDef = { k: 'Fr', label: 'Fr' };
const Int: ParamDef = { k: 'Int', label: 'Int' };
const T: ParamDef = { k: 'T', label: 'T' };
const Vel: ParamDef = { k: 'Vel', label: 'Vel' };
const Pro: ParamDef = { k: 'Pro', label: 'Pro' };
const Reg: ParamDef = { k: 'Reg', label: 'Reg' };

const EQUIP_DEFS: EquipDef[] = [
  { key: 'Magneto', params: [Fr, Int, T] },
  { key: 'Fototerapia', params: [Fr, Int, T] },
  { key: 'Fes', params: [Pro, Int, T] },
  { key: 'Tens', params: [Pro, Int, T] },
  { key: 'Haihua', params: [Pro, Int, Reg, T] },
  { key: 'Hidroesteira', params: [Vel, T] },
  { key: 'Eletroacupuntura', params: [Reg, T] },
  { key: 'Laser terapia', params: [Int, Reg, T] },
  { key: 'Moxa', params: [Reg, T] },
  { key: 'Ozonioterapia', params: [], free: true },
  { key: 'Ultrassom', params: [], free: true },
  { key: 'Farmacoacupuntura', params: [], free: true },
  { key: 'Acupuntura', params: [], free: true },
  { key: 'Cinesioterapia', params: [T], cinesio: true },
];

const fmtBR = (v?: string) => {
  if (!v) return '—';
  const s = String(v);
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T00:00:00' : s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('pt-BR');
};

function linhaEquip(def: EquipDef, val: EquipVal | string | undefined): string | null {
  if (typeof val === 'string') return val.trim() ? `• ${def.key} — ${val.trim()}` : null;
  if (!val || !val.on) return null;
  if (def.cinesio) {
    const ex = (val.exercicios || []).join(', ');
    const t = val.T ? ` (${val.T} min)` : '';
    return `• ${def.key} — ${ex || '—'}${t}`;
  }
  if (def.free) return `• ${def.key} — ${(val.livre || '').trim() || '—'}`;
  const parts = def.params
    .map((p) => (val[p.k] ? `${p.label} ${String(val[p.k]).trim()}` : null))
    .filter(Boolean)
    .join(' · ');
  return `• ${def.key}${parts ? ` — ${parts}` : ''}`;
}

export function montarTextoBoletim(b: any): string {
  const L: string[] = [];
  L.push('🌿 Boletim de Fisioterapia');
  L.push('Empório do Pet');
  L.push('━━━━━━━━━━━━━━━━━━');
  L.push(`🐾 ${b.animal || '—'}${b.raca ? ` · ${b.raca}` : ''}`);
  if (b.tutor) L.push(`🧑 Tutor(a): ${b.tutor}`);
  const sessao = [
    b.sessaoNumero ? `Sessão ${b.sessaoNumero}` : null,
    b.sessaoData ? fmtBR(b.sessaoData) : null,
    b.entrada || b.saida ? [b.entrada, b.saida].filter(Boolean).join('–') : null,
  ]
    .filter(Boolean)
    .join(' · ');
  if (sessao) L.push(`📅 ${sessao}`);
  if (b.mvResponsavel) L.push(`🩺 ${b.mvResponsavel}`);
  if (b.diagnostico) L.push(`🔎 ${b.diagnostico}`);

  const linhas = EQUIP_DEFS.map((def) => linhaEquip(def, (b.equipamentos || {})[def.key])).filter(
    Boolean,
  ) as string[];
  if (linhas.length) {
    L.push('');
    L.push('Recursos utilizados');
    L.push(...linhas);
  }

  if (b.obsMv) {
    L.push('');
    L.push('Como foi a sessão');
    L.push(b.obsMv);
  }
  if (b.paraCasa) {
    L.push('');
    L.push('Para casa');
    L.push(b.paraCasa);
  }
  if (b.metas) {
    L.push('');
    L.push(`🎯 Próxima sessão: ${b.metas}`);
  }
  return L.join('\n');
}
