"use client";

import { useState, useEffect } from "react";
import { LuX, LuPlus, LuHash, LuSparkles } from "react-icons/lu";

interface NewColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

const NewColumnModal = ({ isOpen, onClose, onSubmit }: NewColumnModalProps) => {
  const [columnName, setColumnName] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (columnName.trim()) {
      onSubmit(columnName.trim());
      setColumnName("");
      handleClose();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen || !isMounted) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      {/* Backdrop animado com gradiente */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-cyan-900/20 backdrop-blur-xl transition-opacity duration-500 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      />
      
      {/* Efeitos de partículas no background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400/30 rounded-full animate-pulse" />
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-purple-400/40 rounded-full animate-pulse delay-75" />
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-cyan-400/30 rounded-full animate-pulse delay-150" />
      </div>

      {/* Modal com glassmorphism */}
      <div 
        className={`relative bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-blue-500/10 w-full max-w-md transform transition-all duration-500 ${
          isVisible 
            ? "scale-100 opacity-100 translate-y-0" 
            : "scale-95 opacity-0 translate-y-4"
        }`}
      >
        {/* Header com gradiente sutil */}
        <div className="relative p-6 border-b border-white/20 bg-gradient-to-r from-white to-white/95">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 rounded-2xl shadow-lg shadow-blue-500/25">
                  <LuSparkles className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full animate-ping" />
              </div>
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Nova Coluna
                </h3>
                <p className="text-sm text-gray-500/80 mt-1">
                  Crie uma nova coluna para organizar suas tarefas
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="group flex items-center justify-center w-10 h-10 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-xl transition-all duration-300 hover:scale-110 border border-transparent hover:border-gray-200/50"
            >
              <LuX className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                <LuHash className="w-4 h-4 mr-2 text-blue-500" />
                Nome da Coluna
                <span className="text-red-400 ml-1">*</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur-sm group-hover:blur-md transition-all duration-300 opacity-0 group-hover:opacity-100" />
                <input
                  type="text"
                  value={columnName}
                  onChange={(e) => setColumnName(e.target.value)}
                  placeholder="Digite o nome da coluna..."
                  className="relative w-full px-5 py-4 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400/70 backdrop-blur-sm hover:bg-white hover:border-gray-300/50 shadow-sm hover:shadow-md"
                  aria-label="Nome da nova coluna"
                  required
                  autoFocus
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <LuHash className="w-5 h-5 text-gray-400/70 transition-colors duration-300 group-hover:text-blue-500" />
                </div>
              </div>
              <p className="text-xs text-gray-500/70 mt-3 flex items-center">
                <LuSparkles className="w-3 h-3 mr-1 text-blue-400" />
                Use um nome claro e descritivo para identificar a coluna
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-8 mt-6 border-t border-white/20">
            <button
              type="button"
              onClick={handleClose}
              className="px-8 py-3 text-sm font-semibold text-gray-600 bg-white/50 border border-gray-300/50 rounded-2xl hover:bg-white hover:border-gray-400 hover:shadow-lg transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500/50 backdrop-blur-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!columnName.trim()}
              className="group px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none flex items-center space-x-2 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              <LuPlus className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:rotate-90" />
              <span className="relative z-10">Criar Coluna</span>
            </button>
          </div>
        </form>

        {/* Decoração sutil no canto */}
        <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-blue-500/5 to-purple-500/5 rounded-tl-3xl" />
      </div>
    </div>
  );
};

export default NewColumnModal;
