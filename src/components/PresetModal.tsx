import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import { PresetConfig } from '../types';
import { themePresets } from '../utils/presets';
import { isFormValid } from '../utils/validation';

interface PresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (preset: PresetConfig) => void;
  editingPreset?: PresetConfig | null;
}

const PresetModal: React.FC<PresetModalProps> = ({ isOpen, onClose, onSave, editingPreset }) => {
  const [formData, setFormData] = useState<Omit<PresetConfig, 'id'>>({
    title: '',
    subtitle: '',
    icon: 'code',
    systemPrompt: '',
    theme: themePresets[0],
    isCustom: true,
  });

  useEffect(() => {
    if (editingPreset) {
      setFormData({
        title: editingPreset.title,
        subtitle: editingPreset.subtitle,
        icon: editingPreset.icon,
        systemPrompt: editingPreset.systemPrompt,
        theme: editingPreset.theme,
        isCustom: editingPreset.isCustom,
      });
    } else {
      setFormData({
        title: '',
        subtitle: '',
        icon: 'code',
        systemPrompt: '',
        theme: themePresets[0],
        isCustom: true,
      });
    }
  }, [editingPreset, isOpen]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid(formData.title, formData.systemPrompt)) return;

    const preset: PresetConfig = {
      id: editingPreset?.id || `custom_${Date.now()}`,
      ...formData,
    };

    onSave(preset);
    onClose();
  };

  const selectTheme = (theme: typeof themePresets[0]) => {
    setFormData(prev => ({ ...prev, theme }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#112f5e] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[#FCF8DD]/20">
        <div className="sticky top-0 bg-[#112f5e] border-b border-[#FCF8DD]/20 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-[#FCF8DD]">
              {editingPreset ? 'Edit Preset' : 'Create New Preset'}
            </h2>
            <div 
              className="w-6 h-6 rounded-lg border-2 border-[#FCF8DD]/30"
              style={{ background: formData.theme.gradient }}
              title="Selected theme"
            />
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#FCF8DD]/10 rounded-lg transition-colors"
          >
            <FaTimes className="text-[#FCF8DD]/70 hover:text-[#FCF8DD]" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[#FCF8DD]/90 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-[#FCF8DD]/30 rounded-lg focus:ring-2 focus:ring-[#FCF8DD]/50 focus:border-[#FCF8DD] outline-none bg-[#0d2549] text-[#FCF8DD] placeholder-[#FCF8DD]/60"
                placeholder="e.g., Python Security Scanner"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#FCF8DD]/90 mb-2">
                Subtitle
              </label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                className="w-full px-3 py-2 border border-[#FCF8DD]/30 rounded-lg focus:ring-2 focus:ring-[#FCF8DD]/50 focus:border-[#FCF8DD] outline-none bg-[#0d2549] text-[#FCF8DD] placeholder-[#FCF8DD]/60"
                placeholder="Brief description of the scanner"
              />
            </div>
          </div>


          <div>
            <label className="block text-sm font-medium text-[#FCF8DD]/90 mb-2">
              Color Theme
            </label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {themePresets.map((theme) => (
                <button
                  key={theme.name}
                  type="button"
                  onClick={() => selectTheme(theme)}
                  className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                    formData.theme.primary === theme.primary
                      ? 'border-[#FCF8DD] bg-[#FCF8DD]/10 shadow-lg'
                      : 'border-[#FCF8DD]/30 hover:border-[#FCF8DD]/50'
                  }`}
                >
                  <div 
                    className="w-10 h-10 rounded-lg mx-auto mb-2 shadow-sm"
                    style={{ background: theme.gradient }}
                  />
                  <div className="text-xs text-[#FCF8DD]/80 font-medium">{theme.name}</div>
                </button>
              ))}
            </div>
          </div>


          <div>
            <label className="block text-sm font-medium text-[#FCF8DD]/90 mb-2">
              System Prompt *
            </label>
            <textarea
              value={formData.systemPrompt}
              onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
              className="w-full px-3 py-2 border border-[#FCF8DD]/30 rounded-lg focus:ring-2 focus:ring-[#FCF8DD]/50 focus:border-[#FCF8DD] outline-none bg-[#0d2549] text-[#FCF8DD] placeholder-[#FCF8DD]/60 min-h-[120px] scrollbar-thin scrollbar-track-[#0d2549] scrollbar-thumb-[#FCF8DD]/30 hover:scrollbar-thumb-[#FCF8DD]/50 resize-y"
              placeholder="Enter the system prompt that will guide the AI's behavior for this preset..."
              required
            />
            <p className="text-sm text-[#FCF8DD]/60 mt-1">
              This prompt will instruct the AI on how to behave for this specific preset.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#FCF8DD]/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[#FCF8DD]/80 bg-[#FCF8DD]/10 hover:bg-[#FCF8DD]/20 rounded-lg transition-colors border border-[#FCF8DD]/20 hover:border-[#FCF8DD]/30"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#FCF8DD] hover:bg-[#FCF8DD]/90 text-[#112f5e] rounded-lg transition-colors font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!isFormValid(formData.title, formData.systemPrompt)}
            >
              {editingPreset ? 'Update Preset' : 'Create Preset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PresetModal;