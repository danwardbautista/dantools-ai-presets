import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import { PresetConfig } from '../types';
import { themePresets, gptModelOptions } from '../utils/presets';
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
    model: gptModelOptions[0].value,
    temperature: 0.7,
    theme: themePresets[0],
    isCustom: true,
  });

  const [isCustomColor, setIsCustomColor] = useState(false);
  const [customColor, setCustomColor] = useState('#3B82F6');

  // make theme colors from one color
  const generateThemeFromColor = (color: string) => {
    // convert hex to numbers
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // make lighter version
    const lighterR = Math.min(255, r + 40);
    const lighterG = Math.min(255, g + 40);
    const lighterB = Math.min(255, b + 40);
    const secondary = `rgb(${lighterR}, ${lighterG}, ${lighterB})`;
    
    // make even lighter accent
    const accentR = Math.min(255, r + 100);
    const accentG = Math.min(255, g + 100);
    const accentB = Math.min(255, b + 100);
    const accent = `rgb(${accentR}, ${accentG}, ${accentB})`;
    
    return {
      primary: color,
      secondary: secondary,
      accent: accent,
      gradient: `linear-gradient(135deg, ${color} 0%, ${secondary} 100%)`
    };
  };

  useEffect(() => {
    if (editingPreset) {
      setFormData({
        title: editingPreset.title,
        subtitle: editingPreset.subtitle,
        icon: editingPreset.icon,
        systemPrompt: editingPreset.systemPrompt,
        model: editingPreset.model || gptModelOptions[0].value,
        temperature: editingPreset.temperature || 0.7,
        theme: editingPreset.theme,
        isCustom: editingPreset.isCustom,
      });
      
      // figure out if using custom color
      const isPresetTheme = themePresets.some(preset => preset.primary === editingPreset.theme.primary);
      setIsCustomColor(!isPresetTheme);
      if (!isPresetTheme) {
        setCustomColor(editingPreset.theme.primary);
      }
    } else {
      setFormData({
        title: '',
        subtitle: '',
        icon: 'code',
        systemPrompt: '',
        model: gptModelOptions[0].value,
        temperature: 0.7,
        theme: themePresets[0],
        isCustom: true,
      });
      setIsCustomColor(false);
      setCustomColor('#3B82F6');
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
    setIsCustomColor(false);
  };

  const selectCustomColor = () => {
    setIsCustomColor(true);
    const customTheme = generateThemeFromColor(customColor);
    setFormData(prev => ({ ...prev, theme: customTheme }));
  };

  const handleColorChange = (color: string) => {
    setCustomColor(color);
    const customTheme = generateThemeFromColor(color);
    setFormData(prev => ({ ...prev, theme: customTheme }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#112f5e] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[#FCF8DD]/20 scrollbar-thin scrollbar-track-[#0d2549] scrollbar-thumb-[#FCF8DD]/30 hover:scrollbar-thumb-[#FCF8DD]/50">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[#FCF8DD]/90 mb-2">
                GPT Model *
              </label>
              <select
                value={formData.model}
                onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                className="w-full px-3 py-2 border border-[#FCF8DD]/30 rounded-lg focus:ring-2 focus:ring-[#FCF8DD]/50 focus:border-[#FCF8DD] outline-none bg-[#0d2549] text-[#FCF8DD] cursor-pointer"
                required
              >
                {gptModelOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-[#0d2549] text-[#FCF8DD]">
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-[#FCF8DD]/60 mt-1">
                Choose the GPT model for this preset.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#FCF8DD]/90 mb-2">
                Temperature
              </label>
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-[#FCF8DD]/30 rounded-lg focus:ring-2 focus:ring-[#FCF8DD]/50 focus:border-[#FCF8DD] outline-none bg-[#0d2549] text-[#FCF8DD]"
              />
              <p className="text-sm text-[#FCF8DD]/60 mt-1">
                Controls randomness. 0.0-0.3: focused, 0.4-0.7: balanced, 0.8-1.0: creative.
              </p>
            </div>
          </div>


          <div>
            <label className="block text-sm font-medium text-[#FCF8DD]/90 mb-2">
              Color Theme
            </label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
              {themePresets.map((theme) => (
                <button
                  key={theme.name}
                  type="button"
                  onClick={() => selectTheme(theme)}
                  className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                    !isCustomColor && formData.theme.primary === theme.primary
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
            
            {/* custom color picker */}
            <div className="border-t border-[#FCF8DD]/20 pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-[#FCF8DD]/90">Custom Color</span>
                <button
                  type="button"
                  onClick={selectCustomColor}
                  className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                    isCustomColor
                      ? 'bg-[#FCF8DD] text-[#112f5e] font-medium'
                      : 'bg-[#FCF8DD]/20 text-[#FCF8DD]/80 hover:bg-[#FCF8DD]/30'
                  }`}
                >
                  {isCustomColor ? 'Selected' : 'Use Custom'}
                </button>
              </div>
              
              {isCustomColor && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="w-12 h-12 rounded-lg border-2 border-[#FCF8DD]/30 cursor-pointer bg-transparent"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs text-[#FCF8DD]/70 mb-1">Color Value</span>
                      <input
                        type="text"
                        value={customColor}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="w-20 px-2 py-1 text-xs border border-[#FCF8DD]/30 rounded bg-[#0d2549] text-[#FCF8DD] font-mono"
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-[#FCF8DD]/70 mb-1">Preview</div>
                    <div 
                      className="w-full h-8 rounded-lg border border-[#FCF8DD]/20"
                      style={{ background: formData.theme.gradient }}
                    />
                  </div>
                </div>
              )}
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