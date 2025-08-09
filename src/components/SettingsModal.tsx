import React, { useState, useEffect } from 'react';
import { FaKey, FaTrash, FaEye, FaEyeSlash, FaCheck, FaTimes, FaSpinner } from 'react-icons/fa';
import { apiKeyManager } from '../utils/apiKeyManager';
import { validateApiKey } from '../utils/openai';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [currentApiKey, setCurrentApiKey] = useState<string>('');
  const [newApiKey, setNewApiKey] = useState<string>('');
  const [showCurrentKey, setShowCurrentKey] = useState(false);
  const [showNewKey, setShowNewKey] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [sessionOnly, setSessionOnly] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      // Load current API key (masked)
      const key = apiKeyManager.getApiKey();
      if (key) {
        setCurrentApiKey(key.substring(0, 7) + '...' + key.substring(key.length - 4));
      } else {
        setCurrentApiKey('');
      }
      // Reset form
      setNewApiKey('');
      setErrorMessage('');
      setSuccessMessage('');
      setIsValid(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (newApiKey.length === 0) {
      setIsValid(null);
      setErrorMessage('');
    } else if (apiKeyManager.isValidApiKey(newApiKey)) {
      setIsValid(true);
      setErrorMessage('');
    } else {
      setIsValid(false);
      setErrorMessage('');
    }
  }, [newApiKey]);

  const handleUpdateApiKey = async () => {
    if (!newApiKey.trim() || !isValid || isValidating) return;
    
    setIsValidating(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const isApiKeyValid = await validateApiKey(newApiKey.trim());
      
      if (isApiKeyValid) {
        apiKeyManager.setApiKey(newApiKey.trim(), sessionOnly);
        setSuccessMessage('API key updated successfully!');
        setNewApiKey('');
        // Update displayed current key
        const key = newApiKey.trim();
        setCurrentApiKey(key.substring(0, 7) + '...' + key.substring(key.length - 4));
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
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

  const handleClearApiKey = () => {
    if (confirm('Are you sure you want to clear your API key? You will need to enter it again to use the app.')) {
      apiKeyManager.clearApiKey();
      setCurrentApiKey('');
      setSuccessMessage('API key cleared successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newApiKey.trim() && isValid && !isValidating) {
      handleUpdateApiKey();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-[#112f5e] border-2 border-[#FCF8DD]/30 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between p-6 border-b border-[#FCF8DD]/20">
          <h2 className="text-2xl font-bold text-[#FCF8DD]">Settings</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[#FCF8DD]/60 hover:text-[#FCF8DD] hover:bg-[#FCF8DD]/10 rounded-lg transition-all"
          >
            <FaTimes className="text-sm" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* current api key section */}
          <div>
            <h3 className="text-lg font-semibold text-[#FCF8DD] mb-3 flex items-center gap-2">
              <FaKey className="text-[#FCF8DD]/80" />
              Current API Key
            </h3>
            
            {currentApiKey ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-[#0d2549] border border-[#FCF8DD]/30 rounded-lg px-4 py-3 font-mono text-[#FCF8DD] text-sm break-all overflow-hidden">
                    {showCurrentKey ? apiKeyManager.getApiKey() || 'No key found' : currentApiKey}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCurrentKey(!showCurrentKey)}
                    className="bg-[#FCF8DD]/10 text-[#FCF8DD]/80 border border-[#FCF8DD]/30 rounded-lg px-3 py-3 hover:bg-[#FCF8DD]/20 hover:text-[#FCF8DD] transition-all"
                  >
                    {showCurrentKey ? <FaEyeSlash /> : <FaEye />}
                  </button>
                  <button
                    onClick={handleClearApiKey}
                    className="bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg px-3 py-3 hover:bg-red-500/20 hover:text-red-300 transition-all"
                  >
                    <FaTrash />
                  </button>
                </div>
                <p className="text-xs text-[#FCF8DD]/60">
                  Your API key is securely stored and used for all OpenAI requests.
                </p>
              </div>
            ) : (
              <div className="text-center py-6 bg-[#0d2549]/50 rounded-lg border border-[#FCF8DD]/10">
                <FaKey className="text-3xl text-[#FCF8DD]/40 mx-auto mb-2" />
                <p className="text-[#FCF8DD]/60 text-sm mb-1">No API key configured</p>
                <p className="text-xs text-[#FCF8DD]/50">Add an API key below to start using the application</p>
              </div>
            )}
          </div>

          {/* update api key section */}
          <div>
            <h3 className="text-lg font-semibold text-[#FCF8DD] mb-3">
              {currentApiKey ? 'Update API Key' : 'Add API Key'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#FCF8DD]/90 mb-2">
                  OpenAI API Key
                </label>
                <div className="relative">
                  <input
                    type={showNewKey ? 'text' : 'password'}
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
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
                      onClick={() => setShowNewKey(!showNewKey)}
                      className="w-8 h-8 flex items-center justify-center text-[#FCF8DD]/60 hover:text-[#FCF8DD] transition-colors"
                    >
                      {showNewKey ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[#FCF8DD]/60 mt-2">
                  Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-[#FCF8DD] hover:underline">OpenAI's platform</a>
                </p>
              </div>

              {/* error/success messages */}
              {errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">{errorMessage}</p>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-sm text-green-400">{successMessage}</p>
                </div>
              )}

              {/* storage options */}
              <div className="p-4 bg-[#0d2549]/50 rounded-lg border border-[#FCF8DD]/10">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="session-only-settings"
                    checked={sessionOnly}
                    onChange={(e) => setSessionOnly(e.target.checked)}
                    className="w-4 h-4 text-[#FCF8DD] bg-[#0d2549] border-[#FCF8DD]/30 rounded focus:ring-[#FCF8DD]/40 focus:ring-2 mt-0.5"
                  />
                  <div>
                    <label htmlFor="session-only-settings" className="text-sm text-[#FCF8DD]/90 font-medium cursor-pointer">
                      Store in memory only (more secure)
                    </label>
                    <div className="text-xs text-[#FCF8DD]/60 mt-1 leading-relaxed">
                      {sessionOnly ? (
                        <span>✓ Key stored in memory only - cleared on page refresh</span>
                      ) : (
                        <span>Key saved permanently - persists until manually cleared</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* update button */}
              <button
                onClick={handleUpdateApiKey}
                disabled={!newApiKey.trim() || !isValid || isValidating}
                className={`w-full rounded-lg py-3 font-semibold transition-all flex items-center justify-center gap-2 ${
                  newApiKey.trim() && isValid && !isValidating
                    ? 'bg-gradient-to-r from-[#FCF8DD] to-[#FCF8DD]/90 text-[#112f5e] hover:from-[#FCF8DD]/95 hover:to-[#FCF8DD]/85'
                    : 'bg-[#FCF8DD]/20 text-[#FCF8DD]/40 cursor-not-allowed'
                }`}
              >
                {isValidating && <FaSpinner className="animate-spin" />}
                {isValidating ? 'Validating...' : (currentApiKey ? 'Update API Key' : 'Save API Key')}
              </button>
            </div>
          </div>

          {/* footer */}
          <div className="pt-4 border-t border-[#FCF8DD]/20 text-center">
            <div className="text-[#FCF8DD]/60 text-sm">
              <p className="mb-1">
                Made by: <a 
                  href="http://danwardbautista.com/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[#FCF8DD] hover:text-[#FCF8DD]/80 hover:underline transition-colors"
                >
                  Danward Bautista
                </a>
              </p>
              <p className="text-xs">Your API key is stored locally and never shared with third parties.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;