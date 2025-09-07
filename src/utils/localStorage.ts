/**
 * utility functions for localStorage operations with memory optimization
 */

import { optimizedLocalStorage } from './memoryManager';

export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  return optimizedLocalStorage.getItem(key, defaultValue);
};

export const saveToStorage = <T>(key: string, value: T): void => {
  // set a reasonable size limit for conversation data
  const sizeLimit = key.includes('conversations') ? 2048 : 1024; // 2MB for conversations, 1MB for others
  optimizedLocalStorage.setItem(key, value, sizeLimit);
};

export const removeFromStorage = (key: string): void => {
  optimizedLocalStorage.removeItem(key);
};


export const saveToStorageWithEvent = <T>(key: string, value: T, eventName: string): void => {
  saveToStorage(key, value);
  window.dispatchEvent(new CustomEvent(eventName, { detail: value }));
};