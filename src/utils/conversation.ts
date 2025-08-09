import { ChatMessage, SavedConversation } from '../types';
import { getOpenAIClient } from './openai';

// conversation helpers

// generates a short title for the conversation using openai
export const makeConversationTitle = async (messages: ChatMessage[], scannerTitle?: string): Promise<string> => {
  const firstUserMessage = messages.find(msg => msg.sender === "user");
  if (!firstUserMessage) return "New Conversation";
  
  try {
    const prompt = `Generate a short, concise title (max 4 words) for this conversation based on the user's first message and the AI assistant type.

      User's first message: "${firstUserMessage.message}"
      AI Assistant type: "${scannerTitle || "AI Assistant"}"

      The title should be specific to what the user is asking about, not generic. Focus on the main topic or task.
      Examples:
      - "Fix React Hook Bug"
      - "Python Data Analysis" 
      - "API Security Review"
      - "CSS Grid Layout"
      - "Database Schema Design"

      Return only the title, nothing else.`;

    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        { role: "system", content: "You are a helpful assistant that generates concise conversation titles." },
        { role: "user", content: prompt }
      ],
      max_tokens: 20,
      temperature: 0.7,
    });

    const title = response.choices[0]?.message?.content?.trim();
    if (title && title.length > 0 && title.length <= 50) {
      return title.replace(/^["']|["']$/g, '');
    }
  } catch (error) {
    console.warn('failed to make title, using fallback:', error);
  }
  
  // use scanner name if available
  if (scannerTitle) {
    return `${scannerTitle} Chat`;
  }
  
  // just truncate the message
  const truncated = firstUserMessage.message.substring(0, 30);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 15 ? truncated.substring(0, lastSpace) + "..." : truncated + "...";
};

// adds a number suffix if title already exists
export const ensureUniqueTitle = (baseTitle: string, existingTitles: string[]): string => {
  let title = baseTitle;
  let counter = 1;
  
  while (existingTitles.includes(title)) {
    counter++;
    title = `${baseTitle} (${counter})`;
  }
  
  return title;
};

// finds saved conversation that matches current messages
export const findExistingConversation = (
  conversations: SavedConversation[], 
  messages: ChatMessage[]
): SavedConversation | undefined => {
  const firstUserMessage = messages.find(msg => msg.sender === "user");
  if (!firstUserMessage) return undefined;
  
  return conversations.find(conv => {
    const convFirstUser = conv.messages.find(msg => msg.sender === "user");
    return convFirstUser && convFirstUser.message === firstUserMessage.message;
  });
};

// creates a new conversation object with timestamp
export const makeConversation = (
  id: string,
  title: string,
  messages: ChatMessage[],
  timestamp?: number
): SavedConversation => ({
  id,
  title,
  messages: [...messages],
  timestamp: timestamp || Date.now()
});

// sorts conversations newest first
export const sortConversationsByTimestamp = (conversations: SavedConversation[]): SavedConversation[] => {
  return [...conversations].sort((a, b) => b.timestamp - a.timestamp);
};