"use client";

import { useRef } from "react";
import { useDrag } from "react-dnd";
import Link from "next/link";
import { KanbanCardProps } from "@/types";
import { STATUS_COLORS } from "@/constants/status";
import { formatCurrency, formatDateTime } from "@/utils/formatters";
import { LuCalendar, LuUser, LuPawPrint, LuDollarSign } from "react-icons/lu";

// Função para atribuir cores dinamicamente com base no nome do status
const getColorForStatus = (status: string, colors: { [key: string]: string }) => {
  const colorKeys = Object.keys(colors);
  const index = Math.abs(hashString(status) % colorKeys.length);
  return colors[colorKeys[index]] || "border-l-gray-500"; // Cor padrão
};

// Função simples de hash para strings
const hashString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Converte para inteiro 32-bit
  }
  return hash;
};

const KanbanCard = ({ appointment }: KanbanCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag] = useDrag({
    type: "APPOINTMENT",
    item: { id: appointment.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(ref);

  const statusColor = getColorForStatus(appointment.status, STATUS_COLORS);
  // Lista de status terminais configuráveis
  const terminalStatuses = ["CANCELED", "DELETED"];
  const isTerminal = terminalStatuses.includes(appointment.status);

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label={`Consulta para ${appointment.pet.name}, status ${appointment.status}`}
      className={`group p-4 bg-white/95 backdrop-blur-sm border border-white/20 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 ${
        statusColor
      } ${isDragging ? "opacity-60 scale-95 rotate-1" : "hover:scale-105"} cursor-move relative overflow-hidden`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
        }
      }}
    >
      {/* Efeito de brilho no hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-sm line-clamp-1">
              {appointment.pet.name}
            </h3>
            <p className="text-xs text-gray-500 mt-1">#{appointment.id.slice(0, 8)}</p>
          </div>
          <div className="flex-shrink-0">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                isTerminal ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"
              }`}
            >
              {appointment.status}
            </span>
          </div>
        </div>

        <div className="space-y-2 text-xs text-gray-600">
          {/* ✅ CORRIGIDO: Agora usa tutor em vez de client */}
          <div className="flex items-center gap-2">
            <LuUser className="w-3 h-3 text-blue-500 flex-shrink-0" />
            <span className="line-clamp-1">
              {appointment.tutor?.name || "Tutor não informado"}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <LuPawPrint className="w-3 h-3 text-green-500 flex-shrink-0" />
            <span className="line-clamp-1">
              {appointment.pet.species} • {appointment.pet.breed || "Sem raça definida"}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <LuCalendar className="w-3 h-3 text-purple-500 flex-shrink-0" />
            <span>{formatDateTime(appointment.date.toString())}</span>
          </div>

          {/* ✅ ADICIONADO: Veterinário responsável */}
          <div className="flex items-center gap-2">
            <LuUser className="w-3 h-3 text-orange-500 flex-shrink-0" />
            <span className="line-clamp-1">
              Vet: {appointment.user?.name || "Veterinário não informado"}
            </span>
          </div>
        </div>

        {appointment.description && (
          <p className="mt-3 text-xs text-gray-500 line-clamp-2 bg-gray-50/50 rounded-lg p-2">
            {appointment.description}
          </p>
        )}

        {appointment.notes && (
          <p className="mt-2 text-xs text-gray-500 line-clamp-2 bg-blue-50/50 rounded-lg p-2">
            {appointment.notes}
          </p>
        )}
        
        <div className="mt-3 pt-3 border-t border-gray-100/50 flex justify-between items-center">
          <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
            <LuDollarSign className="w-3 h-3" />
            <span>{formatCurrency(appointment.value)}</span>
          </div>
          
          {/* ✅ ADICIONADO: Duração */}
          <div className="text-xs text-gray-500">
            {appointment.duration || 30}min
          </div>
          
          <Link
            href="/dashboard/erp/agendamentos"
            className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors duration-200 hover:underline flex items-center gap-1"
          >
            Ver detalhes
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default KanbanCard;
