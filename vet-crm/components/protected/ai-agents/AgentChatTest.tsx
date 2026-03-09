'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  LuSend, 
  LuBot, 
  LuUser, 
  LuLoader, 
  LuTrash2,
  LuCopy,
  LuCheck,
  LuInfo,
  LuChevronDown,
  LuChevronUp,
  LuMic,
  LuMicOff,
  LuVolume2,
  LuPause,
  LuMessageSquare,
  LuZap,
} from 'react-icons/lu';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  audioBase64?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latencyMs?: number;
}

interface AgentContext {
  clinicName?: string;
  tutorName?: string;
  petName?: string;
  petSpecies?: string;
  currentDate?: string;
  customVariable?: string;
}

interface VoiceSettings {
  enabled: boolean;
  voiceId: string;
  speed: number;
  model: string;
}

interface AgentChatTestProps {
  agentId: string;
  agentName: string;
  systemPrompt: string;
  provider: string;
  model: string;
  voiceEnabled?: boolean;
  voiceId?: string;
  voiceSpeed?: number;
  voiceModel?: string;
  onClose?: () => void;
}

export default function AgentChatTest({ 
  agentId, 
  agentName, 
  systemPrompt,
  provider,
  model,
  voiceEnabled = false,
  voiceId = 'nova',
  voiceSpeed = 1.0,
  voiceModel = 'tts-1',
  onClose 
}: AgentChatTestProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [context, setContext] = useState<AgentContext>({
    clinicName: 'Empório do Pet',
    tutorName: '',
    petName: '',
    petSpecies: 'cachorro',
    currentDate: new Date().toLocaleDateString('pt-BR'),
  });

  // Streaming state
  const [streamingEnabled, setStreamingEnabled] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  // Voice/Audio state
  const [voiceMode, setVoiceMode] = useState(voiceEnabled);
  const [voice, setVoice] = useState<VoiceSettings>({
    enabled: voiceEnabled,
    voiceId,
    speed: voiceSpeed,
    model: voiceModel,
  });
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [synthesizing, setSynthesizing] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = input.trim();
    setInput('');
    setLoading(true);

    await sendToAgent(messageText, userMessage.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([]);
    stopAudio();
    toast.success('Conversa limpa');
  };

  // ============================
  // Audio Recording (Microphone)
  // ============================
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        if (audioBlob.size < 1000) {
          toast.error('Gravação muito curta');
          return;
        }

        // Transcribe the audio
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Não foi possível acessar o microfone. Verifique as permissões.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  }, [isRecording]);

  const transcribeAudio = async (audioBlob: Blob) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('language', 'pt');

      const response = await fetch('/api/audio/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro na transcrição');
      }

      const transcribedText = data.text?.trim();
      if (!transcribedText) {
        toast.error('Não foi possível transcrever o áudio');
        setLoading(false);
        return;
      }

      // Add as user message and send to agent
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: `🎤 ${transcribedText}`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMessage]);
      await sendToAgent(transcribedText, userMessage.id);
    } catch (error) {
      console.error('Error transcribing:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao transcrever áudio');
      setLoading(false);
    }
  };

  // ============================
  // TTS Playback
  // ============================
  const synthesizeAndPlay = async (text: string, messageId: string) => {
    if (playingId === messageId) {
      stopAudio();
      return;
    }

    stopAudio();
    setSynthesizing(messageId);

    try {
      // Check if we already have the audio cached in the message
      const existingMsg = messages.find(m => m.id === messageId);
      let audioBase64 = existingMsg?.audioBase64;

      if (!audioBase64) {
        const response = await fetch('/api/audio/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text.substring(0, 4096),
            voice: voice.voiceId,
            model: voice.model,
            speed: voice.speed,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro na síntese de voz');
        }

        audioBase64 = data.audio;

        // Cache in message
        setMessages(prev =>
          prev.map(m => m.id === messageId ? { ...m, audioBase64 } : m)
        );
      }

      // Play the audio
      const audioSrc = `data:audio/mp3;base64,${audioBase64}`;
      const audio = new Audio(audioSrc);
      audioRef.current = audio;

      audio.onplay = () => {
        setPlayingId(messageId);
        setSynthesizing(null);
      };

      audio.onended = () => {
        setPlayingId(null);
      };

      audio.onerror = () => {
        setPlayingId(null);
        setSynthesizing(null);
        toast.error('Erro ao reproduzir áudio');
      };

      await audio.play();
    } catch (error) {
      console.error('Error synthesizing:', error);
      setSynthesizing(null);
      toast.error(error instanceof Error ? error.message : 'Erro na síntese de voz');
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
    setSynthesizing(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // ============================
  // Send to Agent (shared logic)
  // ============================
  const sendToAgent = async (messageText: string, userMsgId: string) => {
    const payload = {
      userMessage: messageText,
      conversationHistory: messages.map(m => ({
        role: m.role,
        content: m.content.replace(/^🎤 /, ''),
      })),
      context: {
        clinicName: context.clinicName,
        tutorName: context.tutorName,
        petName: context.petName,
        petSpecies: context.petSpecies,
        currentDate: context.currentDate,
        customVariable: context.customVariable,
      },
    };

    if (streamingEnabled) {
      await sendToAgentStreaming(payload, userMsgId);
    } else {
      await sendToAgentNormal(payload, userMsgId);
    }
  };

  const sendToAgentNormal = async (payload: Record<string, unknown>, userMsgId: string) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao executar agente');
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        usage: data.usage,
        latencyMs: data.latencyMs,
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (voiceMode && data.response) {
        setTimeout(() => {
          synthesizeAndPlay(data.response, assistantMessage.id);
        }, 300);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar mensagem');
      setMessages(prev => prev.filter(m => m.id !== userMsgId));
    } finally {
      setLoading(false);
    }
  };

  const sendToAgentStreaming = async (payload: Record<string, unknown>, userMsgId: string) => {
    const assistantMsgId = `assistant-${Date.now()}`;
    let fullContent = '';
    let finalUsage: Message['usage'] | undefined;

    try {
      // Add placeholder message
      setMessages(prev => [...prev, {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }]);

      const response = await fetch(`/api/agents/${agentId}/execute/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao executar agente em streaming');
      }

      if (!response.body) throw new Error('Stream não disponível');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'content' && data.content) {
              fullContent += data.content;
              setMessages(prev => prev.map(m =>
                m.id === assistantMsgId ? { ...m, content: fullContent } : m
              ));
            } else if (data.type === 'usage') {
              finalUsage = data.usage;
            } else if (data.type === 'done') {
              setMessages(prev => prev.map(m =>
                m.id === assistantMsgId ? { ...m, usage: finalUsage, latencyMs: data.latencyMs } : m
              ));
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }

      if (voiceMode && fullContent) {
        setTimeout(() => synthesizeAndPlay(fullContent, assistantMsgId), 300);
      }
    } catch (error) {
      console.error('Streaming error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro no streaming');
      if (!fullContent) {
        setMessages(prev => prev.filter(m => m.id !== assistantMsgId));
      }
    } finally {
      setLoading(false);
      setStreamingContent('');
    }
  };

  const totalTokens = messages.reduce((sum, m) => sum + (m.usage?.total_tokens || 0), 0);
  const avgLatency = messages.filter(m => m.latencyMs).length > 0
    ? Math.round(messages.filter(m => m.latencyMs).reduce((sum, m) => sum + (m.latencyMs || 0), 0) / messages.filter(m => m.latencyMs).length)
    : 0;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 rounded-xl">
            <LuBot className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{agentName}</h3>
            <p className="text-xs text-gray-500">{provider} • {model}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <div className="flex items-center gap-4 text-xs text-gray-500 mr-4">
              <span>{totalTokens} tokens</span>
              <span>{avgLatency}ms avg</span>
            </div>
          )}
          {/* Streaming toggle */}
          <button
            onClick={() => setStreamingEnabled(!streamingEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              streamingEnabled
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            title={streamingEnabled ? 'Desativar streaming' : 'Ativar streaming'}
          >
            <LuZap className="w-3.5 h-3.5" />
            {streamingEnabled ? 'Stream' : 'Normal'}
          </button>
          {/* Voice mode toggle */}
          <button
            onClick={() => setVoiceMode(!voiceMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              voiceMode
                ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            title={voiceMode ? 'Desativar modo voz' : 'Ativar modo voz'}
          >
            {voiceMode ? <LuVolume2 className="w-3.5 h-3.5" /> : <LuMessageSquare className="w-3.5 h-3.5" />}
            {voiceMode ? 'Voz' : 'Texto'}
          </button>
          <button
            onClick={handleClearChat}
            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Limpar conversa"
          >
            <LuTrash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Context Panel */}
      <div className="border-b border-gray-100">
        <button
          onClick={() => setShowContext(!showContext)}
          className="w-full flex items-center justify-between px-6 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <LuInfo className="w-4 h-4" />
            <span>Variáveis de contexto</span>
          </div>
          {showContext ? <LuChevronUp className="w-4 h-4" /> : <LuChevronDown className="w-4 h-4" />}
        </button>
        
        {showContext && (
          <div className="px-6 pb-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nome da Clínica</label>
              <input
                type="text"
                value={context.clinicName || ''}
                onChange={(e) => setContext({ ...context, clinicName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                placeholder="{clinic_name}"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nome do Tutor</label>
              <input
                type="text"
                value={context.tutorName || ''}
                onChange={(e) => setContext({ ...context, tutorName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                placeholder="{tutor_name}"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nome do Pet</label>
              <input
                type="text"
                value={context.petName || ''}
                onChange={(e) => setContext({ ...context, petName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                placeholder="{pet_name}"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Espécie do Pet</label>
              <select
                value={context.petSpecies || ''}
                onChange={(e) => setContext({ ...context, petSpecies: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                <option value="cachorro">Cachorro</option>
                <option value="gato">Gato</option>
                <option value="ave">Ave</option>
                <option value="roedor">Roedor</option>
                <option value="réptil">Réptil</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Data Atual</label>
              <input
                type="text"
                value={context.currentDate || ''}
                onChange={(e) => setContext({ ...context, currentDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                placeholder="{current_date}"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Variável Custom</label>
              <input
                type="text"
                value={context.customVariable || ''}
                onChange={(e) => setContext({ ...context, customVariable: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                placeholder="{custom_variable}"
              />
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-4 bg-gray-50 rounded-full mb-4">
              <LuBot className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Teste seu agente</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              Envie uma mensagem para testar como o agente responde. 
              Use as variáveis de contexto para simular cenários reais.
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-xl text-left text-xs text-gray-600 max-w-md">
              <p className="font-medium mb-2">System Prompt:</p>
              <p className="whitespace-pre-wrap line-clamp-4">{systemPrompt}</p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`flex-shrink-0 p-2 rounded-xl ${
              message.role === 'user' 
                ? 'bg-violet-100' 
                : 'bg-gray-100'
            }`}>
              {message.role === 'user' ? (
                <LuUser className="w-4 h-4 text-violet-600" />
              ) : (
                <LuBot className="w-4 h-4 text-gray-600" />
              )}
            </div>
            
            <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
              <div className={`inline-block p-4 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              </div>
              
              <div className={`flex items-center gap-2 mt-1 text-xs text-gray-400 ${
                message.role === 'user' ? 'justify-end' : ''
              }`}>
                <span>{message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                {message.usage && (
                  <>
                    <span>•</span>
                    <span>{message.usage.total_tokens} tokens</span>
                  </>
                )}
                {message.latencyMs && (
                  <>
                    <span>•</span>
                    <span>{message.latencyMs}ms</span>
                  </>
                )}
                {message.role === 'assistant' && (
                  <>
                    <button
                      onClick={() => synthesizeAndPlay(message.content, message.id)}
                      className={`p-1 rounded transition-colors ${
                        playingId === message.id
                          ? 'bg-violet-100 text-violet-600'
                          : 'hover:bg-gray-200'
                      }`}
                      title={playingId === message.id ? 'Parar áudio' : 'Ouvir resposta'}
                      disabled={synthesizing === message.id}
                    >
                      {synthesizing === message.id ? (
                        <LuLoader className="w-3 h-3 animate-spin" />
                      ) : playingId === message.id ? (
                        <LuPause className="w-3 h-3" />
                      ) : (
                        <LuVolume2 className="w-3 h-3" />
                      )}
                    </button>
                    <button
                      onClick={() => handleCopy(message.content, message.id)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {copiedId === message.id ? (
                        <LuCheck className="w-3 h-3 text-green-500" />
                      ) : (
                        <LuCopy className="w-3 h-3" />
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 p-2 rounded-xl bg-gray-100">
              <LuBot className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex items-center gap-2 p-4 bg-gray-100 rounded-2xl">
              <LuLoader className="w-4 h-4 animate-spin text-gray-500" />
              <span className="text-sm text-gray-500">Pensando...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center justify-center gap-3 mb-3 py-2 bg-red-50 border border-red-200 rounded-xl animate-pulse">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-red-600">
              Gravando... {recordingTime}s
            </span>
            <button
              onClick={stopRecording}
              className="px-3 py-1 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition-colors"
            >
              Parar
            </button>
          </div>
        )}

        <div className="flex gap-3">
          {/* Microphone button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={loading && !isRecording}
            className={`px-3 py-3 rounded-xl font-medium transition-all ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
          >
            {isRecording ? <LuMicOff className="w-5 h-5" /> : <LuMic className="w-5 h-5" />}
          </button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={voiceMode ? "Digite ou grave um áudio..." : "Digite sua mensagem..."}
            rows={1}
            className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 resize-none"
            disabled={loading || isRecording}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading || isRecording}
            className="px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <LuLoader className="w-5 h-5 animate-spin" />
            ) : (
              <LuSend className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Enter enviar • Shift+Enter nova linha • 🎤 Microfone para enviar áudio
          {voiceMode && ' • 🔊 Respostas com áudio automático'}
        </p>
      </div>
    </div>
  );
}
