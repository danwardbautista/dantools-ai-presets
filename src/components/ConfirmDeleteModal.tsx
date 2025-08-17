import React from 'react';
import { FaTimes, FaExclamationTriangle, FaTrash } from 'react-icons/fa';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  isDestructive?: boolean;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Delete",
  isDestructive = true 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#112f5e] rounded-2xl shadow-2xl w-full max-w-md border border-[#FCF8DD]/20">
        <div className="sticky top-0 bg-[#112f5e] border-b border-[#FCF8DD]/20 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isDestructive ? 'bg-red-500/20' : 'bg-[#FCF8DD]/20'
            }`}>
              <FaExclamationTriangle className={isDestructive ? 'text-red-400' : 'text-[#FCF8DD]/80'} />
            </div>
            <h2 className={`text-xl font-bold ${isDestructive ? 'text-red-300' : 'text-[#FCF8DD]'}`}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#FCF8DD]/10 rounded-lg transition-colors"
          >
            <FaTimes className="text-[#FCF8DD]/70 hover:text-[#FCF8DD]" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isDestructive ? 'bg-red-500/20' : 'bg-[#FCF8DD]/20'
            }`}>
              <FaTrash className={`text-2xl ${isDestructive ? 'text-red-400' : 'text-[#FCF8DD]/80'}`} />
            </div>
            <p className="text-[#FCF8DD]/80 text-sm leading-relaxed">
              {message}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[#FCF8DD]/80 bg-[#FCF8DD]/10 hover:bg-[#FCF8DD]/20 rounded-lg transition-colors border border-[#FCF8DD]/20 hover:border-[#FCF8DD]/30"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`px-6 py-2 rounded-lg transition-colors font-medium shadow-lg hover:shadow-xl ${
                isDestructive
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-[#FCF8DD] hover:bg-[#FCF8DD]/90 text-[#112f5e]'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;