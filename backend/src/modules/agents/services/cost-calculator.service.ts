import { Injectable, Logger } from '@nestjs/common';

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface CostBreakdown {
  promptCost: number;
  completionCost: number;
  totalCost: number;
  model: string;
  provider: string;
  currency: 'USD';
}

export interface TTSCostBreakdown {
  characters: number;
  model: string;
  costPerCharacter: number;
  totalCost: number;
  currency: 'USD';
}

// Pricing per 1M tokens (as of Feb 2026)
// Source: Official provider pricing pages
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI Models (per 1M tokens)
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-4': { input: 30, output: 60 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'o1': { input: 15, output: 60 },
  'o1-mini': { input: 3, output: 12 },
  'o1-preview': { input: 15, output: 60 },
  'o3-mini': { input: 1.1, output: 4.4 },

  // Google Gemini Models (per 1M tokens)
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'gemini-2.0-flash-lite': { input: 0.075, output: 0.3 },
  'gemini-1.5-pro': { input: 1.25, output: 5 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
  'gemini-1.5-flash-8b': { input: 0.0375, output: 0.15 },
  'gemini-1.0-pro': { input: 0.5, output: 1.5 },

  // DeepSeek Models (per 1M tokens)
  'deepseek-chat': { input: 0.14, output: 0.28 },
  'deepseek-reasoner': { input: 0.55, output: 2.19 },
  'deepseek-coder': { input: 0.14, output: 0.28 },
};

// TTS Pricing (per 1M characters)
const TTS_PRICING: Record<string, number> = {
  'tts-1': 15,      // $15 per 1M characters
  'tts-1-hd': 30,   // $30 per 1M characters
};

@Injectable()
export class CostCalculatorService {
  private readonly logger = new Logger(CostCalculatorService.name);

  /**
   * Calculate cost for a text generation request
   */
  calculateTextCost(
    usage: TokenUsage,
    model: string,
    provider: string,
  ): CostBreakdown {
    const normalizedModel = this.normalizeModelName(model);
    const pricing = MODEL_PRICING[normalizedModel];

    if (!pricing) {
      this.logger.warn(`No pricing found for model: ${model}, using gpt-4o-mini pricing`);
      const fallbackPricing = MODEL_PRICING['gpt-4o-mini'];
      return this.computeCost(usage, fallbackPricing, model, provider);
    }

    return this.computeCost(usage, pricing, model, provider);
  }

  /**
   * Calculate cost for TTS generation
   */
  calculateTTSCost(text: string, model: string): TTSCostBreakdown {
    const characters = text.length;
    const normalizedModel = model.toLowerCase();
    const pricePerMillion = TTS_PRICING[normalizedModel] || TTS_PRICING['tts-1'];
    const costPerCharacter = pricePerMillion / 1_000_000;
    const totalCost = characters * costPerCharacter;

    return {
      characters,
      model,
      costPerCharacter,
      totalCost: Math.round(totalCost * 1_000_000) / 1_000_000, // Round to 6 decimal places
      currency: 'USD',
    };
  }

  /**
   * Get estimated cost before execution (for budget checking)
   */
  estimateCost(
    estimatedPromptTokens: number,
    estimatedCompletionTokens: number,
    model: string,
    provider: string,
  ): number {
    const usage: TokenUsage = {
      prompt_tokens: estimatedPromptTokens,
      completion_tokens: estimatedCompletionTokens,
      total_tokens: estimatedPromptTokens + estimatedCompletionTokens,
    };

    return this.calculateTextCost(usage, model, provider).totalCost;
  }

  /**
   * Get pricing info for a model
   */
  getModelPricing(model: string): { input: number; output: number } | null {
    const normalizedModel = this.normalizeModelName(model);
    return MODEL_PRICING[normalizedModel] || null;
  }

  /**
   * Get all available model pricing
   */
  getAllPricing(): Record<string, { input: number; output: number }> {
    return { ...MODEL_PRICING };
  }

  /**
   * Get TTS pricing
   */
  getTTSPricing(): Record<string, number> {
    return { ...TTS_PRICING };
  }

  private computeCost(
    usage: TokenUsage,
    pricing: { input: number; output: number },
    model: string,
    provider: string,
  ): CostBreakdown {
    const promptCost = (usage.prompt_tokens / 1_000_000) * pricing.input;
    const completionCost = (usage.completion_tokens / 1_000_000) * pricing.output;
    const totalCost = promptCost + completionCost;

    return {
      promptCost: Math.round(promptCost * 1_000_000) / 1_000_000,
      completionCost: Math.round(completionCost * 1_000_000) / 1_000_000,
      totalCost: Math.round(totalCost * 1_000_000) / 1_000_000,
      model,
      provider,
      currency: 'USD',
    };
  }

  private normalizeModelName(model: string): string {
    const modelLower = model.toLowerCase();
    
    // Handle OpenAI model variants
    if (modelLower.startsWith('gpt-4o-mini')) return 'gpt-4o-mini';
    if (modelLower.startsWith('gpt-4o')) return 'gpt-4o';
    if (modelLower.startsWith('gpt-4-turbo')) return 'gpt-4-turbo';
    if (modelLower.startsWith('gpt-4')) return 'gpt-4';
    if (modelLower.startsWith('gpt-3.5')) return 'gpt-3.5-turbo';
    if (modelLower.startsWith('o1-mini')) return 'o1-mini';
    if (modelLower.startsWith('o1-preview')) return 'o1-preview';
    if (modelLower.startsWith('o1')) return 'o1';
    if (modelLower.startsWith('o3-mini')) return 'o3-mini';

    // Handle Gemini model variants
    if (modelLower.includes('gemini-2.0-flash-lite')) return 'gemini-2.0-flash-lite';
    if (modelLower.includes('gemini-2.0-flash')) return 'gemini-2.0-flash';
    if (modelLower.includes('gemini-1.5-pro')) return 'gemini-1.5-pro';
    if (modelLower.includes('gemini-1.5-flash-8b')) return 'gemini-1.5-flash-8b';
    if (modelLower.includes('gemini-1.5-flash')) return 'gemini-1.5-flash';
    if (modelLower.includes('gemini-1.0-pro') || modelLower.includes('gemini-pro')) return 'gemini-1.0-pro';

    // Handle DeepSeek model variants
    if (modelLower.includes('deepseek-reasoner')) return 'deepseek-reasoner';
    if (modelLower.includes('deepseek-coder')) return 'deepseek-coder';
    if (modelLower.includes('deepseek')) return 'deepseek-chat';

    return modelLower;
  }
}
