'use client';

import { LuCalendar } from 'react-icons/lu';

interface ScheduleSectionProps {
  scheduledFor: Date;
  onDateTimeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ScheduleSection = ({ scheduledFor, onDateTimeChange }: ScheduleSectionProps) => {
  return (
    <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-orange-50 rounded-xl">
          <LuCalendar className="w-5 h-5 text-orange-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Agendamento</h3>
      </div>
      
      <div className="space-y-3">
        <div>
          <label htmlFor="schedule" className="block text-sm font-semibold text-gray-700 mb-2">
            Data e Hora
          </label>
          <input
            type="datetime-local"
            id="schedule"
            value={scheduledFor ? new Date(scheduledFor).toISOString().slice(0, 16) : ''}
            onChange={onDateTimeChange}
            className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
          />
        </div>
      </div>
    </div>
  );
};
