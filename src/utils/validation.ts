/**
 * Validation utility functions
 */

export const validateRequired = (value: string): boolean => {
  return value.trim().length > 0;
};

export const validateMaxLength = (value: string, maxLength: number): boolean => {
  return value.length <= maxLength;
};

export const validateMinLength = (value: string, minLength: number): boolean => {
  return value.trim().length >= minLength;
};

export const validatePresetForm = (title: string, systemPrompt: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!validateRequired(title)) {
    errors.push('Title is required');
  }
  
  if (!validateRequired(systemPrompt)) {
    errors.push('System prompt is required');
  }
  
  if (!validateMaxLength(title, 100)) {
    errors.push('Title must be less than 100 characters');
  }
  
  if (!validateMinLength(systemPrompt, 10)) {
    errors.push('System prompt must be at least 10 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const isFormValid = (title: string, systemPrompt: string): boolean => {
  return validateRequired(title) && validateRequired(systemPrompt);
};