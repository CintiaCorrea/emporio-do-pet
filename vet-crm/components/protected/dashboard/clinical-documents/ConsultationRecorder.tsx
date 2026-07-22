'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  LuUpload,
  LuLoader,
  LuCheck} from 'react-icons/lu';
import toast from 'react-hot-toast';

// TEMPORÁRIO (fase de teste): guarda o áudio no armazenamento até o sistema estar 100%.
// Padrão de LGPD é NÃO guardar o áudio (só a transcrição) — trocar para false para voltar.
const MANTER_AUDIO = true;

interface ConsultationRecorderProps {
  appointmentId: string;
  recordingId?: string;
  onRecordingCreated?: (recording: any) => void;
  onTranscriptionComplete?: (transcription: string) => void;
  onAnalysisComplete?: (analysis: any) => void;
}

export default function ConsultationRecorder({
  appointmentId,
  recordingId: existingRecordingId,
  onRecordingCreated,
  onTranscriptionComplete,
  onAnalysisComplete}: ConsultationRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingId, setRecordingId] = useState(existingRecordingId || '');
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [status, setStatus] = useState<string>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [manualTranscription, setManualTranscription] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [storedAudioUrl, setStoredAudioUrl] = useState(''); // áudio salvo no armazenamento (fase de teste)
  // BLINDAGEM (fase de teste): salvar o áudio JÁ ao finalizar, e nunca falhar em silêncio.
  const [audioSalvo, setAudioSalvo] = useState(false);      // áudio subiu + registro criado
  const [salvandoAudio, setSalvandoAudio] = useState(false);
  const [erroSalvar, setErroSalvar] = useState('');
  const [copiaBaixada, setCopiaBaixada] = useState(false); // cópia local baixada no computador

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const salvouRef = useRef(false); // garante que o auto-salvamento roda uma vez por gravação

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100}});
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'});
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      // nova gravação: zera os controles de salvamento
      salvouRef.current = false;
      setAudioSalvo(false);
      setErroSalvar('');
      setStoredAudioUrl('');
      setCopiaBaixada(false);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setStatus('recording');

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      toast.success('Gravação iniciada! Fale naturalmente durante a consulta.');
    } catch (err) {
      console.error('Error accessing microphone:', err);
      toast.error('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
  }, []);

  // Pause/Resume recording
  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      setIsPaused(false);
      setStatus('recording');
    } else {
      mediaRecorderRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setIsPaused(true);
      setStatus('paused');
    }
  }, [isPaused]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
      setIsPaused(false);
      setStatus('stopped');
      toast.success(`Gravação finalizada! Duração: ${formatTime(recordingTime)}`);
    }
  }, [isRecording, recordingTime]);

  // REDE DE SEGURANÇA: baixa uma CÓPIA LOCAL do áudio no computador (pasta Downloads).
  // Segunda via à prova de tudo — mesmo que internet/servidor falhem, o áudio sempre
  // existe num arquivo. Nome claro: consulta-AAAA-MM-DD-HHMM.webm
  const baixarCopiaLocal = (blob: Blob | null) => {
    if (!blob) return;
    try {
      const d = new Date();
      const z = (n: number) => n.toString().padStart(2, '0');
      const nome = `consulta-${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}.webm`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = nome;
      document.body.appendChild(a); a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
      setCopiaBaixada(true);
    } catch { /* silencioso — a cópia é um extra */ }
  };

  // BLINDAGEM ponto 1: salva o áudio e cria o registro AUTOMATICAMENTE ao finalizar,
  // sem depender de clicar em "Transcrever". Assim, mesmo que a pessoa saia da tela,
  // a gravação não se perde. Se algo falhar, mostra aviso vermelho (nunca em silêncio).
  const salvarAudioERegistro = async (blob: Blob) => {
    if (!blob) return;
    setSalvandoAudio(true);
    setErroSalvar('');
    try {
      let audioUrlSalvo = storedAudioUrl;
      if (MANTER_AUDIO && !audioUrlSalvo) {
        const fd = new FormData();
        fd.append('file', blob, `consulta-${appointmentId}-${recordingTime}s.webm`);
        const up = await fetch('/api/media/upload?pasta=documentos', { method: 'POST', body: fd });
        const ud = await up.json().catch(() => ({}));
        if (up.ok && ud?.url) { audioUrlSalvo = ud.url; setStoredAudioUrl(ud.url); }
        else throw new Error('Falha ao enviar o áudio para o armazenamento.');
      }
      let rid = recordingId;
      if (!rid) {
        const cr = await fetch('/api/consultation-recordings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appointmentId, ...(audioUrlSalvo ? { audioUrl: audioUrlSalvo, audioFileName: 'consulta.webm', audioDuration: recordingTime } : {}) }) });
        if (!cr.ok) throw new Error('Falha ao criar o registro da gravação.');
        const cd = await cr.json(); rid = cd.id; setRecordingId(cd.id); onRecordingCreated?.(cd);
      } else if (audioUrlSalvo) {
        // registro já existe — anexa o áudio a ele (best-effort)
        await fetch(`/api/consultation-recordings/${rid}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'audio', audioUrl: audioUrlSalvo, audioDuration: recordingTime }) }).catch(() => {});
      }
      setAudioSalvo(true);
      toast.success('Áudio salvo com segurança ✅');
    } catch {
      setAudioSalvo(false);
      setErroSalvar('Não foi possível salvar o áudio. NÃO feche a página — clique em "Salvar áudio de novo".');
      toast.error('⚠️ O áudio ainda NÃO foi salvo!');
    } finally {
      setSalvandoAudio(false);
    }
  };

  // Assim que a gravação finaliza (blob pronto), dispara o auto-salvamento uma vez.
  useEffect(() => {
    if (audioBlob && !salvouRef.current) {
      salvouRef.current = true;
      baixarCopiaLocal(audioBlob);          // cópia local automática (segunda via)
      void salvarAudioERegistro(audioBlob);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob]);

  // BLINDAGEM ponto 3: avisa antes de fechar/atualizar a página se houver áudio não salvo.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (audioBlob && !audioSalvo) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [audioBlob, audioSalvo]);

  // Upload audio and transcribe via Whisper (main flow)
  const uploadAndTranscribe = useCallback(async () => {
    if (!audioBlob) {
      toast.error('Nenhum áudio gravado');
      return;
    }

    setIsTranscribing(true);
    setStatus('transcribing');
    setUploadProgress(0);

    try {
      // 1) Cria o registro da gravação ANTES de enviar o áudio. Assim, se a transcrição
      //    falhar (áudio grande, timeout…), a gravação NÃO some — fica salva pra tentar
      //    de novo ou preencher a transcrição manualmente.
      // Fase de teste: sobe o áudio pro armazenamento ANTES, pra ficar guardado (e ouvível
      // depois). Se falhar, segue só com a transcrição — não trava a consulta.
      // Se o áudio já foi salvo ao finalizar (blindagem), reaproveita — não sobe de novo.
      let audioUrlSalvo = storedAudioUrl;
      if (MANTER_AUDIO && !audioUrlSalvo) {
        try {
          const fd = new FormData();
          fd.append('file', audioBlob, `consulta-${appointmentId}-${recordingTime}s.webm`);
          const up = await fetch('/api/media/upload?pasta=documentos', { method: 'POST', body: fd });
          const ud = await up.json().catch(() => ({}));
          if (up.ok && ud?.url) { audioUrlSalvo = ud.url; setStoredAudioUrl(ud.url); }
        } catch { /* guardar o áudio é best-effort na fase de teste */ }
      }

      let rid = recordingId;
      if (!rid) {
        const cr = await fetch('/api/consultation-recordings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appointmentId, ...(audioUrlSalvo ? { audioUrl: audioUrlSalvo, audioFileName: 'consulta.webm', audioDuration: recordingTime } : {}) }) });
        if (!cr.ok) {
          const e = await cr.json().catch(() => ({}));
          toast.error(e.error || e.message || 'Não consegui criar a gravação.');
          setStatus('stopped');
          return;
        }
        const cd = await cr.json();
        rid = cd.id; setRecordingId(cd.id); onRecordingCreated?.(cd);
      }

      const formData = new FormData();
      formData.append('audio', audioBlob, 'consulta.webm');
      formData.append('audioDuration', recordingTime.toString());
      formData.append('language', 'pt');
      setUploadProgress(30);

      // 2) Envia o áudio pra transcrever (o registro rid já existe).
      const res = await fetch(`/api/consultation-recordings/${rid}/upload-and-transcribe`, {
        method: 'POST',
        body: formData});

      setUploadProgress(80);

      if (res.ok) {
        const data = await res.json();
        setRecordingId(data.id);
        onRecordingCreated?.(data);

        if (data.transcription) {
          setTranscription(data.transcription);
          setStatus('transcribed');
          onTranscriptionComplete?.(data.transcription);
          toast.success('Transcrição por IA (Whisper) concluída!');
        } else {
          setStatus('stopped');
          toast.error('Transcrição vazia. Tente inserir manualmente.');
        }
      } else {
        const error = await res.json().catch(() => ({}));
        const msg = error.error || error.message || (res.status === 413 ? 'Áudio muito grande (máx. 25MB) — grave em partes.' : 'Erro na transcrição.');
        toast.error(`${msg} A gravação foi salva — dá pra tentar de novo ou inserir manual.`);
        setStatus('stopped');
      }

      setUploadProgress(100);
    } catch (err) {
      console.error('Upload and transcribe error:', err);
      toast.error('Erro ao enviar o áudio (conexão/tamanho?). A gravação foi salva — tente de novo.');
      setStatus('stopped');
    } finally {
      setIsTranscribing(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }, [audioBlob, recordingId, appointmentId, recordingTime, onRecordingCreated, onTranscriptionComplete]);

  // Upload transcription manually
  const uploadManualTranscription = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      setIsTranscribing(true);
      try {
        let currentRecordingId = recordingId;

        if (!currentRecordingId) {
          const createRes = await fetch('/api/consultation-recordings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appointmentId })});
          if (createRes.ok) {
            const data = await createRes.json();
            currentRecordingId = data.id;
            setRecordingId(data.id);
            onRecordingCreated?.(data);
          } else {
            toast.error('Erro ao criar gravação');
            return;
          }
        }

        const res = await fetch(`/api/consultation-recordings/${currentRecordingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'transcription',
            transcription: text,
            audioDuration: recordingTime || undefined})});

        if (res.ok) {
          setTranscription(text);
          setStatus('transcribed');
          onTranscriptionComplete?.(text);
          toast.success('Transcrição salva com sucesso!');
        } else {
          toast.error('Erro ao salvar transcrição');
        }
      } catch {
        toast.error('Erro ao salvar transcrição');
      } finally {
        setIsTranscribing(false);
      }
    },
    [recordingId, appointmentId, recordingTime, onRecordingCreated, onTranscriptionComplete]
  );

  // Analyze transcription via AI
  const analyzeTranscription = useCallback(async () => {
    if (!recordingId || !transcription) return;

    setIsAnalyzing(true);
    setStatus('analyzing');

    try {
      const res = await fetch(`/api/consultation-recordings/${recordingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze' })});

      if (res.ok) {
        const data = await res.json();
        let parsedAnalysis: any = null;
        try {
          parsedAnalysis = data.aiAnalysis ? JSON.parse(data.aiAnalysis) : null;
        } catch {
          parsedAnalysis = { raw: data.aiAnalysis };
        }
        setAnalysis(parsedAnalysis);
        setStatus('analyzed');
        onAnalysisComplete?.(parsedAnalysis);
        toast.success('Análise da consulta concluída!');
      } else {
        const error = await res.json().catch(() => ({}));
        toast.error(error.error || 'Erro na análise');
        setStatus('transcribed');
      }
    } catch {
      toast.error('Erro na análise da consulta');
      setStatus('transcribed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [recordingId, transcription, onAnalysisComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  return (
    <div className="space-y-6">
      {/* Recording Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span style={{fontSize:"14px"}}>🎤</span>
            Gravação da Consulta
          </h3>
          {status !== 'idle' && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                status === 'recording'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse'
                  : status === 'paused'
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : status === 'stopped'
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                  : status === 'transcribed' || status === 'analyzed'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              }`}
            >
              {status === 'recording'
                ? 'Gravando...'
                : status === 'paused'
                ? 'Pausado'
                : status === 'stopped'
                ? 'Gravação Finalizada'
                : status === 'transcribing'
                ? 'Transcrevendo via Whisper...'
                : status === 'transcribed'
                ? 'Transcrito'
                : status === 'analyzing'
                ? 'Analisando...'
                : status === 'analyzed'
                ? 'Analisado'
                : ''}
            </span>
          )}
        </div>

        {/* Timer */}
        {(isRecording || recordingTime > 0) && (
          <div className="flex items-center justify-center mb-6">
            <div className="text-center">
              <div
                className={`text-5xl font-mono font-bold ${
                  isRecording && !isPaused ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {formatTime(recordingTime)}
              </div>
              {isRecording && !isPaused && (
                <div className="flex items-center justify-center gap-1 mt-2">
                  <span style={{fontSize:"14px"}}>〰</span>
                  <span className="text-sm text-red-500">Capturando áudio...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
              <span>Enviando áudio para transcrição...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-violet-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* BLINDAGEM: status do salvamento do áudio (salvando / erro / salvo) + cópia local */}
        {(salvandoAudio || erroSalvar || audioSalvo || audioBlob) && (
          <div className="mb-4">
            {salvandoAudio && (
              <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                <LuLoader className="w-4 h-4 animate-spin" /> Salvando o áudio com segurança…
              </div>
            )}
            {!salvandoAudio && erroSalvar && (
              <div className="flex items-center justify-between gap-3 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg px-3 py-2">
                <span>⚠️ {erroSalvar}</span>
                <button onClick={() => audioBlob && salvarAudioERegistro(audioBlob)} className="shrink-0 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">
                  Salvar áudio de novo
                </button>
              </div>
            )}
            {!salvandoAudio && !erroSalvar && audioSalvo && (
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
                <LuCheck className="w-4 h-4" /> Áudio salvo com segurança — pode transcrever ou sair sem perder.
              </div>
            )}
            {/* REDE DE SEGURANÇA: cópia local no computador (segunda via) */}
            {audioBlob && (
              <div className="flex items-center justify-between gap-3 text-xs text-gray-600 dark:text-gray-300 mt-2">
                <span className="flex items-center gap-1.5">
                  {copiaBaixada
                    ? <><span style={{ fontSize: '14px' }}>📥</span> Cópia salva no seu computador (pasta Downloads).</>
                    : <><span style={{ fontSize: '14px' }}>💾</span> Ao finalizar, uma cópia do áudio é baixada no seu computador.</>}
                </span>
                <button onClick={() => audioBlob && baixarCopiaLocal(audioBlob)} className="shrink-0 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
                  📥 Baixar cópia
                </button>
              </div>
            )}
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-4">
          {/* Start recording */}
          {!isRecording && status === 'idle' && (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl"
            >
              <span style={{fontSize:"14px"}}>🎤</span>
              Iniciar Gravação
            </button>
          )}

          {/* While recording: pause/stop */}
          {isRecording && (
            <>
              <button
                onClick={togglePause}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
                  isPaused
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                }`}
              >
                {isPaused ? <span style={{fontSize:"14px"}}>▶</span> : <span style={{fontSize:"14px"}}>⏸</span>}
                {isPaused ? 'Continuar' : 'Pausar'}
              </button>
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-5 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-xl font-medium transition-all"
              >
                <span style={{fontSize:"14px"}}>◼</span>
                Finalizar
              </button>
            </>
          )}

          {/* After recording stopped: transcribe options */}
          {!isRecording && status === 'stopped' && audioBlob && !transcription && (
            <div className="flex flex-col items-center gap-4 w-full">
              {/* Audio playback */}
              {audioUrl && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg w-full max-w-md">
                  <span style={{fontSize:"14px"}}>🔊</span>
                  <audio controls src={audioUrl} className="w-full h-8" />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={uploadAndTranscribe}
                  disabled={isTranscribing}
                  className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
                >
                  {isTranscribing ? (
                    <LuLoader className="w-5 h-5 animate-spin" />
                  ) : (
                    <span style={{fontSize:"14px"}}>🧠</span>
                  )}
                  {isTranscribing ? 'Transcrevendo via Whisper...' : 'Transcrever via IA (Whisper)'}
                </button>
                <button
                  onClick={() => setShowManualInput(true)}
                  disabled={isTranscribing}
                  className="flex items-center gap-2 px-5 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all disabled:opacity-50"
                >
                  <LuUpload className="w-5 h-5" />
                  Transcrição Manual
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Prompt to start */}
        {status === 'idle' && !recordingId && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Clique em &quot;Iniciar Gravação&quot; para capturar o áudio da consulta. Ao
              finalizar, o áudio será automaticamente enviado para transcrição via IA (Whisper da
              OpenAI).
            </p>
            <button
              onClick={() => setShowManualInput(true)}
              className="mt-2 text-sm text-violet-600 hover:text-violet-700 underline"
            >
              Pular gravação e inserir transcrição manualmente
            </button>
          </div>
        )}
      </div>

      {/* Manual Transcription Input */}
      {showManualInput && !transcription && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Transcrição Manual
          </h3>
          <textarea
            value={manualTranscription}
            onChange={(e) => setManualTranscription(e.target.value)}
            placeholder="Cole ou digite a transcrição da consulta aqui..."
            className="w-full h-48 p-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white resize-y focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <div className="flex justify-end gap-3 mt-3">
            <button
              onClick={() => setShowManualInput(false)}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800"
            >
              Cancelar
            </button>
            <button
              onClick={() => uploadManualTranscription(manualTranscription)}
              disabled={!manualTranscription.trim() || isTranscribing}
              className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {isTranscribing ? (
                <LuLoader className="w-4 h-4 animate-spin" />
              ) : (
                <LuCheck className="w-4 h-4" />
              )}
              Salvar Transcrição
            </button>
          </div>
        </div>
      )}

      {/* Transcription Display */}
      {transcription && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <LuCheck className="w-5 h-5 text-green-500" />
              Transcrição da Consulta
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span style={{fontSize:"14px"}}>⏱</span>
              {recordingTime > 0 ? formatTime(recordingTime) : 'Manual'}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg max-h-60 overflow-y-auto">
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {transcription}
            </p>
          </div>

          {/* Fase de teste: áudio guardado — dá pra reouvir e conferir a transcrição. */}
          {MANTER_AUDIO && (storedAudioUrl || audioUrl) && (
            <div className="mt-3 flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <span style={{fontSize:"14px"}}>🔊</span>
              <audio controls src={storedAudioUrl || audioUrl} className="w-full h-8" />
              <span className="text-[11px] text-gray-400 whitespace-nowrap">{storedAudioUrl ? 'áudio guardado' : 'áudio da sessão'}</span>
            </div>
          )}

          {/* Analyze Button */}
          {!analysis && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={analyzeTranscription}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 shadow-lg"
              >
                {isAnalyzing ? (
                  <LuLoader className="w-5 h-5 animate-spin" />
                ) : (
                  <span style={{fontSize:"14px"}}>🧠</span>
                )}
                {isAnalyzing ? 'Analisando consulta...' : 'Analisar com IA'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* AI Analysis Results */}
      {analysis && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-violet-200 dark:border-violet-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span style={{fontSize:"14px"}}>🧠</span>
            Análise da IA
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.resumo && (
              <div className="col-span-full p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                <h4 className="text-sm font-semibold text-violet-700 dark:text-violet-400 mb-1">
                  Resumo
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">{analysis.resumo}</p>
              </div>
            )}

            {analysis.queixaPrincipal && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Queixa Principal
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {analysis.queixaPrincipal}
                </p>
              </div>
            )}

            {analysis.diagnostico && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Diagnóstico
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">{analysis.diagnostico}</p>
              </div>
            )}

            {analysis.sintomasRelatados?.length > 0 && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Sintomas
                </h4>
                <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
                  {analysis.sintomasRelatados.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.tratamento?.medicamentos?.length > 0 && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg col-span-full">
                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  Medicamentos
                </h4>
                <div className="space-y-2">
                  {analysis.tratamento.medicamentos.map((med: any, i: number) => (
                    <div
                      key={i}
                      className="text-sm text-gray-700 dark:text-gray-300 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                    >
                      <strong>{med.nome}</strong>
                      {med.dosagem && <span> — {med.dosagem}</span>}
                      {med.frequencia && <span> — {med.frequencia}</span>}
                      {med.duracao && <span> — {med.duracao}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.examesSolicitados?.length > 0 && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Exames Solicitados
                </h4>
                <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
                  {analysis.examesSolicitados.map((e: string, i: number) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.retorno && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Retorno
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">{analysis.retorno}</p>
              </div>
            )}

            {analysis.observacoes && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg col-span-full">
                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Observações
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">{analysis.observacoes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
