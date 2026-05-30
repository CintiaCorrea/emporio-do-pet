"use client";

import { useState, useEffect } from "react";
import { NewTaskData, Tutor, Pet, User } from "@/types";
import {  LuPawPrint, LuUser, LuCalendar, LuDollarSign, LuStickyNote, LuLoader } from "react-icons/lu";

// Definir tipos locais para espécies de pet
type PetSpecies = "CANINE" | "FELINE" | "BIRD" | "RODENT" | "REPTILE" | "OTHER";

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: NewTaskData) => void;
  columnId? (() => null) : string;
}

const NewTaskModal = ({ isOpen, onClose, onSubmit, columnId }: NewTaskModalProps) => {
  const [petName, setPetName] = useState("");
  const [species, setSpecies] = useState<PetSpecies>("CANINE");
  const [breed, setBreed] = useState("");
  const [tutorId, setTutorId] = useState("");
  const [petId, setPetId] = useState("");
  const [userId, setUserId] = useState("");
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [veterinarians, setVeterinarians] = useState<User[]>([]);
  const [selectedTutorPets, setSelectedTutorPets] = useState<Pet[]>([]);
  const [date, setDate] = useState("");
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Espécies disponíveis
  const speciesOptions = [
    { value: "CANINE", label: "🐶 Canino" },
    { value: "FELINE", label: "🐱 Felino" },
    { value: "BIRD", label: "🐦 Ave" },
    { value: "RODENT", label: "🐹 Roedor" },
    { value: "REPTILE", label: "🐍 Réptil" },
    { value: "OTHER", label: "❓ Outro" },
  ];

  // Função para extrair array de dados da resposta da API
  const extractDataArray = (data: any): any[] => {
    if (Array.isArray(data)) {
      return data;
    } else if (data && Array.isArray(data.tutors)) {
      return data.tutors;
    } else if (data && Array.isArray(data.users)) {
      return data.users;
    } else if (data && Array.isArray(data.pets)) {
      return data.pets;
    } else if (data && Array.isArray(data.data)) {
      return data.data;
    } else {
      console.warn("Formato inesperado dos dados, usando array vazio:", data);
      return [];
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!isOpen) return;
      
      try {
        setLoading(true);
        
        // Buscar tutores
        const tutorsResponse = await fetch("/api/tutors");
        if (tutorsResponse.ok) {
          const tutorsData = await tutorsResponse.json();
          const tutorsArray = extractDataArray(tutorsData);
          setTutors(tutorsArray);
        } else {
          console.error("Erro na resposta dos tutores:", tutorsResponse.status);
          setTutors([]);
        }

        // Buscar veterinários
        const vetsResponse = await fetch("/api/users?role=VETERINARIAN");
        if (vetsResponse.ok) {
          const vetsData = await vetsResponse.json();
          const vetsArray = extractDataArray(vetsData);
          setVeterinarians(vetsArray);
          
          if (vetsArray.length > 0 && !userId) {
            setUserId(vetsArray[0].id);
          }
        } else {
          console.error("Erro na resposta dos veterinários:", vetsResponse.status);
          setVeterinarians([]);
        }

      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setTutors([]);
        setVeterinarians([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [isOpen, userId]);

  // Quando selecionar um tutor, carregar seus pets
  useEffect(() => {
    const fetchTutorPets = async () => {
      if (!tutorId) {
        setSelectedTutorPets([]);
        setPetId("");
        return;
      }

      try {
        const response = await fetch(`/api/tutors/${tutorId}/pets`);
        if (response.ok) {
          const petsData = await response.json();
          const petsArray = extractDataArray(petsData);
          setSelectedTutorPets(petsArray);
          
          if (petsArray.length === 1) {
            setPetId(petsArray[0].id);
            setPetName(petsArray[0].name);
            setSpecies(petsArray[0].species as PetSpecies);
            setBreed(petsArray[0].breed || "");
          } else {
            setPetId("");
            setPetName("");
            setSpecies("CANINE");
            setBreed("");
          }
        } else {
          console.error('Erro ao carregar pets:', response.status);
          setSelectedTutorPets([]);
        }
      } catch (error) {
        console.error('Erro ao carregar pets:', error);
        setSelectedTutorPets([]);
      }
    };

    fetchTutorPets();
  }, [tutorId]);

  // Quando selecionar um pet existente, preencher os dados
  useEffect(() => {
    if (petId && selectedTutorPets.length > 0) {
      const selectedPet = selectedTutorPets.find(pet => pet.id === petId);
      if (selectedPet) {
        setPetName(selectedPet.name);
        setSpecies(selectedPet.species as PetSpecies);
        setBreed(selectedPet.breed || "");
      }
    }
  }, [petId, selectedTutorPets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: { [key: string]: string } = {};
    if (!tutorId) newErrors.tutorId = "Selecione um tutor";
    if (!petId && !petName.trim()) newErrors.petName = "Nome do pet é obrigatório";
    if (!userId) newErrors.userId = "Selecione um veterinário";
    if (!date) newErrors.date = "Data é obrigatória";
    else if (isNaN(new Date(date).getTime())) newErrors.date = "Data inválida";
    if (!value || parseFloat(value) <= 0) newErrors.value = "Valor deve ser maior que 0";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const selectedTutor = tutors.find(t => t.id === tutorId);
    if (!selectedTutor) {
      alert("Selecione um tutor válido.");
      return;
    }

    const selectedVet = veterinarians.find(v => v.id === userId);
    if (!selectedVet) {
      alert("Selecione um veterinário válido.");
      return;
    }

    // ✅ CORRIGIDO: Preparar dados para envio
    const taskData: NewTaskData = {
      date: new Date(date),
      notes: notes.trim() || undefined,
      value: parseFloat(value) || 0,
      tutorId: tutorId,
      petId: petId || undefined, // ✅ CORRIGIDO: envia undefined se vazio
      userId: userId,
      description: description.trim() || undefined,
      duration: duration,
      status: 'A Fazer', // ✅ Usa o status da coluna
      paymentStatus: 'PENDING',
      // Se não tiver petId, incluir dados do pet para criação
      ...(!petId && {
        pet: {
          name: petName.trim(),
          species: species,
          breed: breed.trim() || undefined,
          tutorId: tutorId}
      })
    };

    try {
      setLoading(true);
      await onSubmit(taskData);
      
      // Reset form
      setErrors({});
      setTutorId("");
      setPetId("");
      setPetName("");
      setSpecies("CANINE");
      setBreed("");
      setDate("");
      setDuration(30);
      setNotes("");
      setValue("");
      setDescription("");
      onClose();
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);
      alert("Erro ao criar agendamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Novo Agendamento</h3>
            <p className="text-sm text-gray-500 mt-1">Crie um novo agendamento no kanban</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 group"
            disabled={loading}
          >
            <span style={{fontSize:"14px"}}>✕</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Tutor e Veterinário */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <LuUser className="w-4 h-4 mr-2 text-green-500" />
                Tutor *
              </label>
              <div className="relative">
                <select
                  value={tutorId}
                  onChange={(e) => setTutorId(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 bg-gray-50/50 hover:bg-white text-sm text-black ${
                    errors.tutorId ? "border-red-500 focus:ring-red-500" : "border-gray-200 focus:ring-green-500"
                  }`}
                  required
                  disabled={loading}
                >
                  <option value="">Selecione um tutor</option>
                  {loading ? (
                    <option value="" disabled>Carregando tutores...</option>
                  ) : (
                    Array.isArray(tutors) && tutors.map((tutor) => (
                      <option key={tutor.id} value={tutor.id}>
                        {tutor.name} {tutor.email ? `(${tutor.email})` : ''}
                      </option>
                    ))
                  )}
                </select>
                <LuUser className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                {errors.tutorId && <p className="text-red-500 text-xs mt-1">{errors.tutorId}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <LuUser className="w-4 h-4 mr-2 text-blue-500" />
                Veterinário *
              </label>
              <div className="relative">
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 bg-gray-50/50 hover:bg-white text-sm text-black ${
                    errors.userId ? "border-red-500 focus:ring-red-500" : "border-gray-200 focus:ring-blue-500"
                  }`}
                  required
                  disabled={loading}
                >
                  <option value="">Selecione um veterinário</option>
                  {loading ? (
                    <option value="" disabled>Carregando veterinários...</option>
                  ) : (
                    Array.isArray(veterinarians) && veterinarians.map((vet) => (
                      <option key={vet.id} value={vet.id}>
                        {vet.name}
                      </option>
                    ))
                  )}
                </select>
                <LuUser className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                {errors.userId && <p className="text-red-500 text-xs mt-1">{errors.userId}</p>}
              </div>
            </div>
          </div>

          {/* Pet - Seleção ou Criação */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
            <h4 className="font-medium text-gray-900 flex items-center">
              <LuPawPrint className="w-4 h-4 mr-2 text-orange-500" />
              Informações do Pet
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Selecionar Pet Existente */}
              {Array.isArray(selectedTutorPets) && selectedTutorPets.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Selecionar Pet Existente
                  </label>
                  <select
                    value={petId}
                    onChange={(e) => setPetId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-black"
                    disabled={loading}
                  >
                    <option value="">Ou criar novo pet...</option>
                    {selectedTutorPets.map((pet) => (
                      <option key={pet.id} value={pet.id}>
                        {pet.name} ({pet.species.toLowerCase()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Espécie */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Espécie
                </label>
                <select
                  value={species}
                  onChange={(e) => setSpecies(e.target.value as PetSpecies)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-black"
                  disabled={loading || !!petId}
                >
                  {speciesOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Nome e Raça do Pet */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Nome do Pet *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    placeholder="Digite o nome do pet"
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 text-sm text-black ${
                      errors.petName ? "border-red-500 focus:ring-red-500" : "border-gray-200 focus:ring-blue-500"
                    } ${petId ? 'bg-gray-100' : 'bg-white'}`}
                    required
                    disabled={loading || !!petId}
                  />
                  <LuPawPrint className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  {errors.petName && <p className="text-red-500 text-xs mt-1">{errors.petName}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Raça
                </label>
                <input
                  type="text"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  placeholder="Raça do pet (opcional)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-black"
                  disabled={loading || !!petId}
                />
              </div>
            </div>
          </div>

          {/* Data, Duração e Valor */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <LuCalendar className="w-4 h-4 mr-2 text-purple-500" />
                Data e Hora *
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 bg-gray-50/50 hover:bg-white text-sm text-black ${
                    errors.date ? "border-red-500 focus:ring-red-500" : "border-gray-200 focus:ring-purple-500"
                  }`}
                  required
                  disabled={loading}
                />
                <LuCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <LuCalendar className="w-4 h-4 mr-2 text-blue-500" />
                Duração (min)
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-black"
                disabled={loading}
              >
                <option value={15}>15 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>60 minutos</option>
                <option value={90}>90 minutos</option>
                <option value={120}>120 minutos</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <LuDollarSign className="w-4 h-4 mr-2 text-orange-500" />
                Valor (R$) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0,00"
                  step="0.01"
                  min="0"
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 bg-gray-50/50 hover:bg-white text-sm text-black ${
                    errors.value ? "border-red-500 focus:ring-red-500" : "border-gray-200 focus:ring-orange-500"
                  }`}
                  required
                  disabled={loading}
                />
                <LuDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                {errors.value && <p className="text-red-500 text-xs mt-1">{errors.value}</p>}
              </div>
            </div>
          </div>

          {/* Descrição e Observações */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <LuStickyNote className="w-4 h-4 mr-2 text-gray-500" />
                Descrição do Agendamento
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o motivo da consulta..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none text-black"
                rows={2}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <LuStickyNote className="w-4 h-4 mr-2 text-gray-500" />
                Observações (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione observações adicionais..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none text-black"
                rows={2}
                disabled={loading}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LuLoader className="w-4 h-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Agendamento'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTaskModal;
