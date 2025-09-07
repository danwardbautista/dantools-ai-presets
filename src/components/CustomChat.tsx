import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FaSearch, FaComments, FaCopy, FaCheck, FaExclamationTriangle } from "react-icons/fa";
import VirtualMessageList from './VirtualMessageList';
import 'katex/dist/katex.min.css';
import { ChatMessage, PresetConfig } from '../types';
import { getOpenAIClient, sanitizeInput } from '../utils/openai';
import { adjustTextareaHeight } from '../utils/dom';
import { 
  calculateConversationTokens, 
  getTokenUsage, 
  shouldOptimizeConversation,
  optimizeConversation,
  truncateConversation,
  TokenUsage 
} from '../utils/tokenManager';
import TokenUsageIndicator from './TokenUsageIndicator';

export interface CustomChatProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  scannerType: string;
  presetConfig: PresetConfig;
  conversationTitle?: string;
}

const CodeBlock: React.FC<{ children: string; language?: string; isInline?: boolean }> = memo(({ 
  children, 
  language, 
  isInline = false 
}) => {
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };


  if (isInline) {
    return (
      <code className="bg-black/20 text-current px-2 py-1 rounded-md text-sm font-mono border border-current/20 break-all">
        {children}
      </code>
    );
  }

  return (
    <div className="code-block-container my-4">
      <div className="relative group">
        <button
          onClick={copyToClipboard}
          className="absolute -top-2 right-2 z-10 bg-black/60 hover:bg-black/80 text-white px-1.5 py-0.5 rounded-md transition-all duration-200 flex items-center gap-1 text-xs border border-white/20"
          title={copied ? "Copied!" : "Copy code"}
        >
          {copied ? (
            <>
              <FaCheck className="text-green-400 text-xs" />
              <span className="text-xs">Copied!</span>
            </>
          ) : (
            <>
              <FaCopy className="text-xs" />
              <span className="text-xs">Copy</span>
            </>
          )}
        </button>
        <div className="overflow-x-auto code-scroll-container">
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={language || 'text'}
            PreTag="div"
            customStyle={{
              margin: '0',
              border: 'none',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              borderRadius: '8px',
              padding: '16px',
              paddingRight: '60px',
              background: 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)',
              fontSize: '14px',
              lineHeight: '1.6'
            }}
            wrapLongLines={isMobile}
          >
            {children.replace(/\n$/, "")}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
});

CodeBlock.displayName = 'CodeBlock';

const markdownComponents = {
  code({ className, children }: React.ComponentProps<'code'>) {
    const match = /language-(\w+)/.exec(className || "");
    const codeContent = String(children);
    
    return match ? (
      <CodeBlock language={match[1]}>
        {codeContent}
      </CodeBlock>
    ) : (
      <CodeBlock isInline={true}>
        {codeContent}
      </CodeBlock>
    );
  },
  table({ children, ...props }: React.ComponentProps<'table'>) {
    return (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-[#FCF8DD]/30 rounded-lg overflow-hidden" {...props}>
          {children}
        </table>
      </div>
    );
  },
  thead({ children, ...props }: React.ComponentProps<'thead'>) {
    return (
      <thead className="bg-[#FCF8DD]/10" {...props}>
        {children}
      </thead>
    );
  },
  tbody({ children, ...props }: React.ComponentProps<'tbody'>) {
    return (
      <tbody {...props}>
        {children}
      </tbody>
    );
  },
  tr({ children, ...props }: React.ComponentProps<'tr'>) {
    return (
      <tr className="border-b border-[#FCF8DD]/20 hover:bg-[#FCF8DD]/5" {...props}>
        {children}
      </tr>
    );
  },
  th({ children, ...props }: React.ComponentProps<'th'>) {
    return (
      <th className="px-4 py-3 text-left font-semibold text-[#FCF8DD] border-r border-[#FCF8DD]/20 last:border-r-0" {...props}>
        {children}
      </th>
    );
  },
  td({ children, ...props }: React.ComponentProps<'td'>) {
    return (
      <td className="px-4 py-3 text-[#FCF8DD]/90 border-r border-[#FCF8DD]/10 last:border-r-0" {...props}>
        {children}
      </td>
    );
  },
  blockquote({ children, ...props }: React.ComponentProps<'blockquote'>) {
    return (
      <blockquote className="border-l-4 border-[#FCF8DD]/50 pl-4 py-2 my-4 bg-[#FCF8DD]/5 rounded-r-lg italic" {...props}>
        {children}
      </blockquote>
    );
  },
  ul({ children, ...props }: React.ComponentProps<'ul'>) {
    return (
      <ul className="text-[#FCF8DD]/90" {...props}>
        {children}
      </ul>
    );
  },
  ol({ children, ...props }: React.ComponentProps<'ol'>) {
    return (
      <ol className="text-[#FCF8DD]/90" {...props}>
        {children}
      </ol>
    );
  },
  li({ children, ...props }: React.ComponentProps<'li'>) {
    return (
      <li className="text-[#FCF8DD]/90 leading-relaxed" {...props}>
        {children}
      </li>
    );
  },
  h1({ children, ...props }: React.ComponentProps<'h1'>) {
    return (
      <h1 className="text-2xl font-bold text-[#FCF8DD] my-4 pb-2 border-b border-[#FCF8DD]/30" {...props}>
        {children}
      </h1>
    );
  },
  h2({ children, ...props }: React.ComponentProps<'h2'>) {
    return (
      <h2 className="text-xl font-semibold text-[#FCF8DD] my-3 pb-1 border-b border-[#FCF8DD]/20" {...props}>
        {children}
      </h2>
    );
  },
  h3({ children, ...props }: React.ComponentProps<'h3'>) {
    return (
      <h3 className="text-lg font-medium text-[#FCF8DD] my-3" {...props}>
        {children}
      </h3>
    );
  },
  h4({ children, ...props }: React.ComponentProps<'h4'>) {
    return (
      <h4 className="text-base font-medium text-[#FCF8DD] my-2" {...props}>
        {children}
      </h4>
    );
  },
  h5({ children, ...props }: React.ComponentProps<'h5'>) {
    return (
      <h5 className="text-sm font-medium text-[#FCF8DD] my-2" {...props}>
        {children}
      </h5>
    );
  },
  h6({ children, ...props }: React.ComponentProps<'h6'>) {
    return (
      <h6 className="text-xs font-medium text-[#FCF8DD] my-2" {...props}>
        {children}
      </h6>
    );
  },
  p({ children, ...props }: React.ComponentProps<'p'>) {
    return (
      <p className="leading-relaxed my-2" {...props}>
        {children}
      </p>
    );
  },
  strong({ children, ...props }: React.ComponentProps<'strong'>) {
    return (
      <strong className="font-semibold text-[#FCF8DD]" {...props}>
        {children}
      </strong>
    );
  },
  em({ children, ...props }: React.ComponentProps<'em'>) {
    return (
      <em className="italic text-[#FCF8DD]/90" {...props}>
        {children}
      </em>
    );
  },
  a({ children, href, ...props }: React.ComponentProps<'a'>) {
    return (
      <a 
        className="text-[#FCF8DD] underline hover:text-[#FCF8DD]/80 transition-colors" 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    );
  },
  hr({ ...props }: React.ComponentProps<'hr'>) {
    return (
      <hr className="border-[#FCF8DD]/30 my-6" {...props} />
    );
  }
};

// optimized message bubble with better memoization
const MessageBubble: React.FC<{
  message: ChatMessage;
  index: number;
}> = memo(({ message }) => {
  // memoize markdown rendering to prevent unnecessary re-renders
  const renderedContent = useMemo(() => {
    if (message.sender === "user") {
      return <div className="whitespace-pre-wrap">{message.message}</div>;
    }
    
    // only render markdown for bot messages, with truncation for very long messages
    const truncatedMessage = message.message.length > 10000 
      ? message.message.substring(0, 10000) + "\n\n*[Message truncated for performance]*"
      : message.message;
    
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        skipHtml={true}
        components={markdownComponents}
      >
        {truncatedMessage}
      </ReactMarkdown>
    );
  }, [message.message, message.sender]);
  
  return (
    <div
      className={`flex ${
        message.sender === "user" ? "justify-end" : "justify-start"
      } mb-4`}
    >
      <div
        className={`${
          message.sender === "user"
            ? "max-w-3xl w-auto bg-[#FCF8DD] text-[#112f5e] shadow-sm border border-[#FCF8DD]/20 rounded-lg px-3 py-3 leading-relaxed whitespace-pre-wrap"
            : "max-w-4xl w-full md:w-auto text-[#FCF8DD] text-base leading-relaxed px-3 md:px-6 overflow-hidden markdown-content"
        }`}
      >
        {renderedContent}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // custom comparison to prevent unnecessary re-renders
  return prevProps.message.message === nextProps.message.message &&
         prevProps.message.sender === nextProps.message.sender &&
         prevProps.index === nextProps.index;
});

MessageBubble.displayName = 'MessageBubble';

// optimized chat container with better memory management
const ChatMessagesContainer: React.FC<{
  messages: ChatMessage[];
  presetConfig: PresetConfig;
  showTokenWarning: boolean;
  tokenUsage: TokenUsage;
  isTyping: boolean;
  optimizedMessages: ChatMessage[];
  streamingMessage: string;
}> = memo(({ messages, presetConfig, showTokenWarning, tokenUsage, isTyping, optimizedMessages, streamingMessage }) => {
  
  // only render recent messages to improve performance
  const displayMessages = useMemo(() => {
    // show only last 50 messages for better performance
    return messages.slice(-50);
  }, [messages]);
  
  // memoize empty state to prevent re-renders
  const emptyState = useMemo(() => (
    <div className="text-center py-16">
      <div className="mb-6">
        <div 
          className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-4"
          style={{
            backgroundColor: presetConfig.subtitle ? presetConfig.theme.primary : '#FCF8DD'
          }}
        >
          {presetConfig.subtitle ? (
            <FaComments className="text-white text-lg" />
          ) : (
            <FaSearch className="text-[#112f5e] text-lg" />
          )}
        </div>
      </div>
      <h3 className="text-2xl font-semibold text-[#FCF8DD] mb-3">
        {presetConfig.title}
      </h3>
      <p className="text-[#FCF8DD]/80 text-base leading-relaxed max-w-xl mx-auto">
        {presetConfig.subtitle || "Start a conversation using the preset configuration selected."}
      </p>
    </div>
  ), [presetConfig.title, presetConfig.subtitle, presetConfig.theme.primary]);
  
  return (
    <>
      {displayMessages.length === 0 && emptyState}
      
      {displayMessages.length > 0 && (
        <VirtualMessageList
          messages={displayMessages}
          renderMessage={(message, index) => (
            <MessageBubble
              key={`${message.sender}-${index}-${message.message.slice(0, 30)}`}
              message={message}
              index={index}
            />
          )}
          containerHeight={600}
          estimatedItemHeight={100}
        />
      )}

      {/* token warning */}
      {showTokenWarning && tokenUsage && !isTyping && (
        <div className="mb-4 max-w-4xl mx-auto">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-yellow-400">
              <FaExclamationTriangle className="text-sm" />
              <span className="text-sm font-medium">
                {tokenUsage.level === 'danger' 
                  ? 'Token limit nearly reached! Older messages may be summarized.'
                  : 'High token usage detected. Consider shorter messages.'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* conversation was optimized notice */}
      {optimizedMessages.length > 0 && (
        <div className="mb-4 max-w-4xl mx-auto">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-400">
              <FaComments className="text-sm" />
              <span className="text-sm">
                Conversation optimized ({messages.length - optimizedMessages.length} older messages summarized)
              </span>
            </div>
          </div>
        </div>
      )}

      {isTyping && (
        <div className="flex justify-start mb-4">
          <div className="max-w-4xl w-full md:w-auto text-[#FCF8DD] text-base leading-relaxed px-3 md:px-6 overflow-hidden markdown-content">
            {streamingMessage ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                skipHtml={true}
                components={markdownComponents}
              >
                {streamingMessage}
              </ReactMarkdown>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-[#FCF8DD]/80 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-[#FCF8DD]/60 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-[#FCF8DD]/40 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-[#FCF8DD]/80 text-sm">Thinking...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
});

ChatMessagesContainer.displayName = 'ChatMessagesContainer';

// main chat component
const CustomChat: React.FC<CustomChatProps> = ({ 
  messages, 
  setMessages, 
  setIsGenerating, 
  scannerType,
  presetConfig,
  conversationTitle
}) => {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [customSystemPrompt, setCustomSystemPrompt] = useState<string | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const [showTokenWarning, setShowTokenWarning] = useState(false);
  const [optimizedMessages, setOptimizedMessages] = useState<ChatMessage[]>([]);
  const chatFeedRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const scrollTimeoutRef = useRef<number | null>(null);
  const streamingScrollRef = useRef<number | null>(null);
  const debounceTimeoutRef = useRef<number | null>(null);
  const cleanupFunctionsRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    const loadCustomPrompts = () => {
      const saved = localStorage.getItem('dantools-system-prompts');
      if (saved) {
        try {
          const parsedPrompts = JSON.parse(saved);
          if (parsedPrompts[scannerType]) {
            setCustomSystemPrompt(parsedPrompts[scannerType]);
          }
        } catch {
          // cant load custom prompts, use defaults
        }
      }
    };

    loadCustomPrompts();

    const onSystemPromptsUpdate = (event: CustomEvent) => {
      const updatedPrompts = event.detail;
      if (updatedPrompts[scannerType]) {
        setCustomSystemPrompt(updatedPrompts[scannerType]);
      }
    };

    window.addEventListener('systemPromptsUpdated', onSystemPromptsUpdate as EventListener);
    return () => {
      window.removeEventListener('systemPromptsUpdated', onSystemPromptsUpdate as EventListener);
    };
  }, [scannerType]);

  const systemPrompt = useMemo(() => ({
    role: "system" as const,
    content: customSystemPrompt || presetConfig?.systemPrompt || "You are a helpful AI assistant.",
  }), [customSystemPrompt, presetConfig?.systemPrompt]);

  // wait a bit before calculating tokens so typing doesnt lag - with proper cleanup
  const debouncedTokenCalculation = useCallback((messages: ChatMessage[], input: string, systemContent: string, model: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = window.setTimeout(() => {
      const currentMessages = optimizedMessages.length > 0 ? optimizedMessages : messages;
      const estimatedTokens = calculateConversationTokens(currentMessages, systemContent, input);
      const usage = getTokenUsage(estimatedTokens, model);
      
      setTokenUsage(usage);
      setShowTokenWarning(usage.level === 'warning' || usage.level === 'danger');
      debounceTimeoutRef.current = null;
    }, 150); // wait 150ms
  }, [optimizedMessages]);

  // calculate tokens but debounced
  useEffect(() => {
    const currentModel = presetConfig?.model || "gpt-4.1";
    const systemContent = systemPrompt.content;
    
    debouncedTokenCalculation(messages, input, systemContent, currentModel);
  }, [messages, input, customSystemPrompt, presetConfig, debouncedTokenCalculation, systemPrompt.content]);

  // scroll handler that doesnt run too often
  const handleScroll = useCallback(() => {
    const chatFeed = chatFeedRef.current;
    if (!chatFeed) return;

    const { scrollTop, scrollHeight, clientHeight } = chatFeed;
    const scrollThreshold = 100;
    const nearBottom = scrollHeight - scrollTop - clientHeight <= scrollThreshold;
    
    // clear old timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // wait until user stops scrolling
    scrollTimeoutRef.current = window.setTimeout(() => {
      // user scrolled up during streaming
      if (streamingMessage && scrollTop < lastScrollTop - 10 && !nearBottom) {
        setUserScrolledUp(true);
      }
      
      // user scrolled back to bottom
      if (nearBottom && userScrolledUp) {
        setUserScrolledUp(false);
      }
      
      setLastScrollTop(scrollTop);
    }, 100); // wait 100ms for better performance
  }, [streamingMessage, userScrolledUp, lastScrollTop]);

  useEffect(() => {
    const chatFeed = chatFeedRef.current;
    if (!chatFeed) return;

    chatFeed.addEventListener('scroll', handleScroll, { passive: true });
    
    const cleanup = () => {
      chatFeed.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
    
    cleanupFunctionsRef.current.push(cleanup);
    
    return cleanup;
  }, [handleScroll]);

  // auto scroll when not streaming - with proper cleanup
  useEffect(() => {
    const chatFeed = chatFeedRef.current;
    if (!chatFeed) return;

    let timeoutId: number | null = null;
    
    // scroll to bottom smoothly
    if (!streamingMessage) {
      timeoutId = window.setTimeout(() => {
        if (chatFeed) {
          const targetScrollTop = chatFeed.scrollHeight - chatFeed.clientHeight;
          const currentScrollTop = chatFeed.scrollTop;
          const difference = targetScrollTop - currentScrollTop;
          
          // smooth scroll if not too far
          if (Math.abs(difference) < 800) {
            chatFeed.scrollTo({
              top: targetScrollTop,
              behavior: 'smooth'
            });
          } else {
            // jump immediately for big distances
            chatFeed.scrollTop = targetScrollTop;
          }
        }
        timeoutId = null;
      }, 100);
      
      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };
      
      cleanupFunctionsRef.current.push(cleanup);
      return cleanup;
    }
  }, [messages, streamingMessage]);

  // scroll following during streaming - with proper cleanup
  useEffect(() => {
    const chatFeed = chatFeedRef.current;
    if (!chatFeed || !streamingMessage) {
      // stop animation when streaming ends
      if (streamingScrollRef.current) {
        clearInterval(streamingScrollRef.current);
        streamingScrollRef.current = null;
      }
      return;
    }

    // start animation if user didnt scroll up
    if (!userScrolledUp && !streamingScrollRef.current) {
      streamingScrollRef.current = window.setInterval(() => {
        if (chatFeed && streamingMessage && !userScrolledUp) {
          const targetScrollTop = chatFeed.scrollHeight - chatFeed.clientHeight;
          const currentScrollTop = chatFeed.scrollTop;
          const difference = targetScrollTop - currentScrollTop;
          
          // follow smoothly
          if (difference > 5) {
            const increment = Math.max(difference * 0.4, 10);
            chatFeed.scrollTop = Math.min(currentScrollTop + increment, targetScrollTop);
          } else if (difference > 0) {
            chatFeed.scrollTop = targetScrollTop;
          }
        } else if (!streamingMessage) {
          // stop when streaming ends
          if (streamingScrollRef.current) {
            clearInterval(streamingScrollRef.current);
            streamingScrollRef.current = null;
          }
        }
      }, 60); // run every 60ms
    }

    const cleanup = () => {
      if (streamingScrollRef.current) {
        clearInterval(streamingScrollRef.current);
        streamingScrollRef.current = null;
      }
    };
    
    cleanupFunctionsRef.current.push(cleanup);
    return cleanup;
  }, [streamingMessage, userScrolledUp]);

  // removed duplicate scroll stuff

  // scroll to bottom when opening chat - with cleanup
  useEffect(() => {
    if (chatFeedRef.current) {
      const chatFeed = chatFeedRef.current;
      const timeoutId = setTimeout(() => {
        chatFeed.scrollTop = chatFeed.scrollHeight;
      }, 50);
      
      const cleanup = () => clearTimeout(timeoutId);
      cleanupFunctionsRef.current.push(cleanup);
    }
    
    // reset stuff when switching chats
    setOptimizedMessages([]);
    setUserScrolledUp(false);
    setLastScrollTop(0);
    
    // clean up previous chat's memory
    return () => {
      // clear any remaining timeouts
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
      if (streamingScrollRef.current) {
        clearInterval(streamingScrollRef.current);
        streamingScrollRef.current = null;
      }
      
      // run all cleanup functions - capture ref to avoid stale closure
      const cleanupFunctions = cleanupFunctionsRef.current;
      cleanupFunctions.forEach(cleanup => cleanup());
      cleanupFunctions.length = 0;
      
      // clear message state to free memory
      setOptimizedMessages([]);
      setStreamingMessage("");
    };
  }, [scannerType]); // trigger only on switch?

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isTyping) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const onPopState = (e: PopStateEvent) => {
      if (isTyping) {
        e.preventDefault();
        window.history.pushState(null, '', window.location.href);
        alert('wait for analysis to finish before leaving');
      }
    };

    if (isTyping) {
      window.addEventListener('beforeunload', onBeforeUnload);
      window.addEventListener('popstate', onPopState);
    }

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('popstate', onPopState);
    };
  }, [isTyping]);

  useEffect(() => {
    adjustTextareaHeight(textareaRef.current);
  }, [input]);

  // show loading if preset not found
  if (!presetConfig) {
    return (
      <div className="h-screen bg-[#0d2549] flex items-center justify-center">
        <div className="text-center text-[#FCF8DD]">
          <div className="text-xl mb-4">Loading scanner configuration...</div>
          <div className="text-sm opacity-80">If this persists, the preset may not exist.</div>
        </div>
      </div>
    );
  }

  // stop generation and save what we got
  const stopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsTyping(false);
      setIsGenerating(false);
      if (streamingMessage) {
        setMessages((prev) => [
          ...prev,
          { sender: "bot", message: streamingMessage },
        ]);
        setStreamingMessage("");
      }
    }
  };

  // send message to openai
  const sendMessage = useCallback(async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isTyping) return;

    const cleanInput = sanitizeInput(textToSend);
    const userMsg: ChatMessage = { sender: "user", message: cleanInput };
    
    // limit message history to prevent memory bloat
    setMessages((prev) => {
      const updated = [...prev, userMsg];
      // keep only last 100 messages to prevent memory issues
      return updated.length > 100 ? updated.slice(-100) : updated;
    });
    
    setInput("");
    setIsTyping(true);
    setIsGenerating(true);
    setStreamingMessage("");
    // reset scroll for new message
    setUserScrolledUp(false);
    setLastScrollTop(0);

    const controller = new AbortController();
    setAbortController(controller);

    // use optimized messages if we have them
    let messagesToUse = optimizedMessages.length > 0 ? optimizedMessages : messages;
    
    // optimize conversation if getting too long
    const currentModel = presetConfig?.model || "gpt-4.1";
    if (shouldOptimizeConversation([...messagesToUse, { sender: "user", message: cleanInput }], systemPrompt.content, currentModel)) {
      try {
        const optimized = await optimizeConversation([...messagesToUse, { sender: "user", message: cleanInput }], systemPrompt.content, currentModel);
        messagesToUse = optimized.slice(0, -1); // remove the input we just added
        setOptimizedMessages(messagesToUse);
        
        // tell user we optimized the conversation
        setMessages((prev) => {
          const updated = [...prev, { sender: "bot" as const, message: "*Conversation optimized to manage token usage. Some older messages have been summarized.*" }];
          // keep only last 100 messages to prevent memory issues
          return updated.length > 100 ? updated.slice(-100) : updated;
        });
      } catch (error) {
        console.warn('Failed to optimize conversation, using truncation:', error);
        messagesToUse = truncateConversation([...messagesToUse, { sender: "user", message: cleanInput }], systemPrompt.content, currentModel).slice(0, -1);
        setOptimizedMessages(messagesToUse);
      }
    }
    
    // build conversation for api call
    const conversationPayload = [
      systemPrompt,
      ...messagesToUse.map((msg) => ({
        role: msg.sender === "user" ? "user" as const : "assistant" as const,
        content: msg.message,
      })),
      { role: "user" as const, content: cleanInput },
    ];

    try {
      console.log('Using model:', presetConfig.model || "gpt-4.1");
      const openai = getOpenAIClient();
      const stream = await openai.chat.completions.create({
        model: presetConfig.model || "gpt-4.1",
        messages: conversationPayload,
        temperature: 0.7,
        stream: true,
      }, {
        signal: controller.signal,
      });

      // stream response and update ui
      let fullResponse = "";
      for await (const chunk of stream) {
        if (controller.signal.aborted) break;
        
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          setStreamingMessage(fullResponse);
        }
      }

      if (!controller.signal.aborted) {
        setMessages((prev) => {
          const updated = [...prev, { sender: "bot" as const, message: fullResponse }];
          // keep only last 100 messages to prevent memory issues
          return updated.length > 100 ? updated.slice(-100) : updated;
        });
        setStreamingMessage("");
        
        // clear optimized messages after response
        // keep full conversation history
        if (optimizedMessages.length > 0) {
          setOptimizedMessages([]);
        }
      }
    } catch (e: unknown) {
      // api error
      if (e instanceof Error && e.name !== 'AbortError') {
        let errorMessage = "Something went wrong, try again";
        
        if (e.message.includes('Invalid OpenAI API key') || e.message.includes('API key')) {
          errorMessage = "Invalid OpenAI API key. Please configure your API key in the settings.";
        } else if (e.message.includes('401')) {
          errorMessage = "Invalid OpenAI API key. Please check your API key and try again.";
        } else if (e.message.includes('quota') || e.message.includes('billing')) {
          errorMessage = "OpenAI API quota exceeded. Please check your OpenAI account billing.";
        } else if (e.message.includes('rate limit')) {
          errorMessage = "Rate limit exceeded. Please wait a moment and try again.";
        } else if (e.message.includes('context_length_exceeded') || e.message.includes('maximum context length') || e.message.includes('token limit') || e.message.includes('413')) {
          errorMessage = "Message too long for this model. The conversation has been optimized to fit within token limits.";
          // try to optimize conversation
          try {
            const optimized = truncateConversation(messages, systemPrompt.content, presetConfig?.model || "gpt-4.1");
            setOptimizedMessages(optimized);
          } catch {
            // Failed to optimize conversation, continue with error message
          }
        }
        
        setMessages((prev) => {
          const updated = [...prev, { sender: "bot" as const, message: errorMessage }];
          // keep only last 100 messages to prevent memory issues
          return updated.length > 100 ? updated.slice(-100) : updated;
        });
      }
    } finally {
      setIsTyping(false);
      setIsGenerating(false);
      setAbortController(null);
      setStreamingMessage("");
      
      // Memory cleanup after request
      if (abortController) {
        setAbortController(null);
      }
    }
  }, [input, isTyping, messages, optimizedMessages, systemPrompt, presetConfig, setMessages, setIsGenerating, setStreamingMessage, setOptimizedMessages]);

  // event handlers that dont cause re-renders
  const send = useCallback(() => {
    sendMessage();
  }, [sendMessage]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }, [send]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustTextareaHeight(textareaRef.current);
  }, []);


  return (
    <div className="h-screen bg-[#0d2549] flex flex-col">
      {/* Regular Chat Layout */}
      <div className="flex flex-col h-full">
        {/* Enhanced scanner title */}
        <div className="bg-[#112f5e] border-b border-[#FCF8DD]/10 px-6 py-4 md:pl-6 pl-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-lg font-medium text-[#FCF8DD]">
                {conversationTitle || presetConfig.title}
              </span>
              <span className="text-sm text-[#FCF8DD]/50 mt-1">
                {presetConfig.model || 'gpt-4.1'} • {presetConfig.title}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {tokenUsage && (
                <TokenUsageIndicator 
                  usage={tokenUsage} 
                  compact={true}
                  className="flex-shrink-0"
                />
              )}
            </div>
          </div>
        </div>

      <div 
        className="flex-1 overflow-y-auto px-2 md:px-4 py-6" 
        ref={chatFeedRef}
      >
        <div className="max-w-4xl mx-auto space-y-6">
          <ChatMessagesContainer
            messages={messages}
            presetConfig={presetConfig}
            showTokenWarning={showTokenWarning}
            tokenUsage={tokenUsage || { estimated: 0, limit: 0, percentage: 0, level: 'safe', remaining: 0 }}
            isTyping={isTyping}
            optimizedMessages={optimizedMessages}
            streamingMessage={streamingMessage}
          />
        </div>
      </div>

      <div className="bg-[#112f5e] border-t border-[#FCF8DD]/10 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Token usage indicator in input area */}
          {tokenUsage && (tokenUsage.level === 'warning' || tokenUsage.level === 'danger') && (
            <div className="mb-3">
              <TokenUsageIndicator usage={tokenUsage} compact={true} className="justify-center" />
            </div>
          )}
          
          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              className={`flex-1 resize-none border rounded-2xl px-6 py-5 focus:ring-2 focus:ring-[#FCF8DD] focus:border-[#FCF8DD] outline-none transition-all duration-200 max-h-48 bg-[#0d2549] text-[#FCF8DD] placeholder-[#FCF8DD]/60 text-lg leading-normal min-h-[60px] ${
                tokenUsage?.level === 'danger' 
                  ? 'border-red-500/50 focus:ring-red-400 focus:border-red-400' 
                  : tokenUsage?.level === 'warning'
                  ? 'border-yellow-500/50 focus:ring-yellow-400 focus:border-yellow-400'
                  : 'border-[#FCF8DD]/20'
              }`}
              placeholder={tokenUsage?.level === 'danger' ? 'Token limit nearly reached - keep messages short...' : 'type your message here...'}
              value={input}
              onChange={handleInputChange}
              onKeyDown={onKeyDown}
              rows={1}
            />

            {isTyping ? (
              <button
                className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-xl transition-colors duration-200 flex-shrink-0"
                onClick={stopGeneration}
                title="Stop generation"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <rect x="6" y="6" width="12" height="12" />
                </svg>
              </button>
            ) : (
              <button
                className={`p-4 rounded-xl transition-all duration-200 flex-shrink-0 ${
                  input.trim() 
                    ? "bg-[#FCF8DD] hover:bg-[#FCF8DD]/90 text-[#112f5e]" 
                    : "bg-[#FCF8DD]/20 text-[#FCF8DD]/40 cursor-not-allowed"
                }`}
                onClick={send}
                disabled={!input.trim()}
                title="Send message"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default CustomChat;