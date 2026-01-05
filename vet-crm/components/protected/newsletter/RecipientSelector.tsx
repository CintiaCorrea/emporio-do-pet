'use client';

import { RecipientType, Client, Tutor } from '@/types/newsletter';
import { LuUsers, LuCheck, LuUpload } from 'react-icons/lu';
import { useState, useRef } from 'react';

interface RecipientSelectorProps {
  recipientType: RecipientType;
  onRecipientTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  clients: Client[];
  tutors: Tutor[];
  selectedClients: string[];
  selectedTutors: string[];
  leadEmails: string[];
  onClientSelection: (clientId: string) => void;
  onTutorSelection: (tutorId: string) => void;
  onLeadsUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
}

export const RecipientSelector = ({
  recipientType,
  onRecipientTypeChange,
  clients,
  tutors,
  selectedClients,
  selectedTutors,
  leadEmails,
  onClientSelection,
  onTutorSelection,
  onLeadsUpload,
  isLoading
}: RecipientSelectorProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getRecipientCount = (): number => {
    switch (recipientType) {
      case RecipientType.ALL:
        return clients.length + tutors.length;
      case RecipientType.CLIENT:
        return selectedClients.length;
      case RecipientType.TUTOR:
        return selectedTutors.length;
      case RecipientType.LEAD:
        return leadEmails.length;
      default:
        return 0;
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-50 rounded-xl">
          <LuUsers className="w-5 h-5 text-purple-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Destinatários</h3>
      </div>
      
      <div className="space-y-4">
        <select
          value={recipientType}
          onChange={onRecipientTypeChange}
          className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
        >
          <option value={RecipientType.ALL}>Todos (Clientes e Tutores)</option>
          <option value={RecipientType.CLIENT}>Clientes Específicos</option>
          <option value={RecipientType.TUTOR}>Tutores Específicos</option>
          <option value={RecipientType.LEAD}>Leads (Emails)</option>
        </select>

        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-2xl">
          <span className="text-sm font-semibold text-blue-900">Total de destinatários:</span>
          <span className="text-lg font-bold text-blue-600">{getRecipientCount()}</span>
        </div>

        {/* Seleção de clientes específicos */}
        {recipientType === RecipientType.CLIENT && (
          <div className="max-h-64 overflow-y-auto border border-gray-200/80 rounded-2xl p-4 bg-white/80 shadow-inner">
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Carregando clientes...</p>
              </div>
            ) : clients.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhum cliente encontrado</p>
            ) : (
              clients.map(client => (
                <label key={client.id} className="flex items-center space-x-3 py-3 border-b border-gray-100 last:border-b-0">
                  <input
                    type="checkbox"
                    checked={selectedClients.includes(client.id)}
                    onChange={() => onClientSelection(client.id)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">{client.name}</span>
                    <span className="block text-xs text-gray-500">{client.email}</span>
                  </div>
                </label>
              ))
            )}
          </div>
        )}

        {/* Seleção de tutores específicos */}
        {recipientType === RecipientType.TUTOR && (
          <div className="max-h-64 overflow-y-auto border border-gray-200/80 rounded-2xl p-4 bg-white/80 shadow-inner">
            {tutors.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhum tutor encontrado</p>
            ) : (
              tutors.map(tutor => (
                <label key={tutor.id} className="flex items-center space-x-3 py-3 border-b border-gray-100 last:border-b-0">
                  <input
                    type="checkbox"
                    checked={selectedTutors.includes(tutor.id)}
                    onChange={() => onTutorSelection(tutor.id)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">{tutor.name}</span>
                    <span className="block text-xs text-gray-500">{tutor.email}</span>
                    {tutor.acceptsEmail && (
                      <span className="block text-xs text-green-600">✓ Aceita e-mail</span>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>
        )}

        {/* Upload de leads */}
        {recipientType === RecipientType.LEAD && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={onLeadsUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 group"
            >
              <LuUpload className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
              <span className="font-semibold text-gray-700 group-hover:text-blue-600">Upload de Lista de Emails</span>
            </button>
            {leadEmails.length > 0 && (
              <div className="p-3 bg-green-50 rounded-2xl border border-green-200">
                <div className="flex items-center space-x-2">
                  <LuCheck className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-800">
                    {leadEmails.length} emails carregados
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
