import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FaSearch, FaComments, FaCopy, FaCheck } from "react-icons/fa";
import 'katex/dist/katex.min.css';
import { ChatMessage, PresetConfig } from '../types';
import { openai, sanitizeInput } from '../utils/openai';
import { adjustTextareaHeight } from '../utils/dom';

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
      <code className="bg-black/20 text-current px-2 py-1 rounded text-sm font-mono border border-current/20">
        {children}
      </code>
    );
  }

  return (
    <div className="relative group">
      <button
        onClick={copyToClipboard}
        className="absolute top-3 right-3 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-2"
        title={copied ? "Copied!" : "Copy code"}
      >
        {copied ? (
          <>
            <FaCheck className="text-green-400 text-sm" />
            <span className="text-xs">Copied!</span>
          </>
        ) : (
          <>
            <FaCopy className="text-sm" />
            <span className="text-xs">Copy</span>
          </>
        )}
      </button>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language || 'text'}
        PreTag="div"
        customStyle={{
          margin: '12px 0',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          borderRadius: '12px',
          padding: '16px',
          paddingRight: '60px',
          background: 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)',
          fontSize: '14px',
          lineHeight: '1.6'
        }}
      >
        {children.replace(/\n$/, "")}
      </SyntaxHighlighter>
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
      <ul className="list-disc list-inside my-3 space-y-1" {...props}>
        {children}
      </ul>
    );
  },
  ol({ children, ...props }: React.ComponentProps<'ol'>) {
    return (
      <ol className="list-decimal list-inside my-3 space-y-1" {...props}>
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
  const chatFeedRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    if (chatFeedRef.current) {
      const chatFeed = chatFeedRef.current;
      const isScrolledToBottom = chatFeed.scrollHeight - chatFeed.scrollTop <= chatFeed.clientHeight + 100;
      
      if (isScrolledToBottom) {
        chatFeed.scrollTop = chatFeed.scrollHeight;
      }
    }
  }, [messages, isTyping, streamingMessage]);

  // force scroll to bottom when opening a chat )
  useEffect(() => {
    if (chatFeedRef.current) {
      const chatFeed = chatFeedRef.current;
      setTimeout(() => {
        chatFeed.scrollTop = chatFeed.scrollHeight;
      }, 50);
    }
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

    const controller = new AbortController();
    setAbortController(controller);

    // build conversation context with system prompt + message history
    const conversationPayload = [
      systemPrompt,
      ...messages.map((msg) => ({
        role: msg.sender === "user" ? "user" as const : "assistant" as const,
        content: msg.message,
      })),
      { role: "user" as const, content: cleanInput },
    ];

    try {
      const stream = await openai.chat.completions.create({
        model: "gpt-4.1",
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
      }
    } catch (e: unknown) {
      // api call failed
      if (e instanceof Error && e.name !== 'AbortError') {
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            message: "something went wrong, try again",
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
        <div className="bg-[#112f5e] border-b border-[#FCF8DD]/10 px-6 py-4">
          <div className="flex flex-col">
            <span className="text-lg font-medium text-[#FCF8DD]">
              {conversationTitle || presetConfig.title}
            </span>
            <span className="text-sm text-[#FCF8DD]/50 mt-1">
              {presetConfig.model || 'gpt-4.1'} • {presetConfig.title}
            </span>
          </div>
        </div>

      <div 
        className="flex-1 overflow-y-auto px-4 py-6 chat-scroll scrollbar-thin scrollbar-track-[#0d2549] scrollbar-thumb-[#FCF8DD]/30 hover:scrollbar-thumb-[#FCF8DD]/50" 
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
                className={`max-w-3xl ${
                  msg.sender === "user"
                    ? "bg-[#FCF8DD] text-[#112f5e] shadow-sm border border-[#FCF8DD]/20 rounded-lg px-3 py-3 leading-none [&_p]:my-0"
                    : "text-[#FCF8DD] text-base leading-relaxed"
                }`}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  skipHtml={true}
                  components={markdownComponents}
                >
                  {msg.message}
                </ReactMarkdown>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start mb-4">
              <div className="max-w-3xl text-[#FCF8DD] text-base leading-relaxed">
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
          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              className="flex-1 resize-none border border-[#FCF8DD]/20 rounded-2xl px-6 py-5 focus:ring-2 focus:ring-[#FCF8DD] focus:border-[#FCF8DD] outline-none transition-all duration-200 max-h-48 bg-[#0d2549] text-[#FCF8DD] placeholder-[#FCF8DD]/60 text-lg leading-normal min-h-[60px] scrollbar-thin scrollbar-track-[#0d2549] scrollbar-thumb-[#FCF8DD]/30 hover:scrollbar-thumb-[#FCF8DD]/50"
              placeholder="type your message here..."
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