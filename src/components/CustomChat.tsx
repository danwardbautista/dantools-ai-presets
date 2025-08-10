import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FaSearch, FaComments, FaCopy, FaCheck, FaExclamationTriangle } from "react-icons/fa";
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

const CodeBlock: React.FC<{ children: string; language?: string; isInline?: boolean }> = ({ 
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
};

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

// main chat interface component - handles message display and user input
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

  const systemPrompt = {
    role: "system" as const,
    content: customSystemPrompt || presetConfig?.systemPrompt || "You are a helpful AI assistant.",
  };

  // update token usage whenever messages or input changes
  useEffect(() => {
    const currentMessages = optimizedMessages.length > 0 ? optimizedMessages : messages;
    const currentModel = presetConfig?.model || "gpt-4.1";
    const systemContent = systemPrompt.content;
    
    const estimatedTokens = calculateConversationTokens(currentMessages, systemContent, input);
    const usage = getTokenUsage(estimatedTokens, currentModel);
    
    setTokenUsage(usage);
    
    // show warning if usage is high
    setShowTokenWarning(usage.level === 'warning' || usage.level === 'danger');
  }, [messages, input, customSystemPrompt, presetConfig, optimizedMessages]);

  // Handle scroll behavior detection
  useEffect(() => {
    const chatFeed = chatFeedRef.current;
    if (!chatFeed) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = chatFeed;
      const scrollThreshold = 100;
      const nearBottom = scrollHeight - scrollTop - clientHeight <= scrollThreshold;
      
      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Only update state after user stops scrolling to avoid conflicts
      scrollTimeoutRef.current = setTimeout(() => {
        // If user manually scrolled up during streaming, remember this
        // More sensitive detection: even small upward scrolls count
        if (streamingMessage && scrollTop < lastScrollTop - 10 && !nearBottom) {
          setUserScrolledUp(true);
        }
        
        // If user scrolled back near bottom, allow auto-scroll again
        if (nearBottom && userScrolledUp) {
          setUserScrolledUp(false);
        }
        
        setLastScrollTop(scrollTop);
      }, 50); // Even faster response to user input
    };

    chatFeed.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      chatFeed.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [streamingMessage, userScrolledUp, lastScrollTop]);

  // Smooth auto-scroll logic (non-streaming)
  useEffect(() => {
    const chatFeed = chatFeedRef.current;
    if (!chatFeed) return;

    // For non-streaming messages, scroll to bottom with smooth animation
    if (!streamingMessage) {
      const timeout = setTimeout(() => {
        if (chatFeed) {
          const targetScrollTop = chatFeed.scrollHeight - chatFeed.clientHeight;
          const currentScrollTop = chatFeed.scrollTop;
          const difference = targetScrollTop - currentScrollTop;
          
          // Use smooth scrolling for reasonable distances
          if (Math.abs(difference) < 800) {
            chatFeed.scrollTo({
              top: targetScrollTop,
              behavior: 'smooth'
            });
          } else {
            // For large jumps (new conversations), scroll immediately
            chatFeed.scrollTop = targetScrollTop;
          }
        }
      }, 100);
      
      return () => clearTimeout(timeout);
    }
  }, [messages, streamingMessage]);

  // Streaming scroll following with smooth animation
  useEffect(() => {
    const chatFeed = chatFeedRef.current;
    if (!chatFeed || !streamingMessage) {
      // Clear animation when streaming stops
      if (streamingScrollRef.current) {
        clearInterval(streamingScrollRef.current);
        streamingScrollRef.current = null;
      }
      return;
    }

    // Only start animation if user hasn't scrolled up
    if (!userScrolledUp && !streamingScrollRef.current) {
      streamingScrollRef.current = window.setInterval(() => {
        if (chatFeed && streamingMessage && !userScrolledUp) {
          const targetScrollTop = chatFeed.scrollHeight - chatFeed.clientHeight;
          const currentScrollTop = chatFeed.scrollTop;
          const difference = targetScrollTop - currentScrollTop;
          
          // Follow new content with balanced aggression
          if (difference > 3) {
            const increment = Math.max(difference * 0.3, 8); // Moderate following
            chatFeed.scrollTop = Math.min(currentScrollTop + increment, targetScrollTop);
          } else if (difference > 0) {
            // Gentle final approach to bottom
            chatFeed.scrollTop = targetScrollTop;
          }
        } else if (!streamingMessage) {
          // Clear interval when streaming ends
          if (streamingScrollRef.current) {
            clearInterval(streamingScrollRef.current);
            streamingScrollRef.current = null;
          }
        }
      }, 40); // Less frequent updates to give user control time
    }

    return () => {
      if (streamingScrollRef.current) {
        clearInterval(streamingScrollRef.current);
        streamingScrollRef.current = null;
      }
    };
  }, [streamingMessage, userScrolledUp]);

  // Removed duplicate scroll mechanism to avoid conflicts

  // force scroll to bottom when opening a chat and reset optimization
  useEffect(() => {
    if (chatFeedRef.current) {
      const chatFeed = chatFeedRef.current;
      setTimeout(() => {
        chatFeed.scrollTop = chatFeed.scrollHeight;
      }, 50);
    }
    // Reset optimized messages and scroll state when switching scanners
    setOptimizedMessages([]);
    setUserScrolledUp(false);
    setLastScrollTop(0);
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

  // show loading or error if config not loaded
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

  // abort current api request and save partial response
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

  // sends user message to openai and streams response
  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isTyping) return;

    const cleanInput = sanitizeInput(textToSend);
    const userMsg: ChatMessage = { sender: "user", message: cleanInput };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setIsGenerating(true);
    setStreamingMessage("");
    // Reset scroll state for new conversation
    setUserScrolledUp(false);
    setLastScrollTop(0);

    const controller = new AbortController();
    setAbortController(controller);

    // determine which messages to use (optimized or original)
    let messagesToUse = optimizedMessages.length > 0 ? optimizedMessages : messages;
    
    // check if we need to optimize the conversation before sending
    const currentModel = presetConfig?.model || "gpt-4.1";
    if (shouldOptimizeConversation([...messagesToUse, { sender: "user", message: cleanInput }], systemPrompt.content, currentModel)) {
      try {
        const optimized = await optimizeConversation([...messagesToUse, { sender: "user", message: cleanInput }], systemPrompt.content, currentModel);
        messagesToUse = optimized.slice(0, -1); // Remove the input message we just added
        setOptimizedMessages(messagesToUse);
        
        // Show notification that conversation was optimized
        setMessages((prev) => [
          ...prev,
          { sender: "bot", message: "*Conversation optimized to manage token usage. Some older messages have been summarized.*" },
        ]);
      } catch (error) {
        console.warn('Failed to optimize conversation, using truncation:', error);
        messagesToUse = truncateConversation([...messagesToUse, { sender: "user", message: cleanInput }], systemPrompt.content, currentModel).slice(0, -1);
        setOptimizedMessages(messagesToUse);
      }
    }
    
    // build conversation context with system prompt + message history
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

      // stream response chunks and update ui in real time
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
        setMessages((prev) => [
          ...prev,
          { sender: "bot", message: fullResponse },
        ]);
        setStreamingMessage("");
        
        // clear optimized messages after successful response
        // this ensures the full conversation history is preserved
        if (optimizedMessages.length > 0) {
          setOptimizedMessages([]);
        }
      }
    } catch (e: unknown) {
      // api call failed
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
          // Trigger conversation optimization
          try {
            const optimized = truncateConversation(messages, systemPrompt.content, presetConfig?.model || "gpt-4.1");
            setOptimizedMessages(optimized);
          } catch (optError) {
            console.warn('Failed to optimize conversation:', optError);
          }
        }
        
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            message: errorMessage,
          },
        ]);
      }
    } finally {
      setIsTyping(false);
      setIsGenerating(false);
      setAbortController(null);
      setStreamingMessage("");
    }
  };

  const send = () => {
    sendMessage();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };


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
        className="flex-1 overflow-y-auto px-2 md:px-4 py-6 chat-scroll scrollbar-thin" 
        ref={chatFeedRef}
      >
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
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
          )}
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              } mb-4`}
            >
              <div
                className={`${
                  msg.sender === "user"
                    ? "max-w-3xl w-auto bg-[#FCF8DD] text-[#112f5e] shadow-sm border border-[#FCF8DD]/20 rounded-lg px-3 py-3 leading-relaxed whitespace-pre-wrap"
                    : "max-w-4xl w-full md:w-auto text-[#FCF8DD] text-base leading-relaxed px-3 md:px-6 overflow-hidden markdown-content"
                }`}
              >
                {msg.sender === "user" ? (
                  <div className="whitespace-pre-wrap">{msg.message}</div>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    skipHtml={true}
                    components={markdownComponents}
                  >
                    {msg.message}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}

          {/* Token warning banner */}
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
                <div className="mt-2">
                  <TokenUsageIndicator usage={tokenUsage} showDetails={true} compact={false} />
                </div>
              </div>
            </div>
          )}

          {/* Optimization notice */}
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
              className={`flex-1 resize-none border rounded-2xl px-6 py-5 focus:ring-2 focus:ring-[#FCF8DD] focus:border-[#FCF8DD] outline-none transition-all duration-200 max-h-48 bg-[#0d2549] text-[#FCF8DD] placeholder-[#FCF8DD]/60 text-lg leading-normal min-h-[60px] scrollbar-thin ${
                tokenUsage?.level === 'danger' 
                  ? 'border-red-500/50 focus:ring-red-400 focus:border-red-400' 
                  : tokenUsage?.level === 'warning'
                  ? 'border-yellow-500/50 focus:ring-yellow-400 focus:border-yellow-400'
                  : 'border-[#FCF8DD]/20'
              }`}
              placeholder={tokenUsage?.level === 'danger' ? 'Token limit nearly reached - keep messages short...' : 'type your message here...'}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustTextareaHeight(textareaRef.current);
              }}
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