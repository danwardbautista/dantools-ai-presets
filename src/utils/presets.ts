import { PresetConfig } from '../types';

export const defaultPresets: PresetConfig[] = [
  {
    id: 'carph-ai',
    title: "CarPH AI",
    subtitle: "Precise and honest answers about the Philippines car market",
    icon: 'shield',
    theme: {
      primary: "#EF4444",
      secondary: "#F87171",
      accent: "#FEE2E2",
      gradient: "linear-gradient(135deg, #EF4444 0%, #F87171 100%)"
    },
    systemPrompt: `You are a car expert focused on the philippines market. give precise and honest answers about:

    • Car prices and market values in the philippines
    • Best car models for filipino buyers
    • Maintenance costs and parts availability
    • Dealer recommendations and reviews
    • Financing options and insurance
    • Used vs new car advice
    • Traffic and road conditions considerations
    • Do not bombard with technical jargon, keep it simple and practical
    • Do not bombard with too many advice, focus on the most relevant points

    Be direct and honest about pros/cons. consider filipino budget, road conditions, and local market reality.`,
    isCustom: false
  },
  {
    id: 'laravel-architect',
    title: "Laravel Architect",
    subtitle: "Proper Laravel architecture based on your user base and requirements",
    icon: 'code',
    theme: {
      primary: "#3B82F6",
      secondary: "#60A5FA",
      accent: "#DBEAFE",
      gradient: "linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)"
    },
    systemPrompt: `You are a laravel architecture expert. recommend proper laravel setups based on user requirements:

    • For large databases: laravel octane + postgresql + redis
    • For high traffic: load balancers, caching strategies, queue systems
    • For small projects: basic laravel + mysql + simple hosting
    • For apis: laravel sanctum/passport, rate limiting, proper responses
    • For real-time: laravel echo, websockets, broadcasting
    • For scaling: microservices, event sourcing, cqrs patterns

    Ask about user base size, traffic expectations, budget, and requirements. Then give specific laravel architecture recommendations with reasoning.`,
    isCustom: false
  }
];

export const themePresets = [
  { name: 'Blue', primary: '#3B82F6', secondary: '#60A5FA', accent: '#DBEAFE', gradient: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)' },
  { name: 'Green', primary: '#10B981', secondary: '#34D399', accent: '#D1FAE5', gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)' },
  { name: 'Purple', primary: '#8B5CF6', secondary: '#A78BFA', accent: '#EDE9FE', gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)' },
  { name: 'Red', primary: '#EF4444', secondary: '#F87171', accent: '#FEE2E2', gradient: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)' },
  { name: 'Yellow', primary: '#F59E0B', secondary: '#FBBF24', accent: '#FEF3C7', gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)' },
  { name: 'Indigo', primary: '#6366F1', secondary: '#818CF8', accent: '#E0E7FF', gradient: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)' },
];

export const findPresetById = (presets: PresetConfig[], id: string): PresetConfig | undefined => {
  return presets.find(preset => preset.id === id);
};

export const getPresetTheme = (presets: PresetConfig[], scannerType: string) => {
  const preset = findPresetById(presets, scannerType);
  return preset ? preset.theme : themePresets[0];
};