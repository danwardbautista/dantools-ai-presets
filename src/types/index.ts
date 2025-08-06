export interface ChatMessage {
  sender: "user" | "bot";
  message: string;
}

export interface PresetConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  systemPrompt: string;
  theme: {
    primary: string;
    secondary: string;
    accent: string;
    gradient: string;
  };
  isCustom?: boolean;
}

export interface SavedConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: number;
}

export type ScannerType = string;