"use client";

import { useEffect, useMemo, useState } from "react";
import {  LuFileText, LuUser, LuDollarSign, LuCalendar, LuLoader } from "react-icons/lu";

export type FinanceEntryType = "INCOME" | "EXPENSE";
export type FinanceEntryStatus = "PAID" | "PENDING" | "OVERDUE" | "CANCELED";
export type FinancePaymentMethod =
  | "CASH"
  | "PIX"
  | "BOLETO"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "TRANSFER"
  | "OTHER";

export interface FinanceEntryFormValues {
  type: FinanceEntryType;
  status: FinanceEntryStatus;
  method: FinancePaymentMethod;
  counterpartyName: string;
  service: string;
  description? (() => null) : string;
  amountBRL: string; // "123.45"
  date: string; // yyyy-mm-dd
  dueDate? (() => null) : string; // yyyy-mm-dd
}

interface Props {
  isOpen: boolean;
  title: string;
  initialValues? (() => null) : Partial<FinanceEntryFormValues>;
  onClose: () => void;
  onSubmit: (values: FinanceEntryFormValues) => Promise<void> | void;
}

const defaultValues: FinanceEntryFormValues = {
  type: "INCOME",
  status: "PENDING",
  method: "OTHER",
  counterpartyName: "",
  service: "",
  description: "",
  amountBRL: "",
  date: new Date().toISOString().slice(0, 10),
  dueDate: ""};

const FinanceEntryModal = ({ isOpen, title, initialValues, onClose, onSubmit }: Props) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mergedInitial = useMemo(
    () => ({ ...defaultValues, ...(initialValues || {}) }),
    [initialValues],
  );

  const [values, setValues] = useState<FinanceEntryFormValues>(mergedInitial);

  useEffect(() => {
    setIsMounted(true);
    if (isOpen) {
      setValues(mergedInitial);
      setError(null);
      setLoading(false);
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, mergedInitial]);

  const handleClose = () => {
    if (loading) return;
    setIsVisible(false);
    setTimeout(() => onClose(), 300);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await onSubmit(values);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar lançamento");
      setLoading(false);
    }
  };

  if (!isOpen || !isMounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleOverlayClick}>
      <div
        className={`absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-cyan-900/20 backdrop-blur-xl transition-opacity duration-500 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className={`relative bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-blue-500/10 w-full max-w-2xl transform transition-all duration-500 ${
          isVisible ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"
        }`}
      >
        <div className="relative p-6 border-b border-white/20 bg-gradient-to-r from-white to-white/95">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg shadow-blue-500/25">
                <LuFileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {title}
                </h3>
                <p className="text-sm text-gray-500/80 mt-1">Receitas e despesas do ERP</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="group flex items-center justify-center w-10 h-10 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-xl transition-all duration-300 hover:scale-110 border border-transparent hover:border-gray-200/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span style={{fontSize:"14px"}}>✕</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                Tipo <span className="text-red-400 ml-1">*</span>
              </label>
              <select
                value={values.type}
                onChange={(e) => setValues((p) => ({ ...p, type: e.target.value as FinanceEntryType }))}
                className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="INCOME">Receita</option>
                <option value="EXPENSE">Despesa</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                Status <span className="text-red-400 ml-1">*</span>
              </label>
              <select
                value={values.status}
                onChange={(e) => setValues((p) => ({ ...p, status: e.target.value as FinanceEntryStatus }))}
                className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="PAID">Pago</option>
                <option value="PENDING">Pendente</option>
                <option value="OVERDUE">Atrasado</option>
                <option value="CANCELED">Cancelado</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <LuUser className="w-4 h-4 mr-2 text-blue-500" />
                Cliente/Fornecedor <span className="text-red-400 ml-1">*</span>
              </label>
              <input
                value={values.counterpartyName}
                onChange={(e) => setValues((p) => ({ ...p, counterpartyName: e.target.value }))}
                className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="Ex.: Maria Silva"
                required
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                Serviço/Referência <span className="text-red-400 ml-1">*</span>
              </label>
              <input
                value={values.service}
                onChange={(e) => setValues((p) => ({ ...p, service: e.target.value }))}
                className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="Ex.: Consulta"
                required
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <LuDollarSign className="w-4 h-4 mr-2 text-green-500" />
                Valor (R$) <span className="text-red-400 ml-1">*</span>
              </label>
              <input
                value={values.amountBRL}
                onChange={(e) => setValues((p) => ({ ...p, amountBRL: e.target.value }))}
                className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="0,00"
                inputMode="decimal"
                required
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                Método
              </label>
              <select
                value={values.method}
                onChange={(e) => setValues((p) => ({ ...p, method: e.target.value as FinancePaymentMethod }))}
                className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="PIX">PIX</option>
                <option value="CASH">Dinheiro</option>
                <option value="BOLETO">Boleto</option>
                <option value="CREDIT_CARD">Cartão de Crédito</option>
                <option value="DEBIT_CARD">Cartão de Débito</option>
                <option value="TRANSFER">Transferência</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <LuCalendar className="w-4 h-4 mr-2 text-blue-500" />
                Data <span className="text-red-400 ml-1">*</span>
              </label>
              <input
                type="date"
                value={values.date}
                onChange={(e) => setValues((p) => ({ ...p, date: e.target.value }))}
                className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                required
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                Vencimento
              </label>
              <input
                type="date"
                value={values.dueDate || ""}
                onChange={(e) => setValues((p) => ({ ...p, dueDate: e.target.value }))}
                className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                Observações
              </label>
              <textarea
                value={values.description || ""}
                onChange={(e) => setValues((p) => ({ ...p, description: e.target.value }))}
                className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[90px]"
                placeholder="Detalhes do lançamento..."
              />
            </div>
          </div>

          {error && (
            <div className="mt-5 p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-8 mt-6 border-t border-white/20">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-8 py-3 text-sm font-semibold text-gray-600 bg-white/50 border border-gray-300/50 rounded-2xl hover:bg-white hover:border-gray-400 hover:shadow-lg transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500/50 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="group px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none flex items-center space-x-2 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              {loading ? (
                <>
                  <LuLoader className="w-4 h-4 animate-spin relative z-10" />
                  <span className="relative z-10">Salvando...</span>
                </>
              ) : (
                <span className="relative z-10">Salvar</span>
              )}
            </button>
          </div>
        </form>

        <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-blue-500/5 to-purple-500/5 rounded-tl-3xl" />
      </div>
    </div>
  );
};

export default FinanceEntryModal;


