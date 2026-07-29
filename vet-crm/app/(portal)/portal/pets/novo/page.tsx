/**
 * Cadastrar um pet novo (aprovado pela Cintia em 29/07).
 *
 * O tutor preenche só o que ele sabe. Peso, microchip, castração e temperamento
 * são da clínica — nem aparecem aqui, pra ele não achar que precisa saber.
 *
 * Antes de criar, o servidor procura pet de nome parecido no cadastro dele e
 * devolve a lista; a tela pergunta "é esse?" em vez de criar um segundo "Thor"
 * e rachar o histórico clínico em dois.
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PtlCabecalho, PtlEstilos, emojiEspecie } from '../../ptl-ui';

const ESPECIES = [
  { v: 'CANINE', l: '🐶 Cão' },
  { v: 'FELINE', l: '🐱 Gato' },
  { v: 'BIRD', l: '🐦 Ave' },
  { v: 'RODENT', l: '🐹 Roedor' },
  { v: 'REPTILE', l: '🦎 Réptil' },
  { v: 'OTHER', l: '🐾 Outro' },
];

const SEXOS = [
  { v: '', l: 'não sei / prefiro não dizer' },
  { v: 'MALE', l: 'macho' },
  { v: 'FEMALE', l: 'fêmea' },
];

interface Parecido {
  id: string;
  nome: string;
  especie: string;
  raca: string | null;
  idadeAnos: number | null;
}

export default function NovoPet() {
  const router = useRouter();

  const [nome, setNome] = useState('');
  const [especie, setEspecie] = useState('CANINE');
  const [raca, setRaca] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [sexo, setSexo] = useState('');
  const [alergias, setAlergias] = useState('');

  const [parecidos, setParecidos] = useState<Parecido[] | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [pronto, setPronto] = useState(false);

  async function enviar(confirmado: boolean) {
    setSalvando(true);
    setErro('');
    try {
      const r = await fetch('/api/portal/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, especie, raca, nascimento, sexo, alergias, confirmado }),
      });
      const d = await r.json();

      if (r.status === 401) {
        router.replace('/portal/entrar');
        return;
      }
      if (!r.ok) {
        setErro(d?.message || d?.error || 'Não consegui cadastrar agora.');
        return;
      }
      if (d?.precisaConfirmar) {
        setParecidos(d.parecidos || []);
        return;
      }
      setPronto(true);
    } catch {
      setErro('Sem conexão. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  }

  const podeEnviar = nome.trim().length >= 2 && !!especie;

  return (
    <div className="ptl-root">
      <PtlEstilos />
      <main className="ptl-app">
        <PtlCabecalho titulo="Novo pet" />

        {/* ---------------------------------------------- deu certo */}
        {pronto && (
          <div className="ptl-stack" style={{ marginTop: 6 }}>
            <div className="ptl-salvo" style={{ padding: '18px 14px', fontSize: 14 }}>
              {nome} está no cadastro! 🐾
              <br />
              <span style={{ fontWeight: 400, fontSize: 12.5 }}>
                A equipe completa a parte clínica na primeira consulta.
              </span>
            </div>
            <button className="ptl-btn" onClick={() => router.replace('/portal')}>
              Voltar ao início
            </button>
          </div>
        )}

        {/* ---------------------------------------------- pergunta do parecido */}
        {!pronto && parecidos && (
          <div className="ptl-stack" style={{ marginTop: 6 }}>
            <div>
              <h1 className="ptl-h">Você já tem um pet com esse nome</h1>
              <p className="ptl-p" style={{ marginTop: 6 }}>
                Só pra não criar cadastro repetido: é algum destes?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {parecidos.map((p) => (
                <button
                  key={p.id}
                  className="ptl-pick"
                  onClick={() => router.replace('/portal')}
                >
                  <span className="av" aria-hidden="true">
                    {emojiEspecie(p.especie)}
                  </span>
                  <span>
                    <b>{p.nome}</b>
                    <small>
                      {[p.raca, p.idadeAnos != null ? `${p.idadeAnos} anos` : null]
                        .filter(Boolean)
                        .join(' · ') || 'já cadastrado'}
                    </small>
                  </span>
                </button>
              ))}
            </div>

            {erro && <p className="ptl-erro">{erro}</p>}

            <button className="ptl-btn" disabled={salvando} onClick={() => enviar(true)}>
              {salvando ? 'Cadastrando…' : `Não, o ${nome.trim()} é outro pet`}
            </button>
            <button className="ptl-btn quiet" onClick={() => setParecidos(null)}>
              Voltar e corrigir
            </button>
          </div>
        )}

        {/* ---------------------------------------------- formulário */}
        {!pronto && !parecidos && (
          <div className="ptl-stack" style={{ marginTop: 4 }}>
            <p className="ptl-p">
              Conta o básico do seu bichinho. O resto (peso, vacinas, microchip) a equipe registra na
              primeira consulta. 💚
            </p>

            <div className="ptl-form">
              <div className="ptl-linha">
                <label htmlFor="p-nome">Nome</label>
                <input
                  id="p-nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="como você chama ele"
                />
              </div>
              <div className="ptl-linha">
                <label htmlFor="p-especie">Espécie</label>
                <select
                  id="p-especie"
                  value={especie}
                  onChange={(e) => setEspecie(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'none',
                    font: 'inherit',
                    fontSize: 13,
                    color: 'var(--marinho)',
                    textAlign: 'right',
                    width: '62%',
                  }}
                >
                  {ESPECIES.map((e) => (
                    <option key={e.v} value={e.v}>
                      {e.l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ptl-linha">
                <label htmlFor="p-raca">Raça</label>
                <input
                  id="p-raca"
                  value={raca}
                  onChange={(e) => setRaca(e.target.value)}
                  placeholder="se souber"
                />
              </div>
              <div className="ptl-linha">
                <label htmlFor="p-nasc">Nascimento</label>
                <input
                  id="p-nasc"
                  type="date"
                  value={nascimento}
                  onChange={(e) => setNascimento(e.target.value)}
                />
              </div>
              <div className="ptl-linha">
                <label htmlFor="p-sexo">Sexo</label>
                <select
                  id="p-sexo"
                  value={sexo}
                  onChange={(e) => setSexo(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'none',
                    font: 'inherit',
                    fontSize: 13,
                    color: 'var(--marinho)',
                    textAlign: 'right',
                    width: '62%',
                  }}
                >
                  {SEXOS.map((s) => (
                    <option key={s.v} value={s.v}>
                      {s.l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ptl-linha">
                <label htmlFor="p-alergias">Alergias</label>
                <input
                  id="p-alergias"
                  value={alergias}
                  onChange={(e) => setAlergias(e.target.value)}
                  placeholder="nenhuma conhecida"
                />
              </div>
            </div>

            {erro && <p className="ptl-erro">{erro}</p>}

            <button className="ptl-btn" disabled={!podeEnviar || salvando} onClick={() => enviar(false)}>
              {salvando ? 'Cadastrando…' : 'Cadastrar pet'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
