// app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Validação básica do payload do n8n
    if (!payload.paciente || !payload.proprietario || !payload.consulta) {
      return NextResponse.json(
        { error: 'Payload inválido' },
        { status: 400 }
      );
    }

    // Aqui você processaria os dados e salvaria no banco de dados
    console.log('Webhook n8n recebido:', payload);

    // Simulação de salvamento no banco
    const pacienteData = {
      id: Math.random().toString(36).substr(2, 9),
      ...payload.paciente,
      proprietario: payload.proprietario.nome,
      telefone: payload.proprietario.telefone,
      email: payload.proprietario.email,
      dataConsulta: payload.consulta.data,
      sintomas: payload.consulta.sintomas,
      origem: 'n8n' as const,
      createdAt: new Date().toISOString(),
    };

    // Retorna sucesso
    return NextResponse.json(
      { 
        success: true, 
        message: 'Paciente cadastrado via n8n',
        paciente: pacienteData 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Erro no webhook n8n:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
