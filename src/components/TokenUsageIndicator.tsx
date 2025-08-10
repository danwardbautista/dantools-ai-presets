import React from 'react';
import { FaExclamationTriangle, FaInfoCircle, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { TokenUsage, formatTokenUsage, getTokenLevelMessage, getTokenLevelStyles } from '../utils/tokenManager';

interface TokenUsageIndicatorProps {
  usage: TokenUsage;
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

const TokenUsageIndicator: React.FC<TokenUsageIndicatorProps> = ({ 
  usage, 
  className = '',
  showDetails = false,
  compact = false
}) => {
  const styles = getTokenLevelStyles(usage.level);
  const percentage = Math.round(usage.percentage * 100);
  
  const getIcon = () => {
    switch (usage.level) {
      case 'safe':
        return <FaCheckCircle className="text-sm" />;
      case 'info':
        return <FaInfoCircle className="text-sm" />;
      case 'warning':
        return <FaExclamationTriangle className="text-sm" />;
      case 'danger':
        return <FaTimesCircle className="text-sm" />;
      default:
        return <FaInfoCircle className="text-sm" />;
    }
  };

  const getBarColor = () => {
    switch (usage.level) {
      case 'safe':
        return 'bg-green-400';
      case 'info':
        return 'bg-blue-400';
      case 'warning':
        return 'bg-yellow-400';
      case 'danger':
        return 'bg-red-400';
      default:
        return 'bg-gray-400';
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-md border ${styles.bg} ${styles.border}`}>
          <span className={styles.text}>
            {getIcon()}
          </span>
          <span className={`text-xs font-medium ${styles.text}`}>
            {percentage}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.bg} ${styles.border} border rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={styles.text}>
            {getIcon()}
          </span>
          <span className={`text-sm font-medium ${styles.text}`}>
            Token Usage
          </span>
        </div>
        <span className={`text-xs font-mono ${styles.text}`}>
          {percentage}%
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-black/20 rounded-full h-2 mb-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${getBarColor()}`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
      
      {showDetails && (
        <div className="space-y-1">
          <div className={`text-xs ${styles.text}`}>
            {formatTokenUsage(usage)}
          </div>
          <div className={`text-xs ${styles.text} opacity-80`}>
            {getTokenLevelMessage(usage.level)}
          </div>
          {usage.remaining < 1000 && (
            <div className="text-xs text-orange-400">
              Only {usage.remaining.toLocaleString()} tokens remaining
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TokenUsageIndicator;