'use client';

import { LuRefreshCw } from 'react-icons/lu';

interface ErrorAlertProps {
  error: string | null;
  onDismiss: () => void;
}

export const ErrorAlert = ({ error, onDismiss }: ErrorAlertProps) => {
  if (!error) return null;

  return (
    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex items-center justify-between">
      <span>{error}</span>
      <button 
        onClick={onDismiss}
        className="text-red-500 hover:text-red-700 p-1 rounded-lg"
      >
        <LuRefreshCw className="w-4 h-4" />
      </button>
    </div>
  );
};
