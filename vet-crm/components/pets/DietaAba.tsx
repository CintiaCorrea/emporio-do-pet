"use client";
/**
 * Aba Alimentação da ficha do pet — a equipe prescreve a dieta.
 * Portada do mockup aprovado (mockups-base44/dieta-prescrever-mockup.html).
 *
 * O que está escrito aqui aparece na hora no Portal do Tutor. Por isso a coluna
 * da direita mostra a **prévia "como o tutor vê"**: a veterinária escreve
 * olhando o resultado, em vez de escrever no escuro.
 *
 * Prescrição não se apaga: prescrever de novo encerra a anterior, que fica no
 * histórico ao lado.
 */
import { useEffect, useRef, useState } from "react";
import { B44, Card, Btn, Input, Textarea } from "@/components/ui/base44";

interface ItemDieta {
  nome: string;
  detalhe: string | null;
}

interface Dieta {
  id: string;
  prescritorNome: string | null;
  data: string;
  ativa: boolean;
  itens: ItemDieta[];
  variacoes: string[];
  evitar: string[];
  observacao: string | null;
}

const VAZIA = { itens: [{ nome: "", detalhe: "" }], variacoes: [""], evitar: [""], observacao: "" };

function dataBr(v?: string | null) {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
}

/** Lista de textos com adicionar/remover — serve para variações e restrições. */
function ListaTextos({
  itens,
  onChange,
  marca,
  cor,
  fundo,
  rotuloAdicionar,
  placeholder,
}: {
  itens: string[];
  onChange: (l: string[]) => void;
  marca: string;
  cor: string;
  fundo: string;
  rotuloAdicionar: string;
  placeholder: string;
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        {itens.map((t, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span
              className="flex items-center justify-center text-[12px] font-bold"
              style={{ width: 22, height: 22, borderRadius: 7, background: fundo, color: cor, flex: "none" }}
            >
              {marca}
            </span>
            <Input
              value={t}
              placeholder={placeholder}
              onChange={(e) => onChange(itens.map((x, k) => (k === i ? e.target.value : x)))}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              title="Remover"
              onClick={() => onChange(itens.filter((_, k) => k !== i))}
              className="text-[14px]"
              style={{
                width: 34,
                height: 36,
                border: `1px solid ${B44.line}`,
                borderRadius: 9,
                background: "#fff",
                color: "#b23b39",
                flex: "none",
              }}
            >
              🗑
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...itens, ""])}
        className="w-full mt-2 text-[12.5px] font-semibold"
        style={{
          border: `1px dashed ${B44.line}`,
          background: B44.soft,
          borderRadius: 10,
          padding: "8px 12px",
          color: B44.primary,
        }}
      >
        {rotuloAdicionar}
      </button>
    </>
  );
}

export default function DietaAba({ petId, petNome }: { petId: string; petNome: string }) {
  const [ativa, setAtiva] = useState<Dieta | null>(null);
  const [historico, setHistorico] = useState<Dieta[]>([]);
  const [form, setForm] = useState<{
    itens: { nome: string; detalhe: string }[];
    variacoes: string[];
    evitar: string[];
    observacao: string;
  }>(VAZIA);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const jaCarregou = useRef(false);

  async function carregar() {
    const r = await fetch(`/api/dietas/pet/${petId}`, { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) throw new Error(d?.error || "Não consegui carregar a dieta");
    setAtiva(d.ativa || null);
    setHistorico(d.historico || []);
    if (d.ativa) {
      setForm({
        itens: (d.ativa.itens || []).map((i: ItemDieta) => ({ nome: i.nome, detalhe: i.detalhe || "" })),
        variacoes: d.ativa.variacoes?.length ? d.ativa.variacoes : [""],
        evitar: d.ativa.evitar?.length ? d.ativa.evitar : [""],
        observacao: d.ativa.observacao || "",
      });
    } else {
      setForm(VAZIA);
    }
  }

  useEffect(() => {
    if (jaCarregou.current) return;
    jaCarregou.current = true;
    (async () => {
      try {
        await carregar();
      } catch (e: any) {
        setAviso({ tipo: "erro", texto: e?.message || "Não consegui carregar a dieta" });
      } finally {
        setCarregando(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId]);

  const itensValidos = form.itens.filter((i) => i.nome.trim());

  async function prescrever() {
    if (!itensValidos.length) {
      setAviso({ tipo: "erro", texto: "Escreva ao menos um item da dieta." });
      return;
    }
    setSalvando(true);
    setAviso(null);
    try {
      const corpo = {
        itens: itensValidos.map((i) => ({ nome: i.nome.trim(), detalhe: i.detalhe.trim() })),
        variacoes: form.variacoes.filter((v) => v.trim()),
        evitar: form.evitar.filter((v) => v.trim()),
        observacao: form.observacao,
      };
      // Dieta ativa e sem mudança de conteúdo = ajuste; senão, prescrição nova.
      const r = await fetch(`/api/dietas/pet/${petId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.message || d?.error || "Não consegui salvar");
      await carregar();
      setAviso({ tipo: "ok", texto: "Dieta prescrita ✓ já está no portal do tutor" });
    } catch (e: any) {
      setAviso({ tipo: "erro", texto: e?.message || "Não consegui salvar" });
    } finally {
      setSalvando(false);
    }
  }

  async function encerrar() {
    if (!ativa) return;
    setSalvando(true);
    setAviso(null);
    try {
      const r = await fetch(`/api/dietas/${ativa.id}/encerrar`, { method: "PATCH" });
      if (!r.ok) throw new Error("Não consegui encerrar");
      await carregar();
      setAviso({ tipo: "ok", texto: "Dieta encerrada — o portal volta a não mostrar dieta" });
    } catch (e: any) {
      setAviso({ tipo: "erro", texto: e?.message || "Não consegui encerrar" });
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="text-[13px] py-4" style={{ color: B44.text2 }}>
        Carregando a dieta…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px]" style={{ color: B44.text2, maxWidth: "72ch" }}>
        O que você escrever aqui aparece na hora no Portal do Tutor. Prescrever uma dieta nova encerra
        a anterior — nada é apagado, a antiga fica no histórico.
      </p>

      <div className="grid gap-3" style={{ gridTemplateColumns: "minmax(0,1.25fr) minmax(0,1fr)" }}>
        {/* ---------------------------------------------- formulário */}
        <div className="flex flex-col gap-3">
          <Card
            title={`🥣 O que ${petNome} come`}
            badge={
              ativa
                ? { label: "dieta ativa", color: "#1c7a47", bg: "#E7F6EE" }
                : { label: "sem dieta", color: B44.text2, bg: "#F3F1EC" }
            }
          >
            {form.itens.map((it, i) => (
              <div key={i} className="flex gap-2 items-start mb-2">
                <span style={{ flex: "1.1" }}>
                  {i === 0 && (
                    <span className="text-[11.5px] font-semibold mb-1.5 block" style={{ color: B44.text2 }}>
                      item
                    </span>
                  )}
                  <Input
                    value={it.nome}
                    placeholder="Ração de controle de peso"
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        itens: f.itens.map((x, k) => (k === i ? { ...x, nome: e.target.value } : x)),
                      }))
                    }
                    style={{ width: "100%" }}
                  />
                </span>
                <span style={{ flex: "1.6" }}>
                  {i === 0 && (
                    <span className="text-[11.5px] font-semibold mb-1.5 block" style={{ color: B44.text2 }}>
                      quanto / quando
                    </span>
                  )}
                  <Input
                    value={it.detalhe}
                    placeholder="160 g/dia · 2 refeições"
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        itens: f.itens.map((x, k) => (k === i ? { ...x, detalhe: e.target.value } : x)),
                      }))
                    }
                    style={{ width: "100%" }}
                  />
                </span>
                <button
                  type="button"
                  title="Remover"
                  onClick={() =>
                    setForm((f) => ({ ...f, itens: f.itens.filter((_, k) => k !== i) }))
                  }
                  className="text-[14px]"
                  style={{
                    width: 34,
                    height: 36,
                    marginTop: i === 0 ? 21 : 0,
                    border: `1px solid ${B44.line}`,
                    borderRadius: 9,
                    background: "#fff",
                    color: "#b23b39",
                    flex: "none",
                  }}
                >
                  🗑
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setForm((f) => ({ ...f, itens: [...f.itens, { nome: "", detalhe: "" }] }))
              }
              className="w-full text-[12.5px] font-semibold"
              style={{
                border: `1px dashed ${B44.line}`,
                background: B44.soft,
                borderRadius: 10,
                padding: "8px 12px",
                color: B44.primary,
              }}
            >
              + Adicionar item
            </button>
          </Card>

          <Card title="✅ O tutor PODE variar">
            <p className="text-[12.5px] mb-2.5" style={{ color: B44.text2 }}>
              Aparece em verde no portal. É aqui que você evita o telefonema de "posso dar isso?".
            </p>
            <ListaTextos
              itens={form.variacoes}
              onChange={(variacoes) => setForm((f) => ({ ...f, variacoes }))}
              marca="✓"
              cor="#1c7a47"
              fundo="#E7F6EE"
              rotuloAdicionar="+ Adicionar variação permitida"
              placeholder="1 refeição por semana pode ser comida natural"
            />
          </Card>

          <Card title="🚫 O que EVITAR">
            <ListaTextos
              itens={form.evitar}
              onChange={(evitar) => setForm((f) => ({ ...f, evitar }))}
              marca="✕"
              cor="#b23b39"
              fundo="#FDECEC"
              rotuloAdicionar="+ Adicionar restrição"
              placeholder="Petiscos industrializados e ossos cozidos"
            />
          </Card>

          <Card title="💡 Recado para o tutor">
            <Textarea
              value={form.observacao}
              placeholder="Pesar a ração; olhômetro engana."
              onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
              style={{ width: "100%", minHeight: 60 }}
            />
            <p className="text-[11.5px] mt-1.5" style={{ color: B44.text2 }}>
              Uma frase só, em destaque azul no portal. Opcional.
            </p>
          </Card>

          <div className="flex gap-2.5 items-center flex-wrap">
            <span className="text-[12px] mr-auto" style={{ color: B44.text2 }}>
              {ativa
                ? `prescrita por ${ativa.prescritorNome || "equipe"} · ${dataBr(ativa.data)}`
                : "nenhuma dieta ativa"}
            </span>
            {aviso && (
              <span
                className="text-[12.5px] font-semibold"
                style={{ color: aviso.tipo === "ok" ? "#1c7a47" : "#b23b39" }}
              >
                {aviso.texto}
              </span>
            )}
            {ativa && (
              <Btn variant="danger" disabled={salvando} onClick={encerrar}>
                Encerrar dieta
              </Btn>
            )}
            <Btn variant="primary" disabled={salvando} onClick={prescrever}>
              {salvando ? "Salvando…" : "Prescrever"}
            </Btn>
          </div>
        </div>

        {/* ---------------------------------------------- prévia + histórico */}
        <div className="flex flex-col gap-3">
          <div style={{ background: "#EAEFF2", borderRadius: 14, padding: 14 }}>
            <div
              className="text-[11px] font-bold mb-2.5 flex items-center gap-1.5"
              style={{ letterSpacing: ".1em", textTransform: "uppercase", color: "#5B6A6E" }}
            >
              <span>📱</span> como o tutor vê
            </div>

            <div
              style={{
                background: "#FAFCFD",
                border: "1px solid #DECBB2",
                borderRadius: 14,
                padding: 12,
                maxWidth: 330,
                margin: "0 auto",
                color: "#0D2048",
              }}
            >
              {itensValidos.length === 0 ? (
                <p className="text-[11px] text-center py-3" style={{ color: "#8B8A84" }}>
                  Escreva a dieta ao lado e ela aparece aqui do jeito que o tutor vai ver.
                </p>
              ) : (
                <>
                  <div className="text-[10px] mb-2" style={{ color: "#5F5E5A" }}>
                    🩺 prescrito por {ativa?.prescritorNome || "você"} ·{" "}
                    {ativa ? dataBr(ativa.data) : "hoje"}
                  </div>
                  <div className="text-[10px] mb-1" style={{ color: "#5F5E5A" }}>
                    dieta prescrita
                  </div>
                  <div
                    style={{ background: "#fff", border: "1px solid #DECBB2", borderRadius: 10, padding: "8px 10px" }}
                  >
                    {itensValidos.map((i, k) => (
                      <div key={k}>
                        {k > 0 && <div style={{ height: 1, background: "#F1EFE8", margin: "7px 0" }} />}
                        <div className="text-[11.5px] font-semibold">{i.nome}</div>
                        {i.detalhe && (
                          <div className="text-[10px]" style={{ color: "#5F5E5A" }}>
                            {i.detalhe}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {form.variacoes.some((v) => v.trim()) && (
                    <>
                      <div className="text-[10px] mt-2 mb-1" style={{ color: "#5F5E5A" }}>
                        variações que você pode fazer
                      </div>
                      <div
                        style={{ background: "#E1F5EE", borderRadius: 10, padding: "8px 10px", color: "#04342C" }}
                        className="text-[10.5px] leading-relaxed"
                      >
                        {form.variacoes
                          .filter((v) => v.trim())
                          .map((v, k) => (
                            <div key={k}>✓ {v}</div>
                          ))}
                      </div>
                    </>
                  )}

                  {form.evitar.some((v) => v.trim()) && (
                    <div
                      style={{ background: "#FCEBEB", borderRadius: 10, padding: "8px 10px", color: "#501313", marginTop: 6 }}
                      className="text-[10.5px] leading-relaxed"
                    >
                      {form.evitar
                        .filter((v) => v.trim())
                        .map((v, k) => (
                          <div key={k}>✕ {k === 0 ? <b>Evitar: </b> : null}{v}</div>
                        ))}
                    </div>
                  )}

                  <div
                    style={{ background: "#1D9E75", color: "#fff", borderRadius: 10, padding: 8, marginTop: 10 }}
                    className="text-[11px] font-bold text-center"
                  >
                    Tirar dúvida sobre a dieta
                  </div>
                </>
              )}
            </div>
          </div>

          <Card title="📜 Dietas anteriores" count={historico.length}>
            {historico.length === 0 ? (
              <p className="text-[13px] py-2 text-center" style={{ color: B44.text2 }}>
                Nenhuma ainda.
              </p>
            ) : (
              <div className="flex flex-col">
                {historico.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-2.5 py-2.5"
                    style={{ borderBottom: `1px solid ${B44.lineSoft}` }}
                  >
                    <span className="flex-1">
                      <b className="text-[13px] font-semibold" style={{ color: B44.text1 }}>
                        {h.itens?.[0]?.nome || "Dieta"}
                      </b>
                      <small className="block text-[11.5px]" style={{ color: B44.text2 }}>
                        {h.prescritorNome || "equipe"} · {dataBr(h.data)} ·{" "}
                        {h.itens?.length || 0} {h.itens?.length === 1 ? "item" : "itens"}
                      </small>
                    </span>
                    <button
                      type="button"
                      className="text-[11.5px] font-semibold"
                      style={{ color: B44.primary }}
                      onClick={() =>
                        setForm({
                          itens: (h.itens || []).map((i) => ({ nome: i.nome, detalhe: i.detalhe || "" })),
                          variacoes: h.variacoes?.length ? h.variacoes : [""],
                          evitar: h.evitar?.length ? h.evitar : [""],
                          observacao: h.observacao || "",
                        })
                      }
                      title="Trazer essa dieta para o formulário (não prescreve sozinho)"
                    >
                      reaproveitar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
