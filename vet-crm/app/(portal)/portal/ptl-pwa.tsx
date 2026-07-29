'use client';
/**
 * PWA e notificações do portal (Fatia 6).
 *
 * Três coisas, todas discretas:
 *  · registra o service worker — só no escopo /portal/, nunca no app da equipe;
 *  · cartão "Receber avisos" que pede permissão e inscreve o aparelho;
 *  · dica de "instalar na tela inicial" (com o passo a passo do iPhone, que não
 *    tem botão de instalar).
 *
 * Nada disso aparece se o navegador não suportar — em vez de mostrar botão que
 * não funciona, a gente esconde.
 */
import { useCallback, useEffect, useState } from 'react';

/**
 * Converte a chave VAPID (texto base64url) nos bytes que o navegador exige.
 * Devolve ArrayBuffer porque é o que `applicationServerKey` aceita nos tipos
 * do DOM (um Uint8Array com buffer genérico não passa).
 */
function chaveParaBytes(base64: string): ArrayBuffer {
  const completo = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const bruto = atob(completo);
  const buffer = new ArrayBuffer(bruto.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bruto.length; i++) bytes[i] = bruto.charCodeAt(i);
  return buffer;
}

/** Registra o service worker uma vez. Silencioso: falhar aqui não quebra nada. */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/portal/sw.js', { scope: '/portal/' })
      .catch(() => undefined);
  }, []);
  return null;
}

type Estado = 'carregando' | 'indisponivel' | 'desligado' | 'ligado' | 'negado';

/**
 * Cartão de avisos. Aparece na Início.
 * Só some de vez quando o tutor já ligou — aí vira uma linha discreta.
 */
export function CartaoAvisos() {
  const [estado, setEstado] = useState<Estado>('carregando');
  const [chave, setChave] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [recado, setRecado] = useState('');

  const carregar = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      setEstado('indisponivel');
      return;
    }
    try {
      const r = await fetch('/api/portal/push/estado', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok || !d?.disponivel || !d?.chavePublica) {
        setEstado('indisponivel');
        return;
      }
      setChave(d.chavePublica);

      if (Notification.permission === 'denied') {
        setEstado('negado');
        return;
      }

      const reg = await navigator.serviceWorker.getRegistration('/portal/');
      const inscricao = await reg?.pushManager.getSubscription();
      setEstado(inscricao && d.aparelhos > 0 ? 'ligado' : 'desligado');
    } catch {
      setEstado('indisponivel');
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function ligar() {
    if (!chave) return;
    setOcupado(true);
    setRecado('');
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== 'granted') {
        setEstado(permissao === 'denied' ? 'negado' : 'desligado');
        return;
      }

      const reg =
        (await navigator.serviceWorker.getRegistration('/portal/')) ||
        (await navigator.serviceWorker.register('/portal/sw.js', { scope: '/portal/' }));
      await navigator.serviceWorker.ready;

      const inscricao = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: chaveParaBytes(chave),
      });

      const r = await fetch('/api/portal/push/inscrever', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inscricao),
      });
      if (!r.ok) throw new Error();

      setEstado('ligado');
      setRecado('Pronto! Vamos te avisar por aqui. 🔔');
    } catch {
      setRecado('Não consegui ligar os avisos agora.');
    } finally {
      setOcupado(false);
    }
  }

  async function desligar() {
    setOcupado(true);
    setRecado('');
    try {
      const reg = await navigator.serviceWorker.getRegistration('/portal/');
      const inscricao = await reg?.pushManager.getSubscription();
      if (inscricao) {
        await fetch('/api/portal/push/sair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: inscricao.endpoint }),
        });
        await inscricao.unsubscribe();
      }
      setEstado('desligado');
      setRecado('Avisos desligados.');
    } finally {
      setOcupado(false);
    }
  }

  async function testar() {
    setOcupado(true);
    setRecado('');
    try {
      const r = await fetch('/api/portal/push/testar', { method: 'POST' });
      const d = await r.json();
      setRecado(
        d?.enviados > 0
          ? 'Mandei um aviso de teste — olha a tela do celular. 👀'
          : 'Não havia aparelho inscrito para receber.',
      );
    } finally {
      setOcupado(false);
    }
  }

  if (estado === 'carregando' || estado === 'indisponivel') return null;

  if (estado === 'negado') {
    return (
      <p className="ptl-aviso" style={{ textAlign: 'center' }}>
        Os avisos estão bloqueados nas configurações do navegador. Se quiser recebê-los, libere as
        notificações para este site.
      </p>
    );
  }

  if (estado === 'ligado') {
    return (
      <p className="ptl-aviso" style={{ textAlign: 'center' }}>
        🔔 Avisos ligados.{' '}
        <button className="ptl-link" disabled={ocupado} onClick={testar}>
          testar
        </button>{' '}
        ·{' '}
        <button className="ptl-link" disabled={ocupado} onClick={desligar}>
          desligar
        </button>
        {recado && (
          <>
            <br />
            {recado}
          </>
        )}
      </p>
    );
  }

  return (
    <div className="ptl-card" style={{ padding: 14 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 3 }}>
        🔔 Quer que a gente te avise?
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--cinza)', lineHeight: 1.5 }}>
        Lembrete do horário marcado e novidades do seu pet. Sem propaganda — e você desliga quando
        quiser.
      </p>
      {recado && (
        <p className="ptl-aviso" style={{ marginTop: 7 }}>
          {recado}
        </p>
      )}
      <button className="ptl-btn" style={{ marginTop: 11 }} disabled={ocupado} onClick={ligar}>
        {ocupado ? 'Um instante…' : 'Quero receber avisos'}
      </button>
    </div>
  );
}

/**
 * Dica de instalar na tela inicial. No Android o navegador dá o convite;
 * no iPhone não existe botão, então mostramos o caminho.
 */
export function DicaDeInstalar() {
  const [convite, setConvite] = useState<any>(null);
  const [ehIphone, setEhIphone] = useState(false);
  const [instalado, setInstalado] = useState(true);
  const [fechado, setFechado] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      (window.navigator as any).standalone === true;
    setInstalado(!!standalone);

    const ua = window.navigator.userAgent || '';
    setEhIphone(/iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua));

    try {
      setFechado(localStorage.getItem('ptl_dica_instalar') === 'nao');
    } catch {
      // sem armazenamento: mostra sempre
    }

    const aoConvidar = (e: Event) => {
      e.preventDefault();
      setConvite(e);
    };
    window.addEventListener('beforeinstallprompt', aoConvidar);
    return () => window.removeEventListener('beforeinstallprompt', aoConvidar);
  }, []);

  function naoMostrarMais() {
    setFechado(true);
    try {
      localStorage.setItem('ptl_dica_instalar', 'nao');
    } catch {
      // segue sem lembrar
    }
  }

  if (instalado || fechado) return null;
  if (!convite && !ehIphone) return null;

  return (
    <div
      className="ptl-card"
      style={{ padding: 13, background: 'var(--ceu)', borderColor: 'var(--turquesa)' }}
    >
      <div style={{ fontSize: 13, fontWeight: 700 }}>📲 Deixe na tela do celular</div>
      {ehIphone ? (
        <p style={{ fontSize: 12, color: 'var(--cinza)', lineHeight: 1.55, marginTop: 4 }}>
          Toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>. Fica com ícone,
          igual a um aplicativo.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 12, color: 'var(--cinza)', lineHeight: 1.55, marginTop: 4 }}>
            Fica com ícone e abre direto, igual a um aplicativo.
          </p>
          <button
            className="ptl-btn"
            style={{ marginTop: 10 }}
            onClick={async () => {
              try {
                await convite.prompt();
              } finally {
                setConvite(null);
              }
            }}
          >
            Instalar
          </button>
        </>
      )}
      <button className="ptl-link" style={{ marginTop: 6 }} onClick={naoMostrarMais}>
        não mostrar mais
      </button>
    </div>
  );
}
