import OpenAI from "openai";
import { apiKeyManager } from './apiKeyManager';

let openaiInstance: OpenAI | null = null;

export const getOpenAIClient = (): OpenAI => {
  const apiKey = apiKeyManager.getApiKey();
  
  if (!apiKey) {
    throw new Error('Invalid OpenAI API key. Please configure your API key.');
  }
  
  if (!openaiInstance || openaiInstance.apiKey !== apiKey) {
    openaiInstance = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
  }
  
  return openaiInstance;
};

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    const testClient = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
    
    // Test with a minimal request
    await testClient.models.list();
    return true;
  } catch {
    return false;
  }
};

export const sanitizeInput = (text: string): string => {
  const div = document.createElement("div");
  div.innerText = text;
  return div.innerText;
};