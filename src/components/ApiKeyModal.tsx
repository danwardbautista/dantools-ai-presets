import React, { useState, useRef, useEffect } from 'react';
import { FaKey, FaEye, FaEyeSlash, FaCheck, FaTimes, FaSpinner } from 'react-icons/fa';
import { apiKeyManager } from '../utils/apiKeyManager';
import { validateApiKey } from '../utils/openai';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSave: (apiKey: string) => void;
  onSkip?: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSave, onSkip }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [sessionOnly, setSessionOnly] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (apiKey.length === 0) {
      setIsValid(null);
      setErrorMessage('');
    } else if (apiKeyManager.isValidApiKey(apiKey)) {
      setIsValid(true);
      setErrorMessage('');
    } else {
      setIsValid(false);
      setErrorMessage('');
    }
  }, [apiKey]);

  const handleSave = async () => {
    if (!apiKey.trim() || !isValid || isValidating) return;
    
    setIsValidating(true);
    
    try {
      const isApiKeyValid = await validateApiKey(apiKey.trim());
      
      if (isApiKeyValid) {
        apiKeyManager.setApiKey(apiKey.trim(), sessionOnly);
        onSave(apiKey.trim());
        setApiKey('');
      } else {
        setIsValid(false);
        setErrorMessage('Invalid API key. Please check your key and try again.');
      }
    } catch (error) {
      console.error('API key validation failed:', error);
      setIsValid(false);
      setErrorMessage('Failed to validate API key. Please check your connection and try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && apiKey.trim() && isValid && !isValidating) {
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-[#112f5e] border-2 border-[#FCF8DD]/30 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-[#FCF8DD] to-[#FCF8DD]/80 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaKey className="text-2xl text-[#112f5e]" />
          </div>
          <h2 className="text-2xl font-bold text-[#FCF8DD] mb-2">API Key Required</h2>
          <p className="text-[#FCF8DD]/70 leading-relaxed">
            To use this app, please enter your OpenAI API key. Your key is stored locally and never shared.
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-[#FCF8DD]/90 mb-2">
            OpenAI API Key
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="sk-..."
              className="w-full bg-[#0d2549] border border-[#FCF8DD]/30 rounded-lg px-4 py-3 pr-20 text-[#FCF8DD] placeholder-[#FCF8DD]/50 focus:ring-2 focus:ring-[#FCF8DD]/40 focus:border-[#FCF8DD]/60 outline-none transition-all"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {isValidating ? (
                <div className="w-5 h-5 flex items-center justify-center text-blue-400">
                  <FaSpinner className="text-xs animate-spin" />
                </div>
              ) : isValid !== null && (
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  isValid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {isValid ? <FaCheck className="text-xs" /> : <FaTimes className="text-xs" />}
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="w-8 h-8 flex items-center justify-center text-[#FCF8DD]/60 hover:text-[#FCF8DD] transition-colors"
              >
                {showKey ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
              </button>
            </div>
          </div>
          <p className="text-xs text-[#FCF8DD]/60 mt-2">
            Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-[#FCF8DD] hover:underline">OpenAI's platform</a>
          </p>
          
          {errorMessage && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{errorMessage}</p>
            </div>
          )}
          
          <div className="mt-3">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="session-only"
                checked={sessionOnly}
                onChange={(e) => setSessionOnly(e.target.checked)}
                className="w-4 h-4 text-[#FCF8DD] bg-[#0d2549] border-[#FCF8DD]/30 rounded focus:ring-[#FCF8DD]/40 focus:ring-2 mt-0.5"
              />
              <div>
                <label htmlFor="session-only" className="text-xs text-[#FCF8DD]/80 font-medium cursor-pointer">
                  Store in memory only (more secure)
                </label>
                <div className="text-xs text-[#FCF8DD]/60 mt-0.5 leading-relaxed">
                  {sessionOnly ? (
                    <span>✓ Key stored in memory only - cleared on page refresh</span>
                  ) : (
                    <span>Key saved permanently - persists until manually cleared</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {onSkip && (
            <button
              onClick={onSkip}
              className="flex-1 bg-[#FCF8DD]/10 text-[#FCF8DD]/80 border border-[#FCF8DD]/30 rounded-lg py-3 hover:bg-[#FCF8DD]/20 hover:text-[#FCF8DD] transition-all font-medium"
            >
              Skip for now
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!apiKey.trim() || !isValid || isValidating}
            className={`flex-1 rounded-lg py-3 font-semibold transition-all flex items-center justify-center gap-2 ${
              apiKey.trim() && isValid && !isValidating
                ? 'bg-gradient-to-r from-[#FCF8DD] to-[#FCF8DD]/90 text-[#112f5e] hover:from-[#FCF8DD]/95 hover:to-[#FCF8DD]/85'
                : 'bg-[#FCF8DD]/20 text-[#FCF8DD]/40 cursor-not-allowed'
            }`}
          >
            {isValidating && <FaSpinner className="animate-spin" />}
            {isValidating ? 'Validating...' : 'Save & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;