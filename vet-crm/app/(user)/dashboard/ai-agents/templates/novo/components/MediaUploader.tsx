'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface MediaUploaderProps {
  accept: string;
  label: string;
  maxSizeBytes: number;
  onUploaded: (handle: string) => void;
}

async function readJsonSafe(response: Response): Promise<any> {
  const raw = await response.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function MediaUploader({ accept, label, maxSizeBytes, onUploaded }: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [filename, setFilename] = useState('');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > maxSizeBytes) {
      toast.error(`Arquivo excede o limite de ${Math.floor(maxSizeBytes / (1024 * 1024))}MB.`);
      return;
    }
    setFilename(file.name);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/whatsapp-templates/upload-media', {
        method: 'POST',
        body: formData,
      });
      const data = await readJsonSafe(response);
      if (!response.ok || !data?.handle) {
        throw new Error(data?.error || 'Falha ao enviar arquivo.');
      }
      onUploaded(data.handle);
      toast.success('Midia enviada com sucesso.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro no upload.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{label}</p>
      <input type="file" accept={accept} onChange={handleFileChange} className="w-full text-sm" />
      {uploading && <p className="text-xs mt-2 text-indigo-600">Enviando...</p>}
      {!uploading && filename && <p className="text-xs mt-2 text-green-600">Arquivo: {filename}</p>}
    </div>
  );
}
