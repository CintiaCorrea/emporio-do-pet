// Mapeamento entre valores do frontend e enums do Prisma
export const speciesMap = {
  'Canina': 'CANINE',
  'Felina': 'FELINE',
  'Ave': 'BIRD',
  'Roedor': 'RODENT',
  'Réptil': 'REPTILE',
  'Outro': 'OTHER'
} as const;

export const statusMap = {
  'Ativo': 'ACTIVE',
  'Inativo': 'INACTIVE',
  'Óbito': 'DECEASED',
  'Transferido': 'TRANSFERRED'
} as const;

export const genderMap = {
  'Macho': 'MALE',
  'Fêmea': 'FEMALE',
  'Indefinido': 'OTHER'
} as const;

export const sterilizationMap = {
  'Sim': 'STERILIZED',
  'Não': 'NOT_STERILIZED',
  'Agendado': 'SCHEDULED'
} as const;

export const coatMap = {
  'Curta': 'SHORT',
  'Longa': 'LONG',
  'Lisa': 'SMOOTH',
  'Ondulada': 'WAVY',
  'Cacheados': 'CURLY',
  'Dourado': 'GOLDEN',
  'Preto': 'BLACK',
  'Branco': 'WHITE',
  'Marrom': 'BROWN',
  'Misturado': 'MIXED'
} as const;

// Funções para converter entre frontend e backend
export const mapPetToBackend = (petData: any) => {
  const mappedData = {
    name: petData.name,
    species: speciesMap[petData.species as keyof typeof speciesMap] || 'CANINE',
    breed: petData.breed || null,
    status: statusMap[petData.status as keyof typeof statusMap] || 'ACTIVE',
    gender: petData.sex ? genderMap[petData.sex as keyof typeof genderMap] : null,
    sterilization: petData.sterilization ? sterilizationMap[petData.sterilization as keyof typeof sterilizationMap] : null,
    birthDate: petData.birthDate ? new Date(petData.birthDate) : null,
    coat: petData.coat ? coatMap[petData.coat as keyof typeof coatMap] : null,
    coatColor: petData.coatColor || null,
    weight: petData.weight || null,
    microchip: petData.microchip || null,
    avatar: petData.avatar || null,
    observations: petData.observations || null,
    allergies: petData.allergies || [],
    medicalNotes: petData.medicalNotes || null,
    tutorId: petData.tutorId
  };

  // Remover campos undefined
  Object.keys(mappedData).forEach(key => {
    if (mappedData[key as keyof typeof mappedData] === undefined) {
      delete mappedData[key as keyof typeof mappedData];
    }
  });

  return mappedData;
};

export const mapPetToFrontend = (petData: any) => {
  const speciesReverseMap = Object.fromEntries(
    Object.entries(speciesMap).map(([key, value]) => [value, key])
  );
  
  const statusReverseMap = Object.fromEntries(
    Object.entries(statusMap).map(([key, value]) => [value, key])
  );

  const genderReverseMap = Object.fromEntries(
    Object.entries(genderMap).map(([key, value]) => [value, key])
  );

  const sterilizationReverseMap = Object.fromEntries(
    Object.entries(sterilizationMap).map(([key, value]) => [value, key])
  );

  const coatReverseMap = Object.fromEntries(
    Object.entries(coatMap).map(([key, value]) => [value, key])
  );

  return {
    ...petData,
    species: speciesReverseMap[petData.species] || 'Canina',
    status: statusReverseMap[petData.status] || 'Ativo',
    sex: petData.gender ? genderReverseMap[petData.gender] : '',
    sterilization: petData.sterilization ? sterilizationReverseMap[petData.sterilization] : '',
    coat: petData.coat ? coatReverseMap[petData.coat] : '',
    birthDate: petData.birthDate ? new Date(petData.birthDate).toLocaleDateString('pt-BR') : '',
    owner: petData.tutor?.name || ''
  };
};
