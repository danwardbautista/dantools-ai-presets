import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { FaCog, FaBars, FaChevronRight, FaPlus, FaStar } from 'react-icons/fa';
import CustomChat from './components/CustomChat';
import Presets from './pages/Presets';
import { ChatMessage, PresetConfig, SavedConversation, ScannerType } from './types';
import { defaultPresets, findPresetById } from './utils/presets';
import { makeConversationTitle, ensureUniqueTitle, findExistingConversation, makeConversation, sortConversationsByTimestamp } from './utils/conversation';
import { loadFromStorage, saveToStorage, removeFromStorage } from './utils/localStorage';

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentScannerType, setCurrentScannerType] = useState<ScannerType | null>(null);
  const [presets, setPresets] = useState<PresetConfig[]>(defaultPresets);
  
  // keep conversations separate per scanner type
  const [savedConversations, setSavedConversations] = useState<Record<ScannerType, SavedConversation[]>>({});
  const [isLoadingConversation, setIsLoadingConversation] = useState<Record<ScannerType, boolean>>({});
  const [currentMessages, setCurrentMessages] = useState<Record<ScannerType, ChatMessage[]>>({});
  
  const currentMessagesRef = useRef<Record<ScannerType, ChatMessage[]>>(currentMessages);
  const lastSavedMessageCountRef = useRef<Record<ScannerType, number>>({});

  // Load presets from localStorage on mount
  useEffect(() => {
    const savedPresets = loadFromStorage('dantools-presets', defaultPresets);
    setPresets(savedPresets);
  }, []);

  // watch for preset changes from the presets page
  useEffect(() => {
    const onPresetsUpdate = (event: CustomEvent) => {
      const updatedPresets = event.detail;
      setPresets(updatedPresets);
    };

    window.addEventListener('presetsUpdated', onPresetsUpdate as EventListener);
    return () => {
      window.removeEventListener('presetsUpdated', onPresetsUpdate as EventListener);
    };
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname]);

  // close mobile menu on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        closeMobileMenu();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const loadedConversations: Record<ScannerType, SavedConversation[]> = {};

    presets.forEach(preset => {
      loadedConversations[preset.id] = loadFromStorage(`dantools-conversations-${preset.id}`, []);
    });

    setSavedConversations(loadedConversations);
    
    // Initialize current messages and loading states for all presets
    const initialMessages: Record<ScannerType, ChatMessage[]> = {};
    const initialLoading: Record<ScannerType, boolean> = {};
    const initialCounts: Record<ScannerType, number> = {};
    
    presets.forEach(preset => {
      initialMessages[preset.id] = currentMessages[preset.id] || [];
      initialLoading[preset.id] = false;
      initialCounts[preset.id] = 0;
    });
    
    setCurrentMessages(prev => ({ ...prev, ...initialMessages }));
    setIsLoadingConversation(prev => ({ ...prev, ...initialLoading }));
    lastSavedMessageCountRef.current = { ...lastSavedMessageCountRef.current, ...initialCounts };
  }, [presets]);

  // saves conversation to localstorage with auto-generated title
  const saveConversation = useCallback(async (scannerType: ScannerType, messages: ChatMessage[], forceUpdate = false) => {
    if (messages.length <= 0) return;
    
    const firstUserMessage = messages.find(msg => msg.sender === "user");
    if (!firstUserMessage) return;
    
    const preset = findPresetById(presets, scannerType);
    const baseTitle = await makeConversationTitle(messages, preset?.title);
    
    setSavedConversations(prevAllConversations => {
      const prevConversations = prevAllConversations[scannerType] || [];
      const existingTitles = prevConversations.map(conv => conv.title);
      const title = ensureUniqueTitle(baseTitle, existingTitles);
      
      const existingConv = findExistingConversation(prevConversations, messages);
      
      const conversation = makeConversation(
        existingConv ? existingConv.id : Date.now().toString(),
        existingConv ? existingConv.title : title,
        messages,
        (!existingConv || forceUpdate) ? Date.now() : existingConv.timestamp
      );
      
      const filteredConversations = prevConversations.filter(conv => conv.id !== conversation.id);
      const updated = (!existingConv || forceUpdate) 
        ? [conversation, ...filteredConversations].slice(0, 10)
        : sortConversationsByTimestamp([...filteredConversations, conversation]).slice(0, 10);
      
      saveToStorage(`dantools-conversations-${scannerType}`, updated);
      lastSavedMessageCountRef.current[scannerType] = messages.length;
      
      return {
        ...prevAllConversations,
        [scannerType]: updated
      };
    });
  }, [presets]);

  // sync current messages ref
  useEffect(() => {
    currentMessagesRef.current = currentMessages;
  }, [currentMessages]);

  // auto save conversations with delay
  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    presets.forEach(preset => {
      const scannerType = preset.id;
      const messages = currentMessages[scannerType];
      const loading = isLoadingConversation[scannerType];
      
      // skip saving while loading
      if (loading) return;
      
      const timeoutId = setTimeout(async () => {
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          // only save if new content exists
          const hasNewContent = messages.length > lastSavedMessageCountRef.current[scannerType];
          
          // save when bot replies or user has multiple messages
          if (lastMessage.sender === "bot" || 
              (messages.filter(msg => msg.sender === "user").length > 1)) {
            await saveConversation(scannerType, messages, hasNewContent);
          }
        }
      }, 1000);

      timeouts.push(timeoutId);
    });

    return () => timeouts.forEach(timeout => clearTimeout(timeout));
  }, [currentMessages, isLoadingConversation, saveConversation, presets]);

  // save conversations when user leaves
  useEffect(() => {
    const onBeforeUnload = () => {
      Object.entries(currentMessagesRef.current).forEach(([scannerType, messages]) => {
        if (messages.length > 0) {
          // beforeunload cant use async but try to save anyway
          saveConversation(scannerType as ScannerType, messages).catch(console.error);
        }
      });
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      // save when component unmounts
      Object.entries(currentMessagesRef.current).forEach(([scannerType, messages]) => {
        if (messages.length > 0) {
          saveConversation(scannerType as ScannerType, messages).catch(console.error);
        }
      });
    };
  }, [saveConversation]);

  const saveCurrentConversation = async (scannerType: ScannerType) => {
    await saveConversation(scannerType, currentMessages[scannerType]);
  };

  // loads a saved conversation into the current chat
  const loadConversation = (scannerType: ScannerType, conversation: SavedConversation) => {
    setIsLoadingConversation(prev => ({ ...prev, [scannerType]: true }));
    setCurrentMessages(prev => ({ ...prev, [scannerType]: conversation.messages }));
    setCurrentScannerType(scannerType);
    navigate('/'); // Navigate to home route to show the conversation
    closeMobileMenu();
    // track saved message count
    lastSavedMessageCountRef.current[scannerType] = conversation.messages.length;
    // clear loading after delay
    setTimeout(() => setIsLoadingConversation(prev => ({ ...prev, [scannerType]: false })), 100);
  };

  const clearHistory = (scannerType: ScannerType) => {
    setSavedConversations(prev => ({ ...prev, [scannerType]: [] }));
    removeFromStorage(`dantools-conversations-${scannerType}`);
  };

  // starts fresh conversation for selected preset
  const startNewConversation = async (scannerType: ScannerType) => {
    if (currentScannerType && currentMessages[currentScannerType].length > 0) {
      await saveCurrentConversation(currentScannerType);
    }
    setIsLoadingConversation(prev => ({ ...prev, [scannerType]: true }));
    
    setCurrentMessages(prev => ({ ...prev, [scannerType]: [] }));
    setCurrentScannerType(scannerType);
    navigate('/');
    closeMobileMenu();
    // reset message count for new convo
    lastSavedMessageCountRef.current[scannerType] = 0;
    // clear loading
    setTimeout(() => setIsLoadingConversation(prev => ({ ...prev, [scannerType]: false })), 100);
  };

  const selectPreset = (presetId: string) => {
    startNewConversation(presetId);
  };

  const showPresetSelectionScreen = () => {
    setCurrentScannerType(null);
    navigate('/');
    closeMobileMenu();
  };

  // gets display title for current conversation
  const getCurrentConversationTitle = (scannerType: ScannerType, messages: ChatMessage[]): string => {
    const preset = findPresetById(presets, scannerType);
    const defaultTitle = preset?.title || "Chat Assistant";
    
    if (messages.length === 0) {
      return defaultTitle;
    }

    const firstUserMessage = messages.find(msg => msg.sender === "user");
    if (!firstUserMessage) {
      return defaultTitle;
    }

    // Find if there's a saved conversation that matches the current messages
    const savedConv = savedConversations[scannerType]?.find(conv => {
      const convFirstUser = conv.messages.find(msg => msg.sender === "user");
      return convFirstUser && convFirstUser.message === firstUserMessage.message;
    });

    return savedConv?.title || defaultTitle;
  };

  // combines all conversations from different presets for sidebar
  const getAllConversations = (): Array<SavedConversation & { scannerType: ScannerType }> => {
    const allConversations: Array<SavedConversation & { scannerType: ScannerType }> = [];
    
    Object.entries(savedConversations).forEach(([type, conversations]) => {
      if (conversations) {
        conversations.forEach(conv => {
          allConversations.push({ ...conv, scannerType: type as ScannerType });
        });
      }
    });
    
    return allConversations.sort((a, b) => b.timestamp - a.timestamp);
  };

  // checks if conversation is currently being viewed
  const isConversationActive = (conversation: SavedConversation & { scannerType: ScannerType }): boolean => {
    // Check if we're on the home route and have the right scanner type
    if (location.pathname !== '/' || !currentScannerType) {
      return false;
    }
    
    // Check if this conversation's scanner type matches the current one
    if (conversation.scannerType !== currentScannerType) {
      return false;
    }
    
    // Check if the current messages match this conversation's first user message
    const currentConversationMessages = currentMessages[currentScannerType];
    if (currentConversationMessages.length === 0) {
      return false;
    }
    
    const currentFirstUserMessage = currentConversationMessages.find(msg => msg.sender === "user");
    const conversationFirstUserMessage = conversation.messages.find(msg => msg.sender === "user");
    
    return !!(currentFirstUserMessage && conversationFirstUserMessage && 
           currentFirstUserMessage.message === conversationFirstUserMessage.message);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#FCF8DD]">
        {/* Mobile backdrop */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden" 
            onClick={closeMobileMenu}
          />
        )}
        
        {/* Sidebar */}
        <div className={`
          ${isCollapsed ? 'md:w-20 w-72' : 'w-72'} 
          fixed left-0 top-0 h-full bg-[#112f5e] border-r border-[#FCF8DD]/20 shadow-xl z-50 transition-all duration-300 ease-in-out flex flex-col
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="flex items-center justify-between p-5 border-b border-[#FCF8DD]/20 min-h-[80px]">
            <div className="flex items-center gap-3 transition-all duration-300">
              <div className="w-10 h-10 bg-gradient-to-br from-[#FCF8DD] to-[#FCF8DD]/90 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                <span className="text-[#112f5e] font-bold text-lg">DT</span>
              </div>
              <h1 className={`text-[#FCF8DD] text-xl font-semibold block ${isCollapsed ? 'md:hidden' : 'md:block'}`}>DanTools</h1>
            </div>
            {/* Desktop toggle button */}
            <button 
              className="hidden md:flex bg-[#FCF8DD]/10 text-[#FCF8DD]/80 border border-[#FCF8DD]/20 rounded-lg p-2 hover:bg-[#FCF8DD]/20 hover:text-[#FCF8DD] hover:scale-105 transition-all duration-300 w-9 h-9 items-center justify-center"
              onClick={toggleSidebar}
            >
              {isCollapsed ? <FaBars className="text-sm" /> : <FaChevronRight className={`text-sm transition-transform duration-300 ${!isCollapsed ? 'rotate-180' : ''}`} />}
            </button>
            
            {/* Mobile close button */}
            <button 
              className="md:hidden bg-[#FCF8DD]/10 text-[#FCF8DD]/80 border border-[#FCF8DD]/20 rounded-lg p-2 hover:bg-[#FCF8DD]/20 hover:text-[#FCF8DD] transition-all duration-300 w-9 h-9 flex items-center justify-center"
              onClick={closeMobileMenu}
            >
              <FaChevronRight className="text-sm" />
            </button>
          </div>
          
          <nav className="flex-1 px-4 py-6 flex flex-col min-h-0">
            <ul className="flex flex-col gap-2 flex-shrink-0">
              <NavItem to="/presets" label="Presets" icon={<FaCog />} isCollapsed={isCollapsed} disabled={isGenerating} onMobileClick={closeMobileMenu} />
              <li className="relative">
                <button 
                  type="button"
                  className={`
                    w-full flex items-center px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden
                    ${!currentScannerType && location.pathname === '/' 
                      ? 'bg-[#FCF8DD] text-[#112f5e] font-semibold shadow-lg' 
                      : 'text-[#FCF8DD]/80 hover:bg-[#FCF8DD] hover:text-[#112f5e] hover:translate-x-1'
                    }
                    ${isCollapsed ? 'md:justify-center md:px-3' : ''}
                  `}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    showPresetSelectionScreen();
                  }}
                >
                  <span className={`flex items-center justify-center text-lg ${isCollapsed ? 'md:min-w-auto' : 'min-w-5'}`}>
                    <FaPlus />
                  </span>
                  <span className={`ml-4 font-medium text-sm ${isCollapsed ? 'md:hidden' : 'block'}`}>New Chat</span>
                  <div className={`ml-auto w-1.5 h-1.5 bg-[#112f5e] rounded-full shadow-lg animate-pulse ${
                    !currentScannerType && location.pathname === '/' ? 
                    (isCollapsed ? 'md:hidden' : 'block') : 'hidden'
                  }`} />
                </button>
                <div className={`absolute left-16 top-1/2 transform -translate-y-1/2 bg-[#112f5e] text-[#FCF8DD] px-3 py-1.5 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300 whitespace-nowrap border border-[#FCF8DD]/30 shadow-lg ${
                  isCollapsed ? 'hidden md:block' : 'hidden'
                }`}>
                  New Chat
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-[#112f5e] rotate-45 border-l border-b border-[#FCF8DD]/30"></div>
                </div>
              </li>
            </ul>
            
            <div className={`mt-6 flex-1 flex flex-col min-h-0 overflow-hidden ${isCollapsed ? 'md:hidden' : 'block'}`}>
                <div className="flex items-center justify-between px-4 pb-3 border-b border-[#FCF8DD]/20 mb-4">
                  <h3 className="text-sm font-semibold text-[#FCF8DD]/80 uppercase tracking-wider">Recent Chats</h3>
                  <button 
                    className="text-xs text-[#FCF8DD]/60 hover:text-red-400 hover:bg-red-500/10 px-2 py-1 rounded-md transition-colors duration-200"
                    onClick={() => {
                      presets.forEach(preset => clearHistory(preset.id));
                    }}
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-2 space-y-1 min-h-0 scrollbar-thin scrollbar-track-[#0d2549] scrollbar-thumb-[#FCF8DD]/30 hover:scrollbar-thumb-[#FCF8DD]/50">
                  {getAllConversations().length > 0 ? (
                    getAllConversations().slice(0, 20).map((conversation) => {
                      const isActive = isConversationActive(conversation);
                      return (
                        <button
                          key={`${conversation.scannerType}-${conversation.id}`}
                          className={`
                            w-full text-left p-3 rounded-lg transition-all duration-200
                            ${isActive 
                              ? 'bg-[#FCF8DD] text-[#112f5e] font-semibold' 
                              : 'text-[#FCF8DD]/70 hover:bg-[#FCF8DD]/10 hover:text-[#FCF8DD]/90'
                            }
                          `}
                          onClick={() => loadConversation(conversation.scannerType, conversation)}
                        >
                          <div className="w-full">
                            <div className="flex items-center gap-2 mb-1">
                              <div 
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ 
                                  background: (() => {
                                    const preset = findPresetById(presets, conversation.scannerType);
                                    return preset ? preset.theme.primary : '#FCF8DD';
                                  })()
                                }}
                              />
                              <div className="text-sm font-medium truncate flex-1 min-w-0">
                                {String(conversation.title)}
                              </div>
                              {isActive && <div className="w-1.5 h-1.5 bg-[#112f5e] rounded-full flex-shrink-0 animate-pulse" />}
                            </div>
                            <div className={`text-xs opacity-80 ${isActive ? 'text-[#112f5e]/70' : 'text-[#FCF8DD]/60'}`}>
                              {new Date(conversation.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center text-[#FCF8DD]/60 py-10 text-sm italic">
                      No conversations yet
                    </div>
                  )}
                </div>
              </div>
          </nav>

          <div className="p-5 border-t border-[#FCF8DD]/20">
            <div className={`flex items-center gap-3 transition-all duration-300 ${isCollapsed ? 'md:justify-center' : ''}`}>
              <div className="w-9 h-9 bg-gradient-to-br from-[#FCF8DD] to-[#FCF8DD]/80 rounded-full flex items-center justify-center text-[#112f5e] font-semibold text-sm shadow-lg">
                U
              </div>
              <div className={`transition-all duration-300 ${isCollapsed ? 'md:hidden' : 'block'}`}>
                <div className="text-[#FCF8DD] font-medium text-sm">DanTools User</div>
                <div className="text-[#FCF8DD]/70 text-xs">Power User</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile menu button - hide when menu is open */}
        {!isMobileMenuOpen && (
          <button 
            className="md:hidden fixed top-4 left-4 z-30 bg-[#112f5e] text-[#FCF8DD] p-2 rounded-lg shadow-lg border border-[#FCF8DD]/20"
            onClick={toggleMobileMenu}
          >
            <FaBars className="text-sm" />
          </button>
        )}
        
        <div className={`flex-1 transition-all duration-300 ${isCollapsed ? 'md:ml-20' : 'md:ml-72'}`}>
          <Routes>
            <Route path="/" element={
              <div>
                {currentScannerType ? (
                  <CustomChat 
                    messages={currentMessages[currentScannerType] || []}
                    setMessages={(messagesAction) => setCurrentMessages(prev => ({ 
                      ...prev, 
                      [currentScannerType]: typeof messagesAction === 'function' ? messagesAction(prev[currentScannerType] || []) : messagesAction 
                    }))}
                    setIsGenerating={setIsGenerating}
                    scannerType={currentScannerType}
                    presetConfig={findPresetById(presets, currentScannerType)!}
                    conversationTitle={getCurrentConversationTitle(currentScannerType, currentMessages[currentScannerType] || [])}
                  />
                ) : (
                  <PresetSelectionScreen presets={presets} onSelectPreset={selectPreset} />
                )}
              </div>
            } />
            <Route path="/presets" element={<Presets />} />
          </Routes>
        </div>
    </div>
  );
};

interface NavItemProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  isCollapsed: boolean;
  disabled?: boolean;
  onMobileClick?: () => void;
}


const NavItem: React.FC<NavItemProps> = ({ to, label, icon, isCollapsed, disabled = false, onMobileClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  const onClick = (e: React.MouseEvent) => {
    if (disabled) {
      e.preventDefault();
      alert('wait for analysis to finish');
    } else if (onMobileClick) {
      onMobileClick();
    }
  };

  return (
    <li className="relative group">
      <Link 
        to={to} 
        className={`
          w-full flex items-center px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden
          ${isActive 
            ? 'bg-[#FCF8DD] text-[#112f5e] font-semibold shadow-lg' 
            : disabled 
              ? 'text-[#FCF8DD]/50 cursor-not-allowed opacity-50' 
              : 'text-[#FCF8DD]/80 hover:bg-[#FCF8DD] hover:text-[#112f5e] hover:translate-x-1'
          }
          ${isCollapsed ? 'md:justify-center md:px-3' : ''}
        `}
        onClick={onClick}
      >
        <span className={`flex items-center justify-center text-lg ${isCollapsed ? 'md:min-w-auto' : 'min-w-5'}`}>
          {icon}
        </span>
        <span className={`ml-4 font-medium text-sm ${isCollapsed ? 'md:hidden' : 'block'}`}>{label}</span>
        <div className={`ml-auto w-1.5 h-1.5 bg-[#112f5e] rounded-full shadow-lg animate-pulse ${
          isActive ? (isCollapsed ? 'md:hidden' : 'block') : 'hidden'
        }`} />
      </Link>
      <div className={`absolute left-16 top-1/2 transform -translate-y-1/2 bg-[#112f5e] text-[#FCF8DD] px-3 py-1.5 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300 whitespace-nowrap border border-[#FCF8DD]/30 shadow-lg z-50 ${
        isCollapsed ? 'hidden md:block' : 'hidden'
      }`}>
        {label}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-[#112f5e] rotate-45 border-l border-b border-[#FCF8DD]/30"></div>
      </div>
    </li>
  );
};

interface PresetSelectionScreenProps {
  presets: PresetConfig[];
  onSelectPreset: (presetId: string) => void;
}

const PresetSelectionScreen: React.FC<PresetSelectionScreenProps> = ({ presets, onSelectPreset }) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const favoritePresets = presets.filter(p => p.isFavorite);

  return (
    <div className="h-screen bg-[#0d2549] flex items-center justify-center overflow-y-auto py-8">
      <div className="text-center text-[#FCF8DD] max-w-4xl px-8">
        <h1 className="text-4xl font-bold mb-4">Start New Chat</h1>
        <p className="text-xl text-[#FCF8DD]/80 mb-8 leading-relaxed">
          Choose a preset to start a customized conversation
        </p>

        {/* Favorite Presets Mini Cards */}
        {favoritePresets.length > 0 && (
          <div className="mb-12">
            <h2 className="text-lg font-semibold text-[#FCF8DD]/90 mb-6">⭐ Your Favorites</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {favoritePresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onSelectPreset(preset.id)}
                  className="bg-[#112f5e] border-2 border-[#FCF8DD]/20 hover:border-[#FCF8DD]/40 rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl group text-left"
                >
                  <div 
                    className="h-2 w-full"
                    style={{ background: preset.theme.gradient }}
                  />
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-bold text-[#FCF8DD] leading-tight flex-1">{preset.title}</h3>
                      <div className="text-yellow-400 text-xs">
                        <FaStar />
                      </div>
                    </div>
                    <p className="text-xs text-[#FCF8DD]/70 leading-relaxed mb-3">{preset.subtitle}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#FCF8DD]/50 bg-[#FCF8DD]/10 px-2 py-1 rounded font-mono">
                        {preset.model || 'gpt-4.1'}
                      </span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <span className="text-xs text-[#FCF8DD]/60">Click to start →</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8">
          <label className="block text-lg font-medium mb-6 text-[#FCF8DD]/90">
            {favoritePresets.length > 0 ? 'Or browse all presets:' : 'Select Chat Preset:'}
          </label>
          <div className="relative max-w-lg mx-auto">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full bg-[#112f5e] border-2 border-[#FCF8DD]/30 rounded-2xl px-6 py-4 text-[#FCF8DD] focus:ring-4 focus:ring-[#FCF8DD]/20 focus:border-[#FCF8DD] outline-none text-lg cursor-pointer transition-all duration-300 hover:border-[#FCF8DD]/50 hover:bg-[#112f5e]/90 shadow-lg hover:shadow-xl text-left flex items-center justify-between"
            >
              <span className={selectedPreset ? 'text-[#FCF8DD]' : 'text-[#FCF8DD]/60'}>
                {selectedPreset ? presets.find(p => p.id === selectedPreset)?.title : 'Choose a preset...'}
              </span>
              <div className="w-6 h-6 bg-[#FCF8DD]/20 rounded-full flex items-center justify-center">
                <span className={`text-[#FCF8DD]/80 text-sm transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
              </div>
            </button>
            
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#112f5e] border-2 border-[#FCF8DD]/30 rounded-2xl shadow-2xl z-50 overflow-hidden">
                <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-track-[#0d2549] scrollbar-thumb-[#FCF8DD]/30 hover:scrollbar-thumb-[#FCF8DD]/50">
                  {presets.map((preset, index) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setSelectedPreset(preset.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full px-6 py-4 text-left hover:bg-[#FCF8DD]/10 transition-all duration-200 flex items-center gap-4 ${
                        index !== presets.length - 1 ? 'border-b border-[#FCF8DD]/10' : ''
                      } ${selectedPreset === preset.id ? 'bg-[#FCF8DD]/15' : ''}`}
                    >
                      <div 
                        className="w-4 h-8 rounded-lg flex-shrink-0"
                        style={{ background: preset.theme.gradient }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[#FCF8DD] font-medium">{preset.title}</div>
                        <div className="text-[#FCF8DD]/60 text-sm truncate">{preset.subtitle}</div>
                        <div className="text-[#FCF8DD]/50 text-xs mt-1 font-mono">{preset.model || 'gpt-4.1'}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Backdrop to close dropdown */}
            {isDropdownOpen && (
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsDropdownOpen(false)}
              />
            )}
          </div>
        </div>

        {selectedPreset && (
          <div className="mb-8">
            {(() => {
              const preset = presets.find(p => p.id === selectedPreset);
              if (!preset) return null;
              
              return (
                <div className="bg-gradient-to-br from-[#FCF8DD]/10 to-[#FCF8DD]/5 border-2 border-[#FCF8DD]/20 rounded-2xl overflow-hidden hover:bg-gradient-to-br hover:from-[#FCF8DD]/15 hover:to-[#FCF8DD]/8 transition-all duration-300 shadow-lg hover:shadow-xl hover:border-[#FCF8DD]/40 hover:scale-[1.02]">
                  <div 
                    className="h-3 w-full"
                    style={{ background: preset.theme.gradient }}
                  />
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-[#FCF8DD] mb-2 leading-tight">
                      {preset.title}
                    </h3>
                    <p className="text-sm text-[#FCF8DD]/80 leading-relaxed mb-3">
                      {preset.subtitle}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#FCF8DD]/60 font-medium">Model:</span>
                      <span className="text-xs text-[#FCF8DD]/80 bg-[#FCF8DD]/10 px-2 py-1 rounded-md font-mono">
                        {preset.model || 'gpt-4.1'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        <button
          onClick={() => selectedPreset && onSelectPreset(selectedPreset)}
          disabled={!selectedPreset}
          className={`
            px-10 py-4 rounded-2xl text-lg font-semibold transition-all duration-300 shadow-lg
            ${selectedPreset 
              ? 'bg-gradient-to-r from-[#FCF8DD] to-[#FCF8DD]/90 text-[#112f5e] hover:from-[#FCF8DD]/95 hover:to-[#FCF8DD]/85 hover:scale-105 hover:shadow-2xl transform' 
              : 'bg-[#FCF8DD]/20 text-[#FCF8DD]/40 cursor-not-allowed shadow-none'
            }
          `}
        >
          Start Chat
        </button>

        <div className="mt-12 text-sm text-[#FCF8DD]/60">
          Need more presets? Visit <span className="text-[#FCF8DD]/80 font-medium">Presets</span> to create custom chat configurations
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;