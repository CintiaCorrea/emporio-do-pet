"use client";

import { useEffect, useState } from "react";
import Link from "next/link";


interface RetornoVencido {
  id: string; nome: string | null; petNome: string | null; telefone: string | null;
  diagnostico: string | null; diasAtraso: number; tags: string[];
}
interface Toque {
  id: string; nome: string | null; petNome: string | null; telefone: string | null;
  canal: string; ultimaInteracao: string;
}
interface HojeData {
  retornosVencidos: RetornoVencido[];
  toques: Toque[];
  tutoresAcompanhar: number;
  examesAEntregar: number;
  pacotesEmRisco: number;
}

function SectionHeader({ icon: Icon, title, count, color, open, onToggle, emptyOk }: {
  icon: any; title: string; count: number; color: string;
  open: boolean; onToggle: () => void; emptyOk?: string;
}) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between py-3 px-4 bg-white rounded-xl border border-[#d8d0bc] hover:bg-[#fdfaee] transition">
      <div className="flex items-center gap-3">
        {open ? <span style={{fontSize:"12px"}}>▼</span> : <span style={{fontSize:"12px"}}>▶</span>}
        <Icon className="w-5 h-5" style={{ color }} />
        <span className="text-sm text-[#0E2244] font-medium">{title}</span>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${count === 0 ? "bg-[#E1F5EE] text-[#0F6E56]" : "bg-[#FCE5C8] text-[#8A5A0F]"}`}>
          {count}
        </span>
      </div>
      {count === 0 && emptyOk && (
        <span className="text-[11px] text-[#0F6E56]">✓ {emptyOk}</span>
      )}
    </button>
  );
}

export default function HojePage() {
  const [data, setData] = useState<HojeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState({
    retornos: true, toques: true, tutores: false, exames: false, pacotes: false});
  const toggle = (k: keyof typeof open) => setOpen({ ...open, [k]: !open[k] });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/hoje");
        const d = await res.json().catch(() => ({}));
        setData({
          retornosVencidos: Array.isArray(d?.retornosVencidos) ? d.retornosVencidos : [],
          toques: Array.isArray(d?.toques) ? d.toques : [],
          tutoresAcompanhar: typeof d?.tutoresAcompanhar === "number" ? d.tutoresAcompanhar : 0,
          examesAEntregar: typeof d?.examesAEntregar === "number" ? d.examesAEntregar : 0,
          pacotesEmRisco: typeof d?.pacotesEmRisco === "number" ? d.pacotesEmRisco : 0});
      } catch (e) {
        console.error(e);
        setData({ retornosVencidos: [], toques: [], tutoresAcompanhar: 0, examesAEntregar: 0, pacotesEmRisco: 0 });
      }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long"});

  const tutoresAtencao = (data?.retornosVencidos?.length || 0) + (data?.tutoresAcompanhar || 0);

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl text-[#0E2244] font-medium capitalize">Hoje — {dataHoje}</h1>
        <p className="text-sm text-[#009AAC] mt-1">
          {data?.retornosVencidos?.length || 0} retornos vencidos · {data?.toques?.length || 0} toques hoje · {tutoresAtencao} tutores precisando atenção
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-12">Carregando...</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          <div>
            <SectionHeader icon={() => <span style={{fontSize:"14px"}}>📅</span>} title="Retornos vencidos" count={data?.retornosVencidos?.length || 0}
              color="#C2410C" open={open.retornos} onToggle={() => toggle("retornos")}
              emptyOk="Nenhum retorno vencido!" />
            {open.retornos && (data?.retornosVencidos?.length || 0) > 0 && (
              <div className="mt-2 flex flex-col gap-2">
                {data?.retornosVencidos.map((r) => (
                  <Link key={r.id} href={`/dashboard/crm/leads/${r.id}`} className="block bg-white border border-[#d8d0bc] rounded-lg p-3 hover:border-[#009AAC] transition">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        {r.petNome && <span>🐾 <strong className="text-[#0E2244] font-medium">{r.petNome}</strong></span>}
                        {r.petNome && r.nome && <span className="text-gray-400">·</span>}
                        <span className="text-[#4d5a66]">{r.nome}</span>
                        <span className="bg-[#FCE5C8] text-[#8A5A0F] text-[10px] font-medium px-2 py-0.5 rounded-full">
                          {r.diasAtraso}d de atraso
                        </span>
                      </div>
                      {r.telefone && (
                        <a href={`https://wa.me/${r.telefone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="bg-[#E0F4F6] text-[#00798A] text-[11px] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 border border-[#b5dde2]">
                          <span style={{fontSize:"14px"}}>💬</span>{r.telefone}
                        </a>
                      )}
                    </div>
                    {r.diagnostico && <p className="text-[11px] text-[#5b6470] mt-1.5"><strong className="text-[#0E2244] font-medium">Diagnóstico:</strong> {r.diagnostico}</p>}
                    {r.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {r.tags.slice(0, 5).map((t) => (
                          <span key={t} className="bg-[#FBF0DD] text-[#8a6313] text-[10px] px-2 py-0.5 rounded-full">⭕ {t}</span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionHeader icon={() => <span style={{fontSize:"14px"}}>📞</span>} title="Próximos toques de cadência" count={data?.toques?.length || 0}
              color="#00798A" open={open.toques} onToggle={() => toggle("toques")}
              emptyOk="Sem toques agendados" />
            {open.toques && (data?.toques?.length || 0) > 0 && (
              <div className="mt-2 flex flex-col gap-2">
                {data?.toques.map((t) => (
                  <Link key={t.id} href={`/dashboard/crm/leads/${t.id}`} className="block bg-white border border-[#d8d0bc] rounded-lg p-3 hover:border-[#009AAC] transition">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 text-sm">
                        {t.petNome && <span>🐾 <strong className="text-[#0E2244] font-medium">{t.petNome}</strong></span>}
                        {t.petNome && t.nome && <span className="text-gray-400">·</span>}
                        <span className="text-[#4d5a66]">{t.nome}</span>
                        <span className="bg-[#E1F5EE] text-[#0F6E56] text-[10px] font-medium px-2 py-0.5 rounded-full">{t.canal}</span>
                      </div>
                      {t.telefone && (
                        <a href={`https://wa.me/${t.telefone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="bg-[#E0F4F6] text-[#00798A] text-[11px] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 border border-[#b5dde2]">
                          <span style={{fontSize:"14px"}}>💬</span>{t.telefone}
                        </a>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionHeader icon={() => <span style={{fontSize:"14px"}}>💗</span>} title="Tutores a acompanhar" count={data?.tutoresAcompanhar || 0}
              color="#993556" open={open.tutores} onToggle={() => toggle("tutores")} />
            {open.tutores && (
              <div className="mt-2 bg-white border border-[#d8d0bc] rounded-lg p-4 text-center text-xs text-gray-400">
                {(data?.tutoresAcompanhar || 0) === 0 ? "Nada por aqui no momento" : "Lista de tutores a acompanhar — em construção (precisa do campo proximo_followup no Tutor)"}
              </div>
            )}
          </div>

          <div>
            <SectionHeader icon={() => <span style={{fontSize:"14px"}}>🧪</span>} title="Exames a entregar" count={data?.examesAEntregar || 0}
              color="#3C3489" open={open.exames} onToggle={() => toggle("exames")}
              emptyOk="Tudo em dia por aqui" />
            {open.exames && (
              <div className="mt-2 bg-white border border-[#d8d0bc] rounded-lg p-4 text-center text-xs text-gray-400">
                Lista de exames — em construção (depende do módulo CatalogoExame)
              </div>
            )}
          </div>

          <div>
            <SectionHeader icon={() => <span style={{fontSize:"14px"}}>📦</span>} title="Pacotes em risco" count={data?.pacotesEmRisco || 0}
              color="#BA7517" open={open.pacotes} onToggle={() => toggle("pacotes")}
              emptyOk="Tudo em dia por aqui" />
            {open.pacotes && (
              <div className="mt-2 bg-white border border-[#d8d0bc] rounded-lg p-4 text-center text-xs text-gray-400">
                Pacotes em risco — em construção (depende do módulo PacoteSessoes)
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
