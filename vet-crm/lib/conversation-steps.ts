// lib/conversation-steps.ts
import { ConversationFlow, BotConversaMessage, BotConversaContact, AppointmentData, SpeciesMap, ValidatedAppointmentData } from '@/types/bot-conversa';
import { PetSpecies } from '@prisma/client';

interface StepResult {
  completed: boolean;
  nextStep: string;
  appointmentData: Partial<AppointmentData>;
  response?: string;
}

// Mapeamento de espécies
const speciesMap: SpeciesMap = {
  '1': PetSpecies.CANINE,
  'cachorro': PetSpecies.CANINE,
  'cadela': PetSpecies.CANINE,
  'dog': PetSpecies.CANINE,
  '2': PetSpecies.FELINE,
  'gato': PetSpecies.FELINE,
  'gata': PetSpecies.FELINE,
  'cat': PetSpecies.FELINE,
  '3': PetSpecies.BIRD,
  'pássaro': PetSpecies.BIRD,
  'passaro': PetSpecies.BIRD,
  'ave': PetSpecies.BIRD,
  'bird': PetSpecies.BIRD,
  '4': PetSpecies.RODENT,
  'roedor': PetSpecies.RODENT,
  'hamster': PetSpecies.RODENT,
  'rato': PetSpecies.RODENT,
  'porquinho': PetSpecies.RODENT,
  '5': PetSpecies.REPTILE,
  'réptil': PetSpecies.REPTILE,
  'reptil': PetSpecies.REPTILE,
  'cobra': PetSpecies.REPTILE,
  'lagarto': PetSpecies.REPTILE,
  'tartaruga': PetSpecies.REPTILE,
  '6': PetSpecies.OTHER,
  'outro': PetSpecies.OTHER,
  'outra': PetSpecies.OTHER,
  'other': PetSpecies.OTHER
};

export async function processMessageStep(
  flow: ConversationFlow, 
  message: BotConversaMessage, 
  contact: BotConversaContact
): Promise<StepResult> {
  const userMessage = message.value.toLowerCase().trim();
  let appointmentData = flow.appointmentData || {};

  switch (flow.step) {
    case 'welcome':
      appointmentData = {
        ...appointmentData,
        tutorName: contact.name,
        tutorPhone: contact.phone,
        tutorEmail: contact.email || ''
      };
      
      return {
        completed: false,
        nextStep: 'pet_name',
        appointmentData,
        response: `Olá ${contact.name}! 😊 Vou te ajudar a agendar uma consulta para seu pet.\n\nQual o nome do seu pet?`
      };

    case 'pet_name':
      appointmentData = {
        ...appointmentData,
        petName: message.value
      };
      
      return {
        completed: false,
        nextStep: 'pet_species',
        appointmentData,
        response: `Que nome lindo! 🐾 Qual a espécie do ${message.value}?\n\n1️⃣ Cachorro\n2️⃣ Gato\n3️⃣ Pássaro\n4️⃣ Roedor\n5️⃣ Réptil\n6️⃣ Outro`
      };

    case 'pet_species':
      const speciesKey = userMessage.split(' ')[0];
      const species = speciesMap[speciesKey];
      
      if (!species) {
        return {
          completed: false,
          nextStep: 'pet_species',
          appointmentData,
          response: 'Por favor, escolha uma opção válida:\n\n1️⃣ Cachorro\n2️⃣ Gato\n3️⃣ Pássaro\n4️⃣ Roedor\n5️⃣ Réptil\n6️⃣ Outro'
        };
      }

      appointmentData = {
        ...appointmentData,
        petSpecies: species
      };
      
      return {
        completed: false,
        nextStep: 'pet_breed',
        appointmentData,
        response: 'Ótimo! Qual a raça do seu pet? (Se não souber, pode digitar "SRD" ou "Vira-lata")'
      };

    case 'pet_breed':
      appointmentData = {
        ...appointmentData,
        petBreed: message.value || 'Não informada'
      };
      
      return {
        completed: false,
        nextStep: 'appointment_date',
        appointmentData,
        response: 'Perfeito! 📅 Para qual data você gostaria de agendar a consulta?\n\nPor favor, informe no formato DD/MM/AAAA'
      };

    case 'appointment_date':
      const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const match = userMessage.match(dateRegex);
      
      if (!match) {
        return {
          completed: false,
          nextStep: 'appointment_date',
          appointmentData,
          response: 'Por favor, informe a data no formato correto: DD/MM/AAAA\n\nExemplo: 25/12/2024'
        };
      }

      const [, day, month, year] = match;
      const appointmentDate = `${year}-${month}-${day}`;
      
      const selectedDate = new Date(Number(year), Number(month) - 1, Number(day));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        return {
          completed: false,
          nextStep: 'appointment_date',
          appointmentData,
          response: 'Por favor, informe uma data futura. Não é possível agendar para datas passadas.\n\nFormato: DD/MM/AAAA'
        };
      }

      appointmentData = {
        ...appointmentData,
        appointmentDate
      };
      
      return {
        completed: false,
        nextStep: 'appointment_time',
        appointmentData,
        response: 'Qual horário seria melhor para você?\n\nPor favor, informe no formato HH:MM\n\nExemplo: 14:30'
      };

    case 'appointment_time':
      const timeRegex = /^(\d{1,2}):(\d{2})$/;
      const timeMatch = userMessage.match(timeRegex);
      
      if (!timeMatch) {
        return {
          completed: false,
          nextStep: 'appointment_time',
          appointmentData,
          response: 'Por favor, informe o horário no formato HH:MM\n\nExemplo: 14:30'
        };
      }

      const [, hours, minutes] = timeMatch;
      const hourNum = parseInt(hours);
      const minuteNum = parseInt(minutes);

      if (hourNum < 8 || hourNum > 18 || minuteNum < 0 || minuteNum > 59) {
        return {
          completed: false,
          nextStep: 'appointment_time',
          appointmentData,
          response: 'Por favor, informe um horário entre 08:00 e 18:00.\n\nExemplo: 14:30'
        };
      }

      appointmentData = {
        ...appointmentData,
        appointmentTime: `${hours}:${minutes}`,
        duration: 30
      };
      
      return {
        completed: false,
        nextStep: 'description',
        appointmentData,
        response: 'Quase lá! 📝 Poderia me contar brevemente qual é o motivo da consulta?'
      };

    case 'description':
      appointmentData = {
        ...appointmentData,
        description: message.value || 'Consulta geral'
      };
      
      // Validar se todos os campos obrigatórios estão preenchidos
      const validatedData = validateAppointmentData(appointmentData, contact);
      
      if (!validatedData) {
        return {
          completed: false,
          nextStep: 'welcome',
          appointmentData: {},
          response: 'Houve um erro com os dados do agendamento. Vamos começar novamente. Qual o seu nome?'
        };
      }

      return {
        completed: true,
        nextStep: 'completed',
        appointmentData: validatedData,
        response: `✅ Agendamento confirmado!

📋 Resumo do agendamento:
👤 Tutor: ${validatedData.tutorName}
📞 Contato: ${validatedData.tutorPhone}
🐾 Pet: ${validatedData.petName} (${validatedData.petBreed})
📅 Data: ${validatedData.appointmentDate} às ${validatedData.appointmentTime}
📝 Motivo: ${validatedData.description}

Em breve entraremos em contato para confirmar. Obrigado! 🐶🐱`
      };

    default:
      return {
        completed: false,
        nextStep: 'welcome',
        appointmentData: {},
        response: 'Olá! Vou te ajudar a agendar uma consulta. Qual o seu nome?'
      };
  }
}

// Função para validar e garantir que todos os campos obrigatórios estão preenchidos
function validateAppointmentData(
  data: Partial<AppointmentData>, 
  contact: BotConversaContact
): AppointmentData | null {
  const requiredFields = [
    'tutorName',
    'tutorPhone', 
    'petName',
    'petSpecies',
    'appointmentDate',
    'appointmentTime',
    'description',
    'duration'
  ];

  for (const field of requiredFields) {
    if (!data[field as keyof AppointmentData]) {
      console.error(`Missing required field: ${field}`, data);
      return null;
    }
  }

  // Garantir valores padrão para campos opcionais
  return {
    tutorName: data.tutorName!,
    tutorPhone: data.tutorPhone!,
    tutorEmail: data.tutorEmail || contact.email || '',
    petName: data.petName!,
    petSpecies: data.petSpecies!,
    petBreed: data.petBreed || 'Não informada',
    appointmentDate: data.appointmentDate!,
    appointmentTime: data.appointmentTime!,
    description: data.description!,
    duration: data.duration!
  };
}

// Função auxiliar para obter o nome da espécie em português
export function getSpeciesName(species: PetSpecies): string {
  const speciesNames = {
    [PetSpecies.CANINE]: 'Cachorro',
    [PetSpecies.FELINE]: 'Gato',
    [PetSpecies.BIRD]: 'Pássaro',
    [PetSpecies.RODENT]: 'Roedor',
    [PetSpecies.REPTILE]: 'Réptil',
    [PetSpecies.OTHER]: 'Outro'
  };
  
  return speciesNames[species] || 'Desconhecido';
}
