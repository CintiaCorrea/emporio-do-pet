/**
 * O DIA DO ANIVERSÁRIO — a regra, fora da consulta, para poder ser testada.
 *
 * Nascimento é um DIA, não um instante. A ficha do cliente grava "AAAA-MM-DDT00:00:00.000Z":
 * meia-noite em UTC. Este servidor roda em America/Fortaleza (TZ no fly.toml), então ler as
 * partes LOCAIS de um Date desses devolve o DIA ANTERIOR — quem nasceu em 01/08 vinha como
 * dia 31, e ia parar no fim da lista de agosto, num dia que nem existe ali.
 *
 * O filtro do mês na consulta (EXTRACT(MONTH FROM "birthDate")) lê o valor gravado, sem fuso.
 * Ler as partes UTC aqui é o que faz o DIA concordar com o MÊS — antes um olhava o relógio do
 * servidor e o outro não.
 *
 * Gêmea da ideia de vet-crm/lib/datas.ts (diaCalendario), do lado das telas.
 */

/** Dia do mês (1..31) do nascimento, ou null se não houver data válida. */
export function diaDoMes(birthDate: Date | string | null): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return null;
  return d.getUTCDate();
}

/** Idade em anos completos até hoje, ou null se não houver data válida. */
export function calcularIdade(birthDate: Date | string | null, hoje = new Date()): number | null {
  if (!birthDate) return null;
  const nascimento = new Date(birthDate);
  if (isNaN(nascimento.getTime())) return null;
  let idade = hoje.getFullYear() - nascimento.getUTCFullYear();
  const aniversarioAindaNaoPassou =
    hoje.getMonth() < nascimento.getUTCMonth() ||
    (hoje.getMonth() === nascimento.getUTCMonth() && hoje.getDate() < nascimento.getUTCDate());
  if (aniversarioAindaNaoPassou) idade -= 1;
  return idade >= 0 ? idade : null;
}
