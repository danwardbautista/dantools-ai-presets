import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export const sanitizeInput = (text: string): string => {
  const div = document.createElement("div");
  div.innerText = text;
  return div.innerText;
};