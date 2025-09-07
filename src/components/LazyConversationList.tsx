import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FaTrash } from 'react-icons/fa';
import { SavedConversation, PresetConfig, ScannerType } from '../types';
import { findPresetById } from '../utils/presets';

interface LazyConversationListProps {
  conversations: Array<SavedConversation & { scannerType: ScannerType }>;
  presets: PresetConfig[];
  onLoadConversation: (scannerType: ScannerType, conversation: SavedConversation) => void;
  onDeleteConversation: (data: { title: string; scannerType: string; conversationId: string }) => void;
  isConversationActive: (conversation: SavedConversation & { scannerType: ScannerType }) => boolean;
  isGenerating: boolean;
}

const ITEMS_PER_PAGE = 10;
const INITIAL_LOAD = 5;

const LazyConversationList: React.FC<LazyConversationListProps> = ({
  conversations,
  presets,
  onLoadConversation,
  onDeleteConversation,
  isConversationActive,
  isGenerating
}) => {
  const [visibleCount, setVisibleCount] = useState(INITIAL_LOAD);
  const [isLoading, setIsLoading] = useState(false);

  // reset visible count when conversations change
  useEffect(() => {
    setVisibleCount(INITIAL_LOAD);
  }, [conversations.length]);

  // memoize visible conversations to prevent unnecessary re-renders
  const visibleConversations = useMemo(() => {
    return conversations.slice(0, visibleCount);
  }, [conversations, visibleCount]);

  const hasMore = conversations.length > visibleCount;

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    // simulate async 
    setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, conversations.length));
      setIsLoading(false);
    }, 100);
  }, [isLoading, hasMore, conversations.length]);

  // Intersection Observer for infinite scroll
  const observerRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading || !hasMore) return;
    
    if (node) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            loadMore();
          }
        },
        { threshold: 1.0 }
      );
      
      observer.observe(node);
      
      return () => observer.disconnect();
    }
  }, [isLoading, hasMore, loadMore]);

  if (conversations.length === 0) {
    return (
      <div className="text-center text-[#FCF8DD]/60 py-10 text-sm italic">
        No conversations yet
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {visibleConversations.map((conversation) => {
        const isActive = isConversationActive(conversation);
        return (
          <ConversationItem
            key={`${conversation.scannerType}-${conversation.id}`}
            conversation={conversation}
            presets={presets}
            isActive={isActive}
            isGenerating={isGenerating}
            onLoad={() => onLoadConversation(conversation.scannerType, conversation)}
            onDelete={() => onDeleteConversation({
              title: conversation.title,
              scannerType: conversation.scannerType,
              conversationId: conversation.id
            })}
          />
        );
      })}
      
      {/* Loading indicator and intersection target */}
      {hasMore && (
        <div ref={observerRef} className="py-4 text-center">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 text-[#FCF8DD]/60 text-sm">
              <div className="w-4 h-4 border-2 border-[#FCF8DD]/20 border-t-[#FCF8DD]/60 rounded-full animate-spin"></div>
              Loading more...
            </div>
          ) : (
            <button
              onClick={loadMore}
              className="text-[#FCF8DD]/60 hover:text-[#FCF8DD]/80 text-sm underline transition-colors"
            >
              Load {Math.min(ITEMS_PER_PAGE, conversations.length - visibleCount)} more conversations
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Memoized conversation item to prevent unnecessary re-renders
const ConversationItem: React.FC<{
  conversation: SavedConversation & { scannerType: ScannerType };
  presets: PresetConfig[];
  isActive: boolean;
  isGenerating: boolean;
  onLoad: () => void;
  onDelete: () => void;
}> = React.memo(({ conversation, presets, isActive, isGenerating, onLoad, onDelete }) => {
  const preset = useMemo(() => 
    findPresetById(presets, conversation.scannerType), 
    [presets, conversation.scannerType]
  );

  const presetColor = useMemo(() => 
    preset ? preset.theme.primary : '#FCF8DD', 
    [preset]
  );

  return (
    <div className="relative group">
      <button
        className={`
          w-full text-left p-3 rounded-lg transition-all duration-200
          ${isActive 
            ? 'bg-[#FCF8DD] text-[#112f5e] font-semibold' 
            : isGenerating
              ? 'text-[#FCF8DD]/40 cursor-not-allowed opacity-50'
              : 'text-[#FCF8DD]/70 hover:bg-[#FCF8DD]/10 hover:text-[#FCF8DD]/90'
          }
        `}
        onClick={onLoad}
        disabled={isGenerating}
      >
        <div className="w-full">
          <div className="flex items-center gap-2 mb-1">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: presetColor }}
            />
            <div className="text-sm font-medium truncate flex-1 min-w-0 pr-8">
              {String(conversation.title)}
            </div>
            {isActive && <div className="w-1.5 h-1.5 bg-[#112f5e] rounded-full flex-shrink-0 animate-pulse" />}
          </div>
          <div className={`text-xs opacity-80 ${isActive ? 'text-[#112f5e]/70' : 'text-[#FCF8DD]/60'}`}>
            {new Date(conversation.timestamp).toLocaleDateString()}
          </div>
        </div>
      </button>
      
      <button
        className={`absolute bottom-2 right-2 p-1.5 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100 ${
          isActive 
            ? 'text-[#112f5e]/60 hover:text-red-600 hover:bg-red-100/20' 
            : 'text-[#FCF8DD]/60 hover:text-red-400 hover:bg-red-500/20'
        } ${isGenerating ? 'cursor-not-allowed opacity-30' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!isGenerating) {
            onDelete();
          }
        }}
        disabled={isGenerating}
        title="Delete conversation"
      >
        <FaTrash className="text-xs" />
      </button>
    </div>
  );
});

ConversationItem.displayName = 'ConversationItem';

export default LazyConversationList;