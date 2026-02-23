"use client";

import { useEffect, useState } from "react";
import { LuLoader, LuTrash2, LuTriangleAlert, LuX } from "react-icons/lu";

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  /** Ex: "Tutor", "Pet", "Cliente", "Produto", "Serviço" */
  entityLabel: string;
  /** Ex: "Atma", "Werley Santana" */
  itemName: string;
  /** Texto opcional de consequência (abaixo da pergunta) */
  consequenceText?: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export default function ConfirmDeleteModal({
  isOpen,
  entityLabel,
  itemName,
  consequenceText = "Esta ação não pode ser desfeita.",
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    if (isOpen) {
      setError(null);
      setIsSubmitting(false);
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) handleClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isSubmitting]);

  const handleClose = () => {
    if (isSubmitting) return;
    setIsVisible(false);
    setTimeout(() => onClose(), 300);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Erro ao excluir ${entityLabel.toLowerCase()}`);
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !isMounted) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Confirmar exclusão de ${entityLabel}`}
    >
      {/* Backdrop animado com gradiente */}
      <div
        className={`absolute inset-0 bg-gradient-to-br from-red-900/20 via-gray-900/20 to-purple-900/15 backdrop-blur-xl transition-opacity duration-500 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Modal com glassmorphism */}
      <div
        className={`relative bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-red-500/10 w-full max-w-md transform transition-all duration-500 ${
          isVisible ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"
        }`}
      >
        {/* Header */}
        <div className="relative p-6 border-b border-white/20 bg-gradient-to-r from-white to-white/95">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-red-600 to-orange-600 rounded-2xl shadow-lg shadow-red-500/25">
                <LuTrash2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Excluir {entityLabel}
                </h3>
                <p className="text-sm text-gray-500/80 mt-1">Ação irreversível</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="group flex items-center justify-center w-10 h-10 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-xl transition-all duration-300 hover:scale-110 border border-transparent hover:border-gray-200/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              aria-label="Fechar"
            >
              <LuX className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white shadow-sm">
              <LuTriangleAlert className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-gray-900 font-semibold leading-snug">
                Tem certeza que deseja excluir {entityLabel.toLowerCase()}{" "}
                <span className="text-red-700">“{itemName}”</span>?
              </p>
              <p className="text-sm text-gray-600 mt-1">{consequenceText}</p>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-8 mt-6 border-t border-white/20">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-8 py-3 text-sm font-semibold text-gray-600 bg-white/50 border border-gray-300/50 rounded-2xl hover:bg-white hover:border-gray-400 hover:shadow-lg transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500/50 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="group px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl hover:from-red-700 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none flex items-center space-x-2 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              {isSubmitting ? (
                <>
                  <LuLoader className="w-4 h-4 animate-spin relative z-10" />
                  <span className="relative z-10">Excluindo...</span>
                </>
              ) : (
                <>
                  <LuTrash2 className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">Excluir</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Decoração sutil */}
        <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-red-500/5 to-orange-500/5 rounded-tl-3xl" />
      </div>
    </div>
  );
}

