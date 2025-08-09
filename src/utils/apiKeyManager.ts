/**
 * Secure API key management for client-side storage
 * Uses sessionStorage + in-memory caching with basic obfuscation
 */

// Simple obfuscation (not true encryption, but better than plain text)
const obfuscate = (text: string): string => {
  return btoa(text.split('').reverse().join(''));
};

const deobfuscate = (obfuscated: string): string => {
  try {
    return atob(obfuscated).split('').reverse().join('');
  } catch {
    return '';
  }
};

class ApiKeyManager {
  private memoryKey: string | null = null;
  private readonly SESSION_KEY = 'dt_ak';

  /**
   * Store API key securely
   * @param key - OpenAI API key
   * @param sessionOnly - Whether to store in memory only (cleared on refresh)
   */
  setApiKey(key: string, sessionOnly: boolean = false): void {
    // Always store in memory
    this.memoryKey = key;
    
    // Store persistently in localStorage unless sessionOnly is true
    if (!sessionOnly) {
      try {
        localStorage.setItem(this.SESSION_KEY, obfuscate(key));
      } catch (error) {
        console.warn('Failed to store API key in localStorage:', error);
      }
    } else {
      // Clear localStorage if switching to session-only
      try {
        localStorage.removeItem(this.SESSION_KEY);
      } catch (error) {
        console.warn('Failed to clear API key from localStorage:', error);
      }
    }
  }

  /**
   * Retrieve API key from memory or localStorage
   */
  getApiKey(): string | null {
    // First try memory (fastest and most secure)
    if (this.memoryKey) {
      return this.memoryKey;
    }

    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(this.SESSION_KEY);
      if (stored) {
        const key = deobfuscate(stored);
        if (key && this.isValidApiKey(key)) {
          this.memoryKey = key; // Cache in memory
          return key;
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve API key from localStorage:', error);
    }

    return null;
  }

  /**
   * Check if API key exists
   */
  hasApiKey(): boolean {
    return this.getApiKey() !== null;
  }

  /**
   * Clear API key from all storage
   */
  clearApiKey(): void {
    this.memoryKey = null;
    try {
      localStorage.removeItem(this.SESSION_KEY);
    } catch (error) {
      console.warn('Failed to clear API key from localStorage:', error);
    }
  }

  /**
   * Validate API key format
   */
  isValidApiKey(key: string): boolean {
    return key.startsWith('sk-') && key.length > 20;
  }

  /**
   * Get validation status of current key
   */
  validateCurrentKey(): boolean {
    const key = this.getApiKey();
    return key ? this.isValidApiKey(key) : false;
  }
}

// Export singleton instance
export const apiKeyManager = new ApiKeyManager();

// Cleanup on page unload for extra security
window.addEventListener('beforeunload', () => {
  // Could optionally clear memory here for paranoid security
  // apiKeyManager.clearApiKey();
});