import { useEffect, useRef, useCallback } from 'react';
import { ComponentMemoryManager, memoryMonitor } from '../utils/memoryManager';

/**
 * Hook for automatic memory management in React components
 */
export const useMemoryOptimization = () => {
  const managerRef = useRef<ComponentMemoryManager | null>(null);

  // initialize manager on first use
  if (!managerRef.current) {
    managerRef.current = new ComponentMemoryManager();
  }

  const manager = managerRef.current;

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (managerRef.current) {
        managerRef.current.cleanup();
        managerRef.current = null;
      }
    };
  }, []);

  // helper functions
  const addTimeout = useCallback((callback: () => void, delay: number) => {
    const id = window.setTimeout(callback, delay);
    manager.addTimeout(id);
    return id;
  }, [manager]);

  const addInterval = useCallback((callback: () => void, delay: number) => {
    const id = window.setInterval(callback, delay);
    manager.addInterval(id);
    return id;
  }, [manager]);

  const addCleanup = useCallback((cleanup: () => void) => {
    manager.addCleanup(cleanup);
  }, [manager]);

  const createAbortController = useCallback(() => {
    const controller = new AbortController();
    manager.addAbortController(controller);
    return controller;
  }, [manager]);

  return {
    addTimeout,
    addInterval,
    addCleanup,
    createAbortController,
    cleanup: () => manager.cleanup()
  };
};

/**
 * Hook for monitoring memory usage in development
 */
export const useMemoryMonitoring = () => {
  useEffect(() => {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      const stopMonitoring = memoryMonitor.startMonitoring();
      return stopMonitoring;
    }
  }, []);
};

/**
 * Hook for debounced functions with automatic cleanup
 */
export const useDebounce = <T extends unknown[]>(
  callback: (...args: T) => void,
  delay: number = 300
) => {
  const { addTimeout, addCleanup } = useMemoryOptimization();
  const timeoutRef = useRef<number | null>(null);

  const debouncedCallback = useCallback((...args: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = addTimeout(() => {
      callback(...args);
      timeoutRef.current = null;
    }, delay);
  }, [callback, delay, addTimeout]);

  // cleanup timeout when component unmounts
  addCleanup(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  });

  return debouncedCallback;
};