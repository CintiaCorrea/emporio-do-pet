'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  LuLoader,
  LuCheck,
  LuFileText
} from 'react-icons/lu';
import toast from 'react-hot-toast';

type InputMode = 'select' | 'audio' | 'text';

interface DocumentRecorderProps {
  onTranscriptionComplete: (transcription: string, audioDuration? (() => null) : number) => void;
  onContentGenerated?: (content: string) => void;
}

export default function DocumentRecorder({
  onTranscriptionComplete}: DocumentRecorderProps) {
  const [inputMode, setInputMode] = useState<InputMode>('select');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [status, setStatus] = useState<string>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [textContent, setTextContent] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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

      toast.success('Gravação iniciada! Fale o conteúdo do documento.');
    } catch (err) {
      console.error('Error accessing microphone:', err);
      toast.error('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
  }, []);

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

  const uploadAndTranscribe = useCallback(async () => {
    if (!audioBlob) {
      toast.error('Nenhum áudio gravado');
      return;
    }

    setIsTranscribing(true);
    setStatus('transcribing');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'documento.webm');
      formData.append('language', 'pt');

      setUploadProgress(30);

      const res = await fetch('/api/audio/transcribe', {
        method: 'POST',
        body: formData});

      setUploadProgress(80);

      if (res.ok) {
        const data = await res.json();

        if (data.text) {
          setStatus('transcribed');
          onTranscriptionComplete(data.text, recordingTime);
          toast.success('Transcrição concluída! Avançando para geração de documentos...');
        } else {
          setStatus('stopped');
          toast.error('Transcrição vazia. Tente novamente.');
        }
      } else {
        const error = await res.json().catch(() => ({}));
        toast.error(error.error || 'Erro na transcrição.');
        setStatus('stopped');
      }

      setUploadProgress(100);
    } catch (err) {
      console.error('Upload and transcribe error:', err);
      toast.error('Erro ao enviar áudio. Verifique sua conexão.');
      setStatus('stopped');
    } finally {
      setIsTranscribing(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }, [audioBlob, onTranscriptionComplete, recordingTime]);

  const submitTextContent = useCallback(() => {
    if (!textContent.trim()) {
      toast.error('Digite o conteúdo do documento');
      return;
    }
    onTranscriptionComplete(textContent.trim(), undefined);
    toast.success('Texto salvo! Avançando para geração de documentos...');
  }, [textContent, onTranscriptionComplete]);

  const resetAll = useCallback(() => {
    setInputMode('select');
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setStatus('idle');
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl('');
    setTextContent('');
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Mode Selection Screen
  if (inputMode === 'select') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Como você deseja criar o documento?
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Escolha o método de entrada para o conteúdo base do seu documento
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Audio Option */}
          <button
            onClick={() => setInputMode('audio')}
            className="group p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-red-400 dark:hover:border-red-500 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 transition-all hover:shadow-lg"
          >
            <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <span style={{fontSize:"14px"}}>🎤</span>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Gravar Áudio
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Grave sua voz e deixe a IA transcrever automaticamente usando Whisper
            </p>
            <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium">
              Começar gravação
              <span style={{fontSize:"14px"}}>→</span>
            </div>
          </button>

          {/* Text Option */}
          <button
            onClick={() => setInputMode('text')}
            className="group p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 transition-all hover:shadow-lg"
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <span style={{fontSize:"14px"}}>✏</span>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Digitar Texto
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Escreva ou cole o conteúdo base que será transformado em documento
            </p>
            <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-medium">
              Começar a digitar
              <span style={{fontSize:"14px"}}>→</span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Audio Recording Mode
  if (inputMode === 'audio') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <span style={{fontSize:"14px"}}>🎤</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Gravação de Áudio
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Grave o conteúdo e transcreva com IA
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {status !== 'idle' && (
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  status === 'recording'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse'
                    : status === 'paused'
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : status === 'stopped'
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    : status === 'transcribing'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}
              >
                {status === 'recording'
                  ? 'Gravando...'
                  : status === 'paused'
                  ? 'Pausado'
                  : status === 'stopped'
                  ? 'Finalizado'
                  : status === 'transcribing'
                  ? 'Transcrevendo...'
                  : 'Transcrito'}
              </span>
            )}
            <button
              onClick={resetAll}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Voltar
            </button>
          </div>
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
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-4">
          {/* Start recording */}
          {!isRecording && status === 'idle' && (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-medium transition-all shadow-lg hover:shadow-xl text-lg"
            >
              <span style={{fontSize:"14px"}}>🎤</span>
              Iniciar Gravação
            </button>
          )}

          {/* While recording */}
          {isRecording && (
            <>
              <button
                onClick={togglePause}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
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
                className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-xl font-medium transition-all"
              >
                <span style={{fontSize:"14px"}}>◼</span>
                Finalizar
              </button>
            </>
          )}

          {/* After recording stopped */}
          {!isRecording && status === 'stopped' && audioBlob && (
            <div className="flex flex-col items-center gap-4 w-full">
              {audioUrl && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg w-full max-w-md">
                  <span style={{fontSize:"14px"}}>🔊</span>
                  <audio controls src={audioUrl} className="w-full h-8" />
                </div>
              )}
              <button
                onClick={uploadAndTranscribe}
                disabled={isTranscribing}
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-2xl font-medium transition-all disabled:opacity-50 shadow-lg hover:shadow-xl text-lg"
              >
                {isTranscribing ? (
                  <LuLoader className="w-6 h-6 animate-spin" />
                ) : (
                  <span style={{fontSize:"14px"}}>🧠</span>
                )}
                {isTranscribing ? 'Transcrevendo...' : 'Transcrever com IA (Whisper)'}
              </button>
            </div>
          )}
        </div>

        {/* Help text */}
        {status === 'idle' && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Clique em &quot;Iniciar Gravação&quot; para capturar o áudio.
            <br />
            Após finalizar, o áudio será enviado para transcrição via IA.
          </p>
        )}
      </div>
    );
  }

  // Text Input Mode
  if (inputMode === 'text') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <span style={{fontSize:"14px"}}>✏</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Entrada de Texto
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Digite ou cole o conteúdo base do documento
              </p>
            </div>
          </div>
          <button
            onClick={resetAll}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Voltar
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Conteúdo Base
            </label>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Digite aqui o conteúdo que servirá de base para a geração do documento...

Exemplo:
- Paciente: Max, Golden Retriever, 5 anos
- Tutor: João Silva
- Queixa: Vômitos frequentes há 2 dias
- Observações: Perdeu apetite, estava letárgico..."
              className="w-full h-64 p-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {textContent.length} caracteres
            </p>
            <button
              onClick={submitTextContent}
              disabled={!textContent.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              <span style={{fontSize:"14px"}}>→</span>
              Continuar para Geração
            </button>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
            <LuFileText className="w-4 h-4" />
            Dica
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Inclua informações como: nome do paciente, espécie, idade, sintomas, diagnóstico, tratamento prescrito, etc. 
            A IA usará essas informações para gerar documentos formatados profissionalmente.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
