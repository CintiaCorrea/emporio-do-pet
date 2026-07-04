'use client';

import { useState, useEffect } from 'react';
import { PetInline, emptyPetInline, normalizeBreed, formatDateMask } from '@/types/pet-inline';

interface PetsTabProps {
  pets: PetInline[];
  onPetsChange: (pets: PetInline[]) => void;
  tutorId?: string;
}

const inputStyle = { background: '#fff', border: '1px solid #E8E2D6', borderRadius: '9px', color: '#1F2A2E' };
const labelStyle = { fontSize: '13px', fontWeight: 500, color: '#5C6B70' };

const speciesEmoji = (species: string): string => {
  switch (species) {
    case 'Canina': return '🐶';
    case 'Felina': return '🐱';
    case 'Ave': return '🐦';
    case 'Roedor': return '🐹';
    case 'Réptil': return '🦎';
    default: return '🐾';
  }
};

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
          <h3 className="text-lg flex items-center gap-2" style={{ fontWeight: 500, color: '#014D5E' }}>
            <span>🐾</span>Pets do Tutor
          </h3>
          <p className="mt-1" style={{ fontSize: '13px', color: '#8A989D' }}>
            Cadastre quantos pets quiser. Eles serão salvos junto com o tutor.
          </p>
        </div>
        <button
          type="button"
          onClick={addPet}
          className="flex items-center gap-2 px-4 py-2 text-sm transition-all duration-300"
          style={{ fontWeight: 500, color: '#0f6e56', background: '#E1F5EE', borderRadius: '9px' }}
        >
          <span style={{ fontSize: '14px' }}>➕</span>
          Adicionar Pet
        </button>
      </div>

      {visiblePets.length === 0 ? (
        <div
          className="text-center py-12"
          style={{ background: '#FBF9F4', borderRadius: '16px', border: '1px solid #E8E2D6' }}
        >
          <div className="mb-3" style={{ fontSize: '48px', opacity: 0.5 }}>🐾</div>
          <p style={{ color: '#5C6B70' }}>Nenhum pet cadastrado</p>
          <p className="mt-1" style={{ fontSize: '13px', color: '#8A989D' }}>Clique em "Adicionar Pet" para começar</p>
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
                className="overflow-hidden"
                style={{ background: '#fff', border: '1px solid #E8E2D6', borderRadius: '16px' }}
              >
                <div
                  className="px-6 py-4 flex items-center justify-between"
                  style={{ background: '#FBF9F4', borderBottom: '1px solid #E8E2D6' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 flex items-center justify-center"
                      style={{ background: '#E0F4F6', borderRadius: '9px', fontSize: '16px' }}
                    >
                      {speciesEmoji(pet.species)}
                    </div>
                    <div>
                      <span style={{ fontWeight: 500, color: '#1F2A2E' }}>
                        Pet {index + 1}
                        {pet.name && ` - ${pet.name}`}
                      </span>
                      {pet.isNew && !pet.id && (
                        <span
                          className="ml-2 px-2 py-0.5 rounded-full"
                          style={{ fontSize: '11px', background: '#E1F5EE', color: '#0f6e56' }}
                        >
                          Novo
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePet(pet.tempId)}
                    className="p-2 transition-all duration-300"
                    style={{ borderRadius: '9px' }}
                    title="Remover pet"
                  >
                    <span style={{ fontSize: '14px' }}>🗑️</span>
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Nome e Espécie */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="flex items-center" style={labelStyle}>
                        <span style={{ fontSize: '14px', marginRight: '8px' }}>🐾</span>
                        Nome do Animal *
                      </label>
                      <input
                        type="text"
                        value={pet.name}
                        onChange={(e) => updatePet(pet.tempId, 'name', e.target.value)}
                        className="w-full px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-300"
                        style={inputStyle}
                        placeholder="Digite o nome do pet"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center" style={labelStyle}>
                        <span style={{ fontSize: '14px', marginRight: '8px' }}>🐾</span>
                        Espécie *
                      </label>
                      <select
                        value={pet.species}
                        onChange={(e) => updatePet(pet.tempId, 'species', e.target.value)}
                        className="w-full px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-300"
                        style={inputStyle}
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
                      <label style={labelStyle}>Raça</label>
                      <select
                        value={pet.breed}
                        onChange={(e) => updatePet(pet.tempId, 'breed', e.target.value)}
                        disabled={isLoadingBreeds}
                        className="w-full px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={inputStyle}
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
                          className="flex-1 px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-300"
                          style={inputStyle}
                          placeholder="Nova raça (se não existir)"
                        />
                        <button
                          type="button"
                          onClick={() => addBreedToSpecies(pet.tempId)}
                          disabled={isSubmittingBreed || isLoadingBreeds || !normalizeBreed(newBreed)}
                          className="px-4 py-3 text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ fontWeight: 500, color: '#5C6B70', background: '#fff', border: '1px solid #E8E2D6', borderRadius: '9px' }}
                          title="Adicionar esta raça ao banco para esta espécie"
                        >
                          {isSubmittingBreed ? 'Adicionando...' : 'Adicionar'}
                        </button>
                      </div>
                      <p style={{ fontSize: '12px', color: '#8A989D' }}>
                        {isLoadingBreeds
                          ? 'Carregando raças...'
                          : breedExists
                            ? 'Essa raça já existe. Ao adicionar, ela será apenas selecionada.'
                            : 'Selecione uma raça existente ou cadastre uma nova.'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label style={labelStyle}>Status *</label>
                      <select
                        value={pet.status}
                        onChange={(e) => updatePet(pet.tempId, 'status', e.target.value)}
                        className="w-full px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-300"
                        style={inputStyle}
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
                      <label style={labelStyle}>Sexo</label>
                      <select
                        value={pet.sex}
                        onChange={(e) => updatePet(pet.tempId, 'sex', e.target.value)}
                        className="w-full px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-300"
                        style={inputStyle}
                      >
                        <option value="">Selecione...</option>
                        <option value="Macho">Macho</option>
                        <option value="Fêmea">Fêmea</option>
                        <option value="Indefinido">Indefinido</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label style={labelStyle}>Esterilização</label>
                      <select
                        value={pet.sterilization}
                        onChange={(e) => updatePet(pet.tempId, 'sterilization', e.target.value)}
                        className="w-full px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-300"
                        style={inputStyle}
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
                      <label className="flex items-center" style={labelStyle}>
                        <span style={{ fontSize: '14px', marginRight: '8px' }}>🎂</span>
                        Data de Nascimento
                      </label>
                      <input
                        type="text"
                        value={pet.birthDate}
                        onChange={(e) => updatePet(pet.tempId, 'birthDate', e.target.value)}
                        className="w-full px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-300"
                        style={inputStyle}
                        placeholder="dd/mm/aaaa"
                      />
                    </div>

                    <div className="space-y-2">
                      <label style={labelStyle}>Pelagem</label>
                      <select
                        value={pet.coat}
                        onChange={(e) => updatePet(pet.tempId, 'coat', e.target.value)}
                        className="w-full px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-300"
                        style={inputStyle}
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
