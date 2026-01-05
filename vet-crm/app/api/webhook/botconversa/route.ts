// app/api/webhook/botconversa/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Validação básica do payload do BotConversa
    if (!payload.name || !payload.phone) {
      return NextResponse.json(
        { error: 'Dados obrigatórios faltando' },
        { status: 400 }
      );
    }

    console.log('Webhook BotConversa recebido:', payload);

    // Processar campos específicos do BotConversa
    const fields = payload.fields || {};
    
    const pacienteData = {
      id: Math.random().toString(36).substr(2, 9),
      nome: fields.nome_animal || 'Não informado',
      especie: fields.especie || 'Não informado',
      raca: fields.raca || 'Não informado',
      idade: parseInt(fields.idade) || 0,
      proprietario: payload.name,
      telefone: payload.phone,
      email: payload.email || 'Não informado',
      dataConsulta: fields.data_consulta || new Date().toISOString(),
      sintomas: fields.sintomas || 'Não informado',
      origem: 'botconversa' as const,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(
      { 
        success: true, 
        message: 'Paciente cadastrado via BotConversa',
        paciente: pacienteData 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Erro no webhook BotConversa:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
