import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST - Testar conexão com uma integração
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { integrationId, config } = body;

    if (!integrationId || !config) {
      return NextResponse.json(
        { success: false, message: 'Dados incompletos' },
        { status: 400 }
      );
    }

    let result: { success: boolean; message: string };

    switch (integrationId) {
      case 'whatsapp':
        result = await testWhatsApp(config);
        break;
      case 'openai':
        result = await testOpenAI(config);
        break;
      case 'gemini':
        result = await testGemini(config);
        break;
      case 'deepseek':
        result = await testDeepSeek(config);
        break;
      default:
        return NextResponse.json(
          { success: false, message: 'Integração inválida' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao testar integração:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno ao testar conexão' },
      { status: 500 }
    );
  }
}

// Testar WhatsApp Business API
async function testWhatsApp(config: {
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    if (!config.accessToken || !config.phoneNumberId) {
      return { success: false, message: 'Token de acesso e Phone Number ID são obrigatórios' };
    }

    // Fazer uma chamada de verificação para a API do WhatsApp
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${config.phoneNumberId}`,
      {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      return { 
        success: true, 
        message: `Conectado! Número: ${data.display_phone_number || config.phoneNumberId}` 
      };
    } else {
      const error = await response.json();
      return { 
        success: false, 
        message: error.error?.message || 'Falha na autenticação com WhatsApp API' 
      };
    }
  } catch (error) {
    return { success: false, message: 'Erro ao conectar com WhatsApp API' };
  }
}

// Testar OpenAI API
async function testOpenAI(config: {
  apiKey: string;
  model: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    if (!config.apiKey) {
      return { success: false, message: 'API Key é obrigatória' };
    }

    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      return { success: true, message: 'Conexão estabelecida com OpenAI!' };
    } else {
      const error = await response.json();
      return { 
        success: false, 
        message: error.error?.message || 'API Key inválida' 
      };
    }
  } catch (error) {
    return { success: false, message: 'Erro ao conectar com OpenAI' };
  }
}

// Testar Google Gemini API
async function testGemini(config: {
  apiKey: string;
  model: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    if (!config.apiKey) {
      return { success: false, message: 'API Key é obrigatória' };
    }

    // Testar listando modelos disponíveis
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${config.apiKey}`
    );

    if (response.ok) {
      return { success: true, message: 'Conexão estabelecida com Google Gemini!' };
    } else {
      const error = await response.json();
      return { 
        success: false, 
        message: error.error?.message || 'API Key inválida' 
      };
    }
  } catch (error) {
    return { success: false, message: 'Erro ao conectar com Google Gemini' };
  }
}

// Testar DeepSeek API
async function testDeepSeek(config: {
  apiKey: string;
  model: string;
  baseUrl: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    if (!config.apiKey) {
      return { success: false, message: 'API Key é obrigatória' };
    }

    const baseUrl = config.baseUrl || 'https://api.deepseek.com';

    // Fazer uma chamada simples para verificar a API
    const response = await fetch(`${baseUrl}/v1/models`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      return { success: true, message: 'Conexão estabelecida com DeepSeek!' };
    } else {
      // DeepSeek pode não ter endpoint de models, tentar chat
      const chatResponse = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model || 'deepseek-chat',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        })
      });

      if (chatResponse.ok) {
        return { success: true, message: 'Conexão estabelecida com DeepSeek!' };
      }

      const error = await chatResponse.json();
      return { 
        success: false, 
        message: error.error?.message || 'API Key inválida' 
      };
    }
  } catch (error) {
    return { success: false, message: 'Erro ao conectar com DeepSeek' };
  }
}







