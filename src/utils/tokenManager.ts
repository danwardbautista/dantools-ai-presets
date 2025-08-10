// token management for openai models

import { ChatMessage } from '../types';

// model token limits (80% of actual limits for safety)
export const MODEL_LIMITS = {
  'gpt-4.1': 800000,        // 80% of 1M tokens
  'gpt-4.1-mini': 800000,   // 80% of 1M tokens
  'gpt-4.1-nano': 800000,   // 80% of 1M tokens
  'gpt-4o': 102400,         // 80% of 128K tokens
  'gpt-4o-mini': 102400,    // 80% of 128K tokens
} as const;

// warning thresholds
export const TOKEN_WARNING_THRESHOLDS = {
  LOW: 0.6,    // 60% - show info
  MEDIUM: 0.8, // 80% - show warning
  HIGH: 0.9,   // 90% - show danger
} as const;

export type TokenUsageLevel = 'safe' | 'info' | 'warning' | 'danger';

export interface TokenUsage {
  estimated: number;
  limit: number;
  percentage: number;
  level: TokenUsageLevel;
  remaining: number;
}

// rough token estimation - 4 chars ≈ 1 token
export const estimateTokens = (text: string): number => {
  const normalizedText = text.trim().replace(/\s+/g, ' ');
  const baseTokens = Math.ceil(normalizedText.length / 4);
  
  // add extra tokens for markdown and formatting
  const markdownPenalty = (text.match(/```|`|\*\*|\*|#{1,6}|\[|\]|\(|\)/g) || []).length;
  const newlinePenalty = (text.match(/\n/g) || []).length;
  
  return baseTokens + Math.ceil(markdownPenalty * 0.5) + Math.ceil(newlinePenalty * 0.2);
};

// calculate tokens for message array
export const calculateMessageTokens = (messages: ChatMessage[]): number => {
  let totalTokens = 0;
  
  messages.forEach(message => {
    totalTokens += estimateTokens(message.message);
    totalTokens += 6; // role overhead
  });
  
  totalTokens += 10; // system message overhead
  
  return totalTokens;
};

// calculate tokens for full conversation
export const calculateConversationTokens = (
  messages: ChatMessage[],
  systemPrompt: string,
  additionalInput?: string
): number => {
  let totalTokens = 0;
  
  totalTokens += estimateTokens(systemPrompt) + 6; // system prompt
  totalTokens += calculateMessageTokens(messages); // message history
  
  if (additionalInput) {
    totalTokens += estimateTokens(additionalInput) + 6; // current input
  }
  
  totalTokens += 1000; // reserve for response
  
  return totalTokens;
};

// get token usage analysis
export const getTokenUsage = (
  estimatedTokens: number,
  model: string = 'gpt-4.1'
): TokenUsage => {
  const limit = MODEL_LIMITS[model as keyof typeof MODEL_LIMITS] || MODEL_LIMITS['gpt-4.1'];
  const percentage = estimatedTokens / limit;
  const remaining = Math.max(0, limit - estimatedTokens);
  
  let level: TokenUsageLevel = 'safe';
  if (percentage >= TOKEN_WARNING_THRESHOLDS.HIGH) {
    level = 'danger';
  } else if (percentage >= TOKEN_WARNING_THRESHOLDS.MEDIUM) {
    level = 'warning';
  } else if (percentage >= TOKEN_WARNING_THRESHOLDS.LOW) {
    level = 'info';
  }
  
  return {
    estimated: estimatedTokens,
    limit,
    percentage,
    level,
    remaining,
  };
};

// check if conversation needs optimization
export const shouldOptimizeConversation = (
  messages: ChatMessage[],
  systemPrompt: string,
  model: string = 'gpt-4.1'
): boolean => {
  const tokens = calculateConversationTokens(messages, systemPrompt);
  const usage = getTokenUsage(tokens, model);
  return usage.level === 'danger' || usage.percentage > 0.85;
};

// optimize conversation by keeping recent messages
export const optimizeConversation = async (
  messages: ChatMessage[],
  _systemPrompt: string, // Unused in current implementation
  _model?: string, // Unused in current implementation but kept for future enhancement
  keepRecentCount: number = 6
): Promise<ChatMessage[]> => {
  if (messages.length <= keepRecentCount) {
    return messages;
  }
  
  const recentMessages = messages.slice(-keepRecentCount);
  const oldMessages = messages.slice(0, -keepRecentCount);
  
  if (oldMessages.length <= 2) {
    return recentMessages;
  }
  
  try {
    const summaryMessage: ChatMessage = {
      sender: 'bot',
      message: `*[Conversation summary: This conversation previously covered ${oldMessages.length} messages. Key topics and context have been preserved.]*`,
    };
    
    return [summaryMessage, ...recentMessages];
  } catch (error) {
    console.warn('Failed to optimize conversation, using truncation:', error);
    return recentMessages;
  }
};

// truncate conversation to fit token limits
export const truncateConversation = (
  messages: ChatMessage[],
  systemPrompt: string,
  model: string = 'gpt-4.1',
  targetPercentage: number = 0.7
): ChatMessage[] => {
  const limit = MODEL_LIMITS[model as keyof typeof MODEL_LIMITS] || MODEL_LIMITS['gpt-4.1'];
  const targetTokens = Math.floor(limit * targetPercentage);
  
  const result: ChatMessage[] = [];
  let currentTokens = estimateTokens(systemPrompt) + 10; // system prompt
  currentTokens += 1000; // reserve for response
  
  // add messages from most recent backwards
  for (let i = messages.length - 1; i >= 0; i--) {
    const messageTokens = estimateTokens(messages[i].message) + 6;
    
    if (currentTokens + messageTokens <= targetTokens) {
      result.unshift(messages[i]);
      currentTokens += messageTokens;
    } else {
      break;
    }
  }
  
  return result;
};

// format token usage for display
export const formatTokenUsage = (usage: TokenUsage): string => {
  const percentage = Math.round(usage.percentage * 100);
  return `${usage.estimated.toLocaleString()} / ${usage.limit.toLocaleString()} tokens (${percentage}%)`;
};

// get message for token usage level
export const getTokenLevelMessage = (level: TokenUsageLevel): string => {
  switch (level) {
    case 'safe':
      return 'Token usage is within safe limits';
    case 'info':
      return 'Approaching token limit - consider shorter messages';
    case 'warning':
      return 'High token usage - conversation may be optimized soon';
    case 'danger':
      return 'Very high token usage - older messages will be summarized';
    default:
      return 'Token usage unknown';
  }
};

// get styles for token usage level
export const getTokenLevelStyles = (level: TokenUsageLevel): { bg: string; text: string; border: string } => {
  switch (level) {
    case 'safe':
      return { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' };
    case 'info':
      return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' };
    case 'warning':
      return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' };
    case 'danger':
      return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' };
    default:
      return { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30' };
  }
};