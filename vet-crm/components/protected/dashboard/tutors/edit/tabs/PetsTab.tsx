'use client';

import { useState, useEffect } from 'react';
import { LuPlus, LuTrash, LuPawPrint, LuCalendar } from 'react-icons/lu';
import { PetInline, emptyPetInline, normalizeBreed, formatDateMask } from '@/types/pet-inline';

interface PetsTabProps {
  pets: PetInline[];
  onPetsChange: (pets: PetInline[]) => void;
  tutorId?: string;
}

export default function PetsTab({ pets, onPetsChange, tutorId }: PetsTabProps) {
  const [breedsBySpecies, setBreedsBySpecies] = useState<Record<string, string[]>>({});
  const [breedsLoading, setBreedsLoading] = useState<Record<string, boolean>>({});
  const [newBreedInputs, setNewBreedInputs] = useState<Record<string, string>>({});
  const [breedsSubmitting, setBreedsSubmitting] = useState<Record<string, boolean>>({});

  const fetchBreeds = async (species: string) => {
    if (!species || breedsBySpecies[species] || breedsLoading[species]) return;
    
    try {
      setBreedsLoading(prev => ({ ...prev, [species]: true }));
      const res = await fetch(`/api/breeds?species=${encodeURIComponent(species)}`);
      const data = await res.json().catch(() => null);
      
      if (res.ok) {
        const arr: string[] = Array.isArray(data) 
          ? data.map((item: any) => typeof item === 'string' ? item : item?.name).filter(Boolean)
          : Array.isArray(data?.breeds) 
            ? data.breeds.map((item: any) => typeof item === 'string' ? item : item?.name).filter(Boolean)
            : [];
        
        const unique = Array.from(new Map(arr.map(b => [normalizeBreed(b).toLowerCase(), normalizeBreed(b)])).values());
        setBreedsBySpecies(prev => ({ ...prev, [species]: unique }));
      }
    } catch {
    } finally {
      setBreedsLoading(prev => ({ ...prev, [species]: false }));
    }
  };

  useEffect(() => {
    const species = new Set(pets.map(p => p.species).filter(Boolean));
    species.forEach(s => fetchBreeds(s));
  }, [pets.map(p => p.species).join(',')]);

  const addPet = () => {
    const newPet = emptyPetInline();
    onPetsChange([...pets, newPet]);
  };

  const removePet = (tempId: string) => {
    const pet = pets.find(p => p.tempId === tempId);
    if (!pet) return;

    if (pet.id) {
      onPetsChange(pets.map(p => 
        p.tempId === tempId ? { ...p, isDeleted: true } : p
      ));
    } else {
      onPetsChange(pets.filter(p => p.tempId !== tempId));
    }
  };

  const updatePet = (tempId: string, field: keyof PetInline, value: any) => {
    onPetsChange(pets.map(p => {
      if (p.tempId !== tempId) return p;
      
      if (field === 'birthDate') {
        return { ...p, birthDate: formatDateMask(value) };
      }
      
      if (field === 'species' && value !== p.species) {
        fetchBreeds(value);
        return { ...p, species: value, breed: '' };
      }
      
      return { ...p, [field]: value };
    }));
  };

  const addBreedToSpecies = async (tempId: string) => {
    const pet = pets.find(p => p.tempId === tempId);
    if (!pet) return;
    
    const newBreed = newBreedInputs[tempId] || '';
    const normalized = normalizeBreed(newBreed);
    if (!normalized) return;
    
    const currentBreeds = breedsBySpecies[pet.species] || [];
    const exists = currentBreeds.some(b => normalizeBreed(b).toLowerCase() === normalized.toLowerCase());
    
    if (exists) {
      updatePet(tempId, 'breed', normalized);
      setNewBreedInputs(prev => ({ ...prev, [tempId]: '' }));
      return;
    }

    try {
      setBreedsSubmitting(prev => ({ ...prev, [tempId]: true }));
      
      const res = await fetch('/api/breeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ species: pet.species, name: normalized })});

      const data = await res.json().catch(() => null);
      if (res.ok) {
        const createdName = typeof data?.name === 'string' ? normalizeBreed(data.name) : normalized;
        setBreedsBySpecies(prev => {
          const list = prev[pet.species] || [];
          if (list.some(b => normalizeBreed(b).toLowerCase() === createdName.toLowerCase())) {
            return prev;
          }
          return { ...prev, [pet.species]: [...list, createdName] };
        });
        updatePet(tempId, 'breed', createdName);
        setNewBreedInputs(prev => ({ ...prev, [tempId]: '' }));
      }
    } catch {
    } finally {
      setBreedsSubmitting(prev => ({ ...prev, [tempId]: false }));
    }
  };

  const visiblePets = pets.filter(p => !p.isDeleted);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Pets do Tutor</h3>
          <p className="text-sm text-gray-500 mt-1">
            Cadastre quantos pets quiser. Eles serão salvos junto com o tutor.
          </p>
        </div>
        <button
          type="button"
          onClick={addPet}
          className="group flex items-center gap-2 px-4 py-2 text-green-600 hover:text-green-700 text-sm font-semibold bg-green-50/50 rounded-2xl hover:bg-green-100/50 transition-all duration-300 hover:scale-105"
        >
          <LuPlus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
          Adicionar Pet
        </button>
      </div>

      {visiblePets.length === 0 ? (
        <div className="text-center py-12 bg-gray-50/50 rounded-2xl border border-gray-200/50">
          <LuPawPrint className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Nenhum pet cadastrado</p>
          <p className="text-sm text-gray-400 mt-1">Clique em "Adicionar Pet" para começar</p>
        </div>
      ) : (
        <div className="space-y-6">
          {visiblePets.map((pet, index) => {
            const breeds = breedsBySpecies[pet.species] || [];
            const isLoadingBreeds = breedsLoading[pet.species] || false;
            const newBreed = newBreedInputs[pet.tempId] || '';
            const isSubmittingBreed = breedsSubmitting[pet.tempId] || false;
            const breedExists = breeds.some(b => normalizeBreed(b).toLowerCase() === normalizeBreed(newBreed).toLowerCase());
            
            return (
              <div 
                key={pet.tempId} 
                className="bg-white/80 border border-gray-200/80 rounded-2xl overflow-hidden shadow-sm"
              >
                <div className="bg-gradient-to-r from-green-50 to-cyan-50/50 px-6 py-4 border-b border-gray-200/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                      <LuPawPrint className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">
                        Pet {index + 1}
                        {pet.name && ` - ${pet.name}`}
                      </span>
                      {pet.isNew && !pet.id && (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                          Novo
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePet(pet.tempId)}
                    className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300"
                    title="Remover pet"
                  >
                    <LuTrash className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Nome e Espécie */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        <LuPawPrint className="w-4 h-4 mr-2 text-green-500" />
                        Nome do Animal *
                      </label>
                      <input
                        type="text"
                        value={pet.name}
                        onChange={(e) => updatePet(pet.tempId, 'name', e.target.value)}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        placeholder="Digite o nome do pet"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        <LuPawPrint className="w-4 h-4 mr-2 text-green-500" />
                        Espécie *
                      </label>
                      <select
                        value={pet.species}
                        onChange={(e) => updatePet(pet.tempId, 'species', e.target.value)}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                      >
                        <option value="Canina">Canina</option>
                        <option value="Felina">Felina</option>
                        <option value="Ave">Ave</option>
                        <option value="Roedor">Roedor</option>
                        <option value="Réptil">Réptil</option>
                      </select>
                    </div>
                  </div>

                  {/* Raça e Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Raça</label>
                      <select
                        value={pet.breed}
                        onChange={(e) => updatePet(pet.tempId, 'breed', e.target.value)}
                        disabled={isLoadingBreeds}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Selecione...</option>
                        {breeds.map((breed) => (
                          <option key={`${pet.species}:${breed}`} value={breed}>{breed}</option>
                        ))}
                      </select>
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={newBreed}
                          onChange={(e) => setNewBreedInputs(prev => ({ ...prev, [pet.tempId]: e.target.value }))}
                          className="flex-1 px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                          placeholder="Nova raça (se não existir)"
                        />
                        <button
                          type="button"
                          onClick={() => addBreedToSpecies(pet.tempId)}
                          disabled={isSubmittingBreed || isLoadingBreeds || !normalizeBreed(newBreed)}
                          className="px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl text-sm font-semibold text-gray-700 hover:bg-white hover:border-gray-300/50 shadow-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Adicionar esta raça ao banco para esta espécie"
                        >
                          {isSubmittingBreed ? 'Adicionando...' : 'Adicionar'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        {isLoadingBreeds
                          ? 'Carregando raças...'
                          : breedExists
                            ? 'Essa raça já existe. Ao adicionar, ela será apenas selecionada.'
                            : 'Selecione uma raça existente ou cadastre uma nova.'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Status *</label>
                      <select
                        value={pet.status}
                        onChange={(e) => updatePet(pet.tempId, 'status', e.target.value)}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                        <option value="Óbito">Óbito</option>
                        <option value="Transferido">Transferido</option>
                      </select>
                    </div>
                  </div>

                  {/* Sexo e Esterilização */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Sexo</label>
                      <select
                        value={pet.sex}
                        onChange={(e) => updatePet(pet.tempId, 'sex', e.target.value)}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                      >
                        <option value="">Selecione...</option>
                        <option value="Macho">Macho</option>
                        <option value="Fêmea">Fêmea</option>
                        <option value="Indefinido">Indefinido</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Esterilização</label>
                      <select
                        value={pet.sterilization}
                        onChange={(e) => updatePet(pet.tempId, 'sterilization', e.target.value)}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                      >
                        <option value="">Selecione...</option>
                        <option value="Sim">Sim</option>
                        <option value="Não">Não</option>
                        <option value="Agendado">Agendado</option>
                      </select>
                    </div>
                  </div>

                  {/* Data de Nascimento e Pelagem */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        <LuCalendar className="w-4 h-4 mr-2 text-blue-500" />
                        Data de Nascimento
                      </label>
                      <input
                        type="text"
                        value={pet.birthDate}
                        onChange={(e) => updatePet(pet.tempId, 'birthDate', e.target.value)}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:bg-white hover:border-gray-300/50 shadow-sm"
                        placeholder="dd/mm/aaaa"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Pelagem</label>
                      <select
                        value={pet.coat}
                        onChange={(e) => updatePet(pet.tempId, 'coat', e.target.value)}
                        className="w-full px-4 py-3 bg-white/80 border border-gray-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 text-gray-900 hover:bg-white hover:border-gray-300/50 shadow-sm"
                      >
                        <option value="">Selecione...</option>
                        <option value="Curta">Curta</option>
                        <option value="Longa">Longa</option>
                        <option value="Lisa">Lisa</option>
                        <option value="Ondulada">Ondulada</option>
                        <option value="Dourado">Dourado</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
