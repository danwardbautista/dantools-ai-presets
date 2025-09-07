/**
 * Memory management utilities for better performance
 */

import { ChatMessage } from '../types';

// cleanup utility for React components
export class ComponentMemoryManager {
  private cleanupFunctions: (() => void)[] = [];
  private timeouts: Set<number> = new Set();
  private intervals: Set<number> = new Set();
  private abortControllers: Set<AbortController> = new Set();

  // register cleanup functions
  addCleanup(cleanup: () => void) {
    this.cleanupFunctions.push(cleanup);
  }

  // track timeouts for automatic cleanup
  addTimeout(id: number) {
    this.timeouts.add(id);
    return id;
  }

  // track intervals for automatic cleanup
  addInterval(id: number) {
    this.intervals.add(id);
    return id;
  }

  // track abort controllers
  addAbortController(controller: AbortController) {
    this.abortControllers.add(controller);
  }

  // clean up all resources
  cleanup() {
    // clear all timeouts
    this.timeouts.forEach(id => clearTimeout(id));
    this.timeouts.clear();

    // clear all intervals
    this.intervals.forEach(id => clearInterval(id));
    this.intervals.clear();

    // abort all controllers
    this.abortControllers.forEach(controller => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    });
    this.abortControllers.clear();

    // run custom cleanup functions
    this.cleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.warn('Cleanup function failed:', error);
      }
    });
    this.cleanupFunctions.length = 0;
  }
}

// memory-efficient message storage
export const optimizeMessageStorage = (messages: ChatMessage[], maxMessages: number = 100): ChatMessage[] => {
  if (messages.length <= maxMessages) {
    return messages;
  }

  // keep recent messages and some context
  const recentMessages = messages.slice(-maxMessages);
  
  // if we truncated, add a system message to indicate this
  if (messages.length > maxMessages) {
    return [
      {
        sender: 'bot' as const,
        message: `*[Conversation history optimized - ${messages.length - maxMessages} older messages removed for performance]*`
      },
      ...recentMessages
    ];
  }

  return recentMessages;
};

// debounced function with automatic cleanup
export const createDebouncer = (manager: ComponentMemoryManager, delay: number = 300) => {
  let timeoutId: number | null = null;

  return <T extends unknown[]>(callback: (...args: T) => void) => {
    return (...args: T) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        callback(...args);
        timeoutId = null;
      }, delay);

      manager.addTimeout(timeoutId);
    };
  };
};

// memory-efficient local storage with size limits
export const optimizedLocalStorage = {
  setItem: (key: string, value: unknown, maxSizeKB: number = 1024) => {
    try {
      const serialized = JSON.stringify(value);
      const sizeKB = new Blob([serialized]).size / 1024;
      
      if (sizeKB > maxSizeKB) {
        console.warn(`Data too large for key ${key}: ${sizeKB}KB > ${maxSizeKB}KB limit`);
        
        // if it's an array, try to truncate it
        if (Array.isArray(value)) {
          const truncated = value.slice(-Math.floor(value.length / 2));
          const truncatedSerialized = JSON.stringify(truncated);
          localStorage.setItem(key, truncatedSerialized);
          console.info(`Truncated data for key ${key} to fit storage limits`);
          return;
        }
      }
      
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error(`Failed to save to localStorage for key ${key}:`, error);
      
      // try to free up space by removing old items
      const oldKeys = Object.keys(localStorage).filter(k => k.startsWith('dantools-conversations-'));
      oldKeys.slice(0, Math.floor(oldKeys.length / 2)).forEach(k => {
        localStorage.removeItem(k);
      });
      
      // retry once
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (retryError) {
        console.error(`Failed to save after cleanup for key ${key}:`, retryError);
      }
    }
  },

  getItem: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Failed to load from localStorage for key ${key}:`, error);
      return defaultValue;
    }
  },

  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove from localStorage for key ${key}:`, error);
    }
  }
};

// global memory monitoring (development only)
export const memoryMonitor = {
  startMonitoring: () => {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'development') return;
    
    const monitor = () => {
      if ('memory' in performance) {
        const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
        if (memory && typeof window !== 'undefined') {
          // memory monitoring available only in development with full browser context
          const used = Math.round(memory.usedJSHeapSize / 1024 / 1024);
          const total = Math.round(memory.totalJSHeapSize / 1024 / 1024);
          const limit = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
          // store memory info for development debugging without console logging
          if (typeof window !== 'undefined') {
            (window as typeof window & { __memoryStats?: { used: number; total: number; limit: number } }).__memoryStats = { used, total, limit };
          }
        }
      }
    };

    const intervalId = setInterval(monitor, 30000); // monitor every 30s
    return () => clearInterval(intervalId);
  }
};