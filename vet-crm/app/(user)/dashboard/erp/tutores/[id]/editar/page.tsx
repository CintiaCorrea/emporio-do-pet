'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTutorEdit } from '@/hooks/useTutorEdit';
import LoadingState from '@/components/protected/dashboard/tutors/edit/LoadingState';
import ErrorState from '@/components/protected/dashboard/tutors/edit/ErrorState';
import EditTutorHeader from '@/components/protected/dashboard/tutors/edit/EditTutorHeader';
import AlertMessages from '@/components/protected/dashboard/tutors/edit/AlertMessages';
import TutorTabs, { TutorTabType } from '@/components/protected/dashboard/tutors/edit/TutorTabs';
import GeneralTab from '@/components/protected/dashboard/tutors/edit/tabs/GeneralTab';
import AddressTab from '@/components/protected/dashboard/tutors/edit/tabs/AddressTab';
import ExtrasTab from '@/components/protected/dashboard/tutors/edit/tabs/ExtrasTab';
import PetsTab from '@/components/protected/dashboard/tutors/edit/tabs/PetsTab';
import FormActions from '@/components/protected/dashboard/tutors/edit/FormActions';
import toast from 'react-hot-toast';
import { PetInline, parseAllergies, parseWeight, parseBirthDateToISOString, formatISOToDisplay } from '@/types/pet-inline';

interface ApiPet {
  id: string;
  name: string;
  species: string;
  breed? (() => null) : string;
  status: string;
  sex? (() => null) : string;
  sterilization? (() => null) : string;
  birthDate? (() => null) : string;
  coat? (() => null) : string;
  coatColor? (() => null) : string;
  weight? (() => null) : number;
  microchip? (() => null) : string;
  allergies? (() => null) : string[];
  medicalNotes? (() => null) : string;
  observations? (() => null) : string;
  documents? (() => null) : string[];
  avatar? (() => null) : string;
}

export default function EditTutorPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TutorTabType>('geral');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pets, setPets] = useState<PetInline[]>([]);
  const [petsLoading, setPetsLoading] = useState(true);

  const tutorId = params.id as string;
  const { 
    tutor, 
    loading, 
    error, 
    refetch, 
    updateTutor, 
    updateContact, 
    addContact, 
    removeContact, 
    setPrimaryContact 
  } = useTutorEdit(tutorId);

  useEffect(() => {
    const fetchPets = async () => {
      if (!tutorId) return;
      
      try {
        setPetsLoading(true);
        const response = await fetch(`/api/pets?tutorId=${tutorId}`);
        
        if (response.ok) {
          const data = await response.json();
          const petsArray: ApiPet[] = Array.isArray(data) ? data : Array.isArray(data?.pets) ? data.pets : [];
          
          const mappedPets: PetInline[] = petsArray.map((pet) => ({
            id: pet.id,
            tempId: pet.id,
            name: pet.name || '',
            species: pet.species || 'Canina',
            breed: pet.breed || '',
            status: pet.status || 'Ativo',
            sex: pet.sex || '',
            sterilization: pet.sterilization || '',
            birthDate: formatISOToDisplay(pet.birthDate),
            coat: pet.coat || '',
            coatColor: pet.coatColor || '',
            weight: pet.weight ? String(pet.weight) : '',
            microchip: pet.microchip || '',
            allergies: Array.isArray(pet.allergies) ? pet.allergies.join('\n') : '',
            medicalNotes: pet.medicalNotes || '',
            observations: pet.observations || '',
            documents: pet.documents || [],
            avatar: pet.avatar || '',
            isNew: false,
            isDeleted: false}));
          
          setPets(mappedPets);
        }
      } catch (err) {
        console.error('Erro ao carregar pets:', err);
      } finally {
        setPetsLoading(false);
      }
    };

    fetchPets();
  }, [tutorId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutor) return;

    try {
      setSaving(true);
      setSubmitError(null);
      setSuccess(false);

      if (!tutor.name.trim()) {
        throw new Error('Nome é obrigatório');
      }

      const sanitize = <T,>(value: T) => {
        if (typeof value === 'string' && value.trim() === '') return undefined;
        return value;
      };

      // Enviar apenas campos aceitos pelo DTO de update (sem contacts/createdAt/updatedAt/id)
      const payload = {
        type: tutor.type,
        name: tutor.name,
        isActive: tutor.isActive,
        email: tutor.email,
        nationality: tutor.nationality,
        gender: tutor.gender,
        cpf: tutor.cpf,
        rg: tutor.rg,
        birthDate: tutor.birthDate ? new Date(tutor.birthDate).toISOString() : undefined,
        profession: tutor.profession,
        howFoundUs: tutor.howFoundUs,
        acceptsEmail: tutor.acceptsEmail,
        acceptsWhatsApp: tutor.acceptsWhatsApp,
        acceptsSMS: tutor.acceptsSMS,
        acceptsSmsCampaign: tutor.acceptsSmsCampaign,
        cep: tutor.cep,
        address: tutor.address,
        addressNumber: tutor.addressNumber,
        complement: tutor.complement,
        referencePoint: tutor.referencePoint,
        neighborhood: tutor.neighborhood,
        city: tutor.city,
        state: tutor.state,
        observations: tutor.observations,
        tags: tutor.tags || [],
        formDate: tutor.formDate ? new Date(tutor.formDate).toISOString() : undefined,
        inclusionDate: tutor.inclusionDate ? new Date(tutor.inclusionDate).toISOString() : undefined};

      const response = await fetch(`/api/tutors/${tutor.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify(payload)});

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar tutor');
      }

      // Gerenciar pets: criar novos, atualizar existentes, deletar removidos
      const petsToDelete = pets.filter(p => p.isDeleted && p.id);
      const petsToCreate = pets.filter(p => !p.isDeleted && !p.id && p.name.trim());
      const petsToUpdate = pets.filter(p => !p.isDeleted && p.id && p.name.trim());

      // Deletar pets marcados para exclusão
      const deletePromises = petsToDelete.map(async (pet) => {
        try {
          await fetch(`/api/pets/${pet.id}`, { method: 'DELETE' });
        } catch (err) {
          console.error(`Erro ao deletar pet ${pet.id}:`, err);
        }
      });

      // Criar novos pets
      const createPromises = petsToCreate.map(async (pet) => {
        const birthDateIso = pet.birthDate?.trim()
          ? parseBirthDateToISOString(pet.birthDate)
          : undefined;

        const petPayload = {
          name: pet.name,
          species: pet.species,
          breed: sanitize(pet.breed),
          status: pet.status,
          sex: sanitize(pet.sex),
          sterilization: sanitize(pet.sterilization),
          birthDate: birthDateIso,
          coat: sanitize(pet.coat),
          coatColor: sanitize(pet.coatColor),
          weight: parseWeight(pet.weight),
          microchip: sanitize(pet.microchip),
          allergies: parseAllergies(pet.allergies),
          medicalNotes: sanitize(pet.medicalNotes),
          observations: sanitize(pet.observations),
          documents: pet.documents,
          avatar: sanitize(pet.avatar),
          tutorId: tutor.id};

        try {
          await fetch('/api/pets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(petPayload)});
        } catch (err) {
          console.error(`Erro ao criar pet ${pet.name}:`, err);
        }
      });

      // Atualizar pets existentes
      const updatePromises = petsToUpdate.map(async (pet) => {
        const birthDateIso = pet.birthDate?.trim()
          ? parseBirthDateToISOString(pet.birthDate)
          : undefined;

        const petPayload = {
          name: pet.name,
          species: pet.species,
          breed: sanitize(pet.breed),
          status: pet.status,
          sex: sanitize(pet.sex),
          sterilization: sanitize(pet.sterilization),
          birthDate: birthDateIso,
          coat: sanitize(pet.coat),
          coatColor: sanitize(pet.coatColor),
          weight: parseWeight(pet.weight),
          microchip: sanitize(pet.microchip),
          allergies: parseAllergies(pet.allergies),
          medicalNotes: sanitize(pet.medicalNotes),
          observations: sanitize(pet.observations),
          documents: pet.documents,
          avatar: sanitize(pet.avatar)};

        try {
          await fetch(`/api/pets/${pet.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(petPayload)});
        } catch (err) {
          console.error(`Erro ao atualizar pet ${pet.id}:`, err);
        }
      });

      await Promise.all([...deletePromises, ...createPromises, ...updatePromises]);

      setSuccess(true);
      toast.success('Tutor e pets atualizados com sucesso!');
      router.push(`/dashboard/erp/tutores/${tutor.id}`);

    } catch (error) {
      console.error('Erro ao atualizar tutor:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 w-full overflow-hidden">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <LoadingState />
          </div>
        </div>
      </div>
    );
  }

  if (error || !tutor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 w-full overflow-hidden">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <ErrorState 
              error={error || 'Tutor não encontrado'} 
              onRetry={refetch}
              tutorId={tutorId}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 w-full overflow-hidden">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <EditTutorHeader tutorName={tutor.name} tutorId={tutor.id} />
          
          <AlertMessages 
            error={submitError} 
            success={success} 
            onDismissError={() => setSubmitError(null)} 
          />

          {/* Main Card */}
          <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-blue-500/10 overflow-hidden">
            <TutorTabs activeTab={activeTab} onTabChange={setActiveTab} showPetsTab={true} />

            <form onSubmit={handleSubmit} className="p-8">
              {activeTab === 'geral' && (
                <GeneralTab
                  tutor={tutor}
                  onTutorChange={updateTutor}
                  onContactChange={updateContact}
                  onAddContact={addContact}
                  onRemoveContact={removeContact}
                  onSetPrimaryContact={setPrimaryContact}
                />
              )}

              {activeTab === 'endereco' && (
                <AddressTab
                  tutor={tutor}
                  onTutorChange={updateTutor}
                />
              )}

              {activeTab === 'extras' && (
                <ExtrasTab
                  tutor={tutor}
                  onTutorChange={updateTutor}
                />
              )}

              {activeTab === 'pets' && (
                petsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    <span className="ml-3 text-gray-600">Carregando pets...</span>
                  </div>
                ) : (
                  <PetsTab
                    pets={pets}
                    onPetsChange={setPets}
                    tutorId={tutor.id}
                  />
                )
              )}

              <FormActions saving={saving} tutorId={tutor.id} />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
