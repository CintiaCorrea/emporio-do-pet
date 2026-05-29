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
  Loader2,
  Sparkles,
  CheckCircle,
  History,
  Volume2,
  Trash2} from 'lucide-react';
import toast from 'react-hot-toast';

interface RecordingEntry {
  id: string;
  transcription: string;
  audioDuration?: number;
  createdAt: string;
  audioUrl?: string;
}

interface DocumentRecordingHistoryProps {
  onSelectRecording?: (recording: RecordingEntry) => void;
}

const STORAGE_KEY = 'document_recording_history';
const MAX_HISTORY_ITEMS = 20;

export default function DocumentRecordingHistory({
  onSelectRecording}: DocumentRecordingHistoryProps) {
  const [recordings, setRecordings] = useState<RecordingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadRecordings();
  }, []);

  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [audioElement]);

  const loadRecordings = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as RecordingEntry[];
        setRecordings(parsed.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      }
    } catch (err) {
      console.error('Error loading recording history:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveRecording = (entry: Omit<RecordingEntry, 'id' | 'createdAt'>) => {
    const newEntry: RecordingEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()};

    const updated = [newEntry, ...recordings].slice(0, MAX_HISTORY_ITEMS);
    setRecordings(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newEntry;
  };

  const deleteRecording = (id: string) => {
    const updated = recordings.filter((r) => r.id !== id);
    setRecordings(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    toast.success('Gravação removida do histórico');
  };

  const clearAll = () => {
    if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
      setRecordings([]);
      localStorage.removeItem(STORAGE_KEY);
      toast.success('Histórico limpo');
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
      minute: '2-digit'});
  };

  const handlePlay = async (recording: RecordingEntry) => {
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

  const handleSelect = (recording: RecordingEntry) => {
    onSelectRecording?.(recording);
    toast.success('Transcrição selecionada');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Nenhuma gravação no histórico</p>
        <p className="text-xs text-gray-400 mt-1">
          Suas transcrições recentes aparecerão aqui
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Histórico de Gravações
          </h3>
          <span className="text-sm text-gray-500">({recordings.length})</span>
        </div>
        <button
          onClick={clearAll}
          className="text-sm text-red-500 hover:text-red-600 font-medium"
        >
          Limpar Histórico
        </button>
      </div>

      {recordings.map((recording) => {
        const isExpanded = expanded === recording.id;
        const isPlaying = playingId === recording.id;

        return (
          <div
            key={recording.id}
            className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all"
          >
            {/* Header */}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <Mic className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">
                      Gravação {formatDate(recording.createdAt)}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(recording.audioDuration)}
                      </span>
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-3 h-3" />
                        Transcrito
                      </span>
                      <span className="flex items-center gap-1 text-blue-600">
                        <FileText className="w-3 h-3" />
                        {recording.transcription.length} caracteres
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {recording.audioUrl && (
                    <button
                      onClick={() => handlePlay(recording)}
                      className={`p-2 rounded-lg transition-colors ${
                        isPlaying
                          ? 'bg-blue-100 text-blue-600'
                          : 'hover:bg-gray-100 text-gray-500'
                      }`}
                      title={isPlaying ? 'Pausar' : 'Reproduzir'}
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => handleSelect(recording)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    Usar Esta
                  </button>

                  <button
                    onClick={() => deleteRecording(recording.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setExpanded(isExpanded ? null : recording.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="border-t border-gray-200 p-4 space-y-4">
                {/* Audio Player */}
                {recording.audioUrl && (
                  <div className="bg-gray-50 rounded-lg p-3">
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
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Transcrição
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 max-h-40 overflow-y-auto">
                    {recording.transcription}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => handleSelect(recording)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-medium rounded-lg transition-all shadow-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    Usar para Gerar Documento
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function addToRecordingHistory(entry: Omit<RecordingEntry, 'id' | 'createdAt'>) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const recordings: RecordingEntry[] = stored ? JSON.parse(stored) : [];
    
    const newEntry: RecordingEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()};

    const updated = [newEntry, ...recordings].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newEntry;
  } catch (err) {
    console.error('Error saving to recording history:', err);
    return null;
  }
}
