"use client";

import { useState, useEffect } from "react";
import { LuX, LuSearch, LuLoader, LuUserPlus, LuTarget } from "react-icons/lu";

interface LeadOption {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  currentScore: number;
  status: string;
  source: string;
}

interface NewLeadCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (leadId: string, leadName: string) => void;
}

const SCORE_COLORS: Record<string, string> = {
  hot: "bg-red-100 text-red-700",
  warm: "bg-orange-100 text-orange-700",
  cool: "bg-yellow-100 text-yellow-700",
  cold: "bg-blue-100 text-blue-700",
};

function getScoreTier(score: number) {
  if (score >= 71) return "hot";
  if (score >= 51) return "warm";
  if (score >= 31) return "cool";
  return "cold";
}

const NewLeadCardModal = ({ isOpen, onClose, onSubmit }: NewLeadCardModalProps) => {
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const fetchLeads = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        params.set("limit", "50");
        params.set("sortBy", "currentScore");
        params.set("sortOrder", "desc");
        const response = await fetch(`/api/leads?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setLeads(Array.isArray(data) ? data : data.data || []);
        }
      } catch (error) {
        console.error("Erro ao carregar leads:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, [isOpen, search]);

  const handleSubmit = () => {
    if (!selectedLead) return;
    const lead = leads.find((l) => l.id === selectedLead);
    if (lead) {
      onSubmit(lead.id, lead.name || lead.email);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] overflow-hidden border border-gray-100">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Adicionar Lead ao Pipeline</h3>
            <p className="text-sm text-gray-500 mt-0.5">Selecione um lead existente</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <LuX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
              autoFocus
            />
          </div>
        </div>

        <div className="overflow-y-auto max-h-[400px] p-2">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <LuLoader className="w-5 h-5 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-500 text-sm">Carregando leads...</span>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <LuUserPlus className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum lead encontrado</p>
            </div>
          ) : (
            <div className="space-y-1">
              {leads.map((lead) => {
                const tier = getScoreTier(lead.currentScore);
                return (
                  <button
                    key={lead.id}
                    onClick={() => setSelectedLead(lead.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      selectedLead === lead.id
                        ? "bg-blue-50 border-2 border-blue-300"
                        : "hover:bg-gray-50 border-2 border-transparent"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {lead.name || "Sem nome"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{lead.email}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${SCORE_COLORS[tier]}`}>
                      {lead.currentScore}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                      {lead.status}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedLead}
            className="px-5 py-2.5 text-sm text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
          >
            <LuTarget className="w-4 h-4" />
            Adicionar ao Pipeline
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewLeadCardModal;
