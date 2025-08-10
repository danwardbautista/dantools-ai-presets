/**
 * Validation utility functions
 */

export const isFormValid = (title: string, systemPrompt: string): boolean => {
  return title.trim().length > 0 && systemPrompt.trim().length > 0;
};