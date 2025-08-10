/**
 * Utility functions for localStorage operations
 */

export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const saveToStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to save to localStorage: ${key}`, error);
  }
};

export const removeFromStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to remove from localStorage: ${key}`, error);
  }
};


export const saveToStorageWithEvent = <T>(key: string, value: T, eventName: string): void => {
  saveToStorage(key, value);
  window.dispatchEvent(new CustomEvent(eventName, { detail: value }));
};