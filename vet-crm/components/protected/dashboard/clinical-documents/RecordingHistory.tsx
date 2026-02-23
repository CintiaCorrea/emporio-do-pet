'use client';

import { useState, useEffect } from 'react';
import {
  Mic,
  Clock,
  FileText,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Calendar,
  Loader2,
  Sparkles,
  CheckCircle,
  AlertCircle,
  History,
  Volume2,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Recording {
  id: string;
  appointmentId: string;
  audioUrl?: string;
  audioDuration?: number;
  transcription?: string;
  aiAnalysis?: string;
  status: 'RECORDING' | 'PROCESSING' | 'TRANSCRIBED' | 'ANALYZED' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

interface RecordingHistoryProps {
  appointmentId: string;
  onSelectRecording?: (recording: Recording) => void;
  currentRecordingId?: string;
}

export default function RecordingHistory({
  appointmentId,
  onSelectRecording,
  currentRecordingId,
}: RecordingHistoryProps) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchRecordings();
  }, [appointmentId]);

  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [audioElement]);

  const fetchRecordings = async () => {
    try {
      const res = await fetch(`/api/consultation-recordings/appointment/${appointmentId}`);
      if (res.ok) {
        const data = await res.json();
        setRecordings(Array.isArray(data) ? data : data.recordings || []);
      }
    } catch (err) {
      console.error('Error fetching recordings:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'ANALYZED':
        return { label: 'Completo', color: 'green', icon: CheckCircle };
      case 'TRANSCRIBED':
        return { label: 'Transcrito', color: 'blue', icon: FileText };
      case 'PROCESSING':
        return { label: 'Processando', color: 'yellow', icon: Loader2 };
      case 'RECORDING':
        return { label: 'Gravando', color: 'red', icon: Mic };
      case 'FAILED':
        return { label: 'Falhou', color: 'red', icon: AlertCircle };
      default:
        return { label: status, color: 'gray', icon: Clock };
    }
  };

  const handlePlay = async (recording: Recording) => {
    if (!recording.audioUrl) {
      toast.error('Áudio não disponível');
      return;
    }

    if (playingId === recording.id && audioElement) {
      audioElement.pause();
      setPlayingId(null);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(recording.audioUrl);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => {
      toast.error('Erro ao reproduzir áudio');
      setPlayingId(null);
    };
    
    setAudioElement(audio);
    setPlayingId(recording.id);
    audio.play();
  };

  const handleSelect = (recording: Recording) => {
    onSelectRecording?.(recording);
    toast.success('Gravação selecionada');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Nenhuma gravação encontrada para esta consulta</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-violet-600" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Histórico de Gravações
        </h3>
        <span className="text-sm text-gray-500">({recordings.length})</span>
      </div>

      {recordings.map((recording) => {
        const statusInfo = getStatusInfo(recording.status);
        const StatusIcon = statusInfo.icon;
        const isExpanded = expanded === recording.id;
        const isPlaying = playingId === recording.id;
        const isCurrent = currentRecordingId === recording.id;

        return (
          <div
            key={recording.id}
            className={`bg-white dark:bg-gray-800 rounded-xl border transition-all ${
              isCurrent
                ? 'border-violet-500 ring-2 ring-violet-500/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            {/* Header */}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    isCurrent ? 'bg-violet-100 dark:bg-violet-900/30' : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <Mic className={`w-5 h-5 ${isCurrent ? 'text-violet-600' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-gray-900 dark:text-white">
                        Gravação {formatDate(recording.createdAt)}
                      </p>
                      {isCurrent && (
                        <span className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 px-2 py-0.5 rounded-full">
                          Atual
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(recording.audioDuration)}
                      </span>
                      <span className={`flex items-center gap-1 ${
                        statusInfo.color === 'green' ? 'text-green-600' :
                        statusInfo.color === 'blue' ? 'text-blue-600' :
                        statusInfo.color === 'yellow' ? 'text-yellow-600' :
                        statusInfo.color === 'red' ? 'text-red-600' : ''
                      }`}>
                        <StatusIcon className={`w-3 h-3 ${recording.status === 'PROCESSING' ? 'animate-spin' : ''}`} />
                        {statusInfo.label}
                      </span>
                      {recording.transcription && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <FileText className="w-3 h-3" />
                          Transcrição
                        </span>
                      )}
                      {recording.aiAnalysis && (
                        <span className="flex items-center gap-1 text-purple-600">
                          <Sparkles className="w-3 h-3" />
                          Análise IA
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {recording.audioUrl && (
                    <button
                      onClick={() => handlePlay(recording)}
                      className={`p-2 rounded-lg transition-colors ${
                        isPlaying
                          ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500'
                      }`}
                      title={isPlaying ? 'Pausar' : 'Reproduzir'}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  )}
                  
                  {!isCurrent && (recording.transcription || recording.aiAnalysis) && (
                    <button
                      onClick={() => handleSelect(recording)}
                      className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      Usar Esta
                    </button>
                  )}

                  <button
                    onClick={() => setExpanded(isExpanded ? null : recording.id)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
                {/* Audio Player */}
                {recording.audioUrl && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <Volume2 className="w-4 h-4 text-gray-500" />
                      <audio
                        controls
                        src={recording.audioUrl}
                        className="flex-1 h-8"
                        style={{ minWidth: 0 }}
                      />
                    </div>
                  </div>
                )}

                {/* Transcription */}
                {recording.transcription && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Transcrição
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-400 max-h-40 overflow-y-auto">
                      {recording.transcription}
                    </div>
                  </div>
                )}

                {/* AI Analysis */}
                {recording.aiAnalysis && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      Análise da IA
                    </h4>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-400 max-h-40 overflow-y-auto">
                      {typeof recording.aiAnalysis === 'string' 
                        ? recording.aiAnalysis 
                        : JSON.stringify(recording.aiAnalysis, null, 2)}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {!isCurrent && (recording.transcription || recording.aiAnalysis) && (
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => handleSelect(recording)}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm"
                    >
                      <Sparkles className="w-4 h-4" />
                      Usar para Gerar Documentos
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
