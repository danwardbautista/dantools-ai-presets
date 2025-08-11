import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChatMessage } from '../types';

interface VirtualMessageListProps {
  messages: ChatMessage[];
  renderMessage: (message: ChatMessage, index: number) => React.ReactNode;
  containerHeight: number;
  estimatedItemHeight: number;
  overscan?: number;
}

const VirtualMessageList: React.FC<VirtualMessageListProps> = ({
  messages,
  renderMessage,
  containerHeight,
  estimatedItemHeight,
  overscan = 5
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  // const [heights, setHeights] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const heightCache = useRef<Map<number, number>>(new Map());

  // only virtualize if lots of messages
  const shouldVirtualize = messages.length > 50;

  // figure out what messages to show
  const visibleRange = useMemo(() => {
    if (!shouldVirtualize) {
      return { start: 0, end: messages.length };
    }

    let startIndex = 0;
    let accumulatedHeight = 0;
    
    for (let i = 0; i < messages.length; i++) {
      const height = heightCache.current.get(i) || estimatedItemHeight;
      if (accumulatedHeight + height > scrollTop) {
        startIndex = Math.max(0, i - overscan);
        break;
      }
      accumulatedHeight += height;
    }

    let endIndex = messages.length - 1;
    accumulatedHeight = 0;
    
    for (let i = startIndex; i < messages.length; i++) {
      const height = heightCache.current.get(i) || estimatedItemHeight;
      accumulatedHeight += height;
      if (accumulatedHeight > containerHeight + overscan * estimatedItemHeight) {
        endIndex = Math.min(messages.length - 1, i + overscan);
        break;
      }
    }

    return { start: startIndex, end: endIndex };
  }, [scrollTop, messages.length, containerHeight, estimatedItemHeight, overscan, shouldVirtualize]);

  // calculate heights and positioning
  const { totalHeight, offsetY } = useMemo(() => {
    if (!shouldVirtualize) {
      return { totalHeight: 0, offsetY: 0 };
    }

    let total = 0;
    let offset = 0;
    
    for (let i = 0; i < messages.length; i++) {
      const height = heightCache.current.get(i) || estimatedItemHeight;
      if (i < visibleRange.start) {
        offset += height;
      }
      total += height;
    }
    
    return { totalHeight: total, offsetY: offset };
  }, [messages.length, visibleRange.start, estimatedItemHeight, shouldVirtualize]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // update cached heights when messages change
  useEffect(() => {
    if (!shouldVirtualize) return;

    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const index = parseInt(entry.target.getAttribute('data-index') || '0');
        const height = entry.contentRect.height;
        heightCache.current.set(index, height);
      });
    });

    const items = container.querySelectorAll('[data-index]');
    items.forEach((item) => resizeObserver.observe(item));

    return () => {
      resizeObserver.disconnect();
    };
  }, [visibleRange, shouldVirtualize]);

  if (!shouldVirtualize) {
    // show all messages if not many
    return (
      <div ref={containerRef} onScroll={handleScroll} className="h-full overflow-y-auto">
        {messages.map((message, index) => (
          <div key={`msg-${index}`} data-index={index}>
            {renderMessage(message, index)}
          </div>
        ))}
      </div>
    );
  }

  // show only visible messages for big lists
  const visibleMessages = [];
  for (let i = visibleRange.start; i <= Math.min(visibleRange.end, messages.length - 1); i++) {
    visibleMessages.push(
      <div key={`msg-${i}`} data-index={i} style={{ minHeight: estimatedItemHeight }}>
        {renderMessage(messages[i], i)}
      </div>
    );
  }

  return (
    <div ref={containerRef} onScroll={handleScroll} className="h-full overflow-y-auto">
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleMessages}
        </div>
      </div>
    </div>
  );
};

export default VirtualMessageList;