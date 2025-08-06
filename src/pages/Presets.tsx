import React, { useState, useEffect } from "react";
import { FaUndo, FaEdit, FaPlus, FaTrash } from "react-icons/fa";
import PresetModal from "../components/PresetModal";
import { PresetConfig } from '../types';
import { defaultPresets } from '../utils/presets';
import { loadFromStorage, saveToStorage, removeFromStorage, clearStorageByPattern, saveToStorageWithEvent } from '../utils/localStorage';

const Presets: React.FC = () => {
  const [presets, setPresets] = useState<PresetConfig[]>(defaultPresets);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [editingPreset, setEditingPreset] = useState<PresetConfig | null>(null);

  useEffect(() => {
    const savedPresets = loadFromStorage('dantools-presets', defaultPresets);
    setPresets(savedPresets);
  }, []);

  // saves presets and triggers update event for other components
  const savePresetsToStorage = (newPresets: PresetConfig[]) => {
    saveToStorageWithEvent('dantools-presets', newPresets, 'presetsUpdated');
    setPresets(newPresets);
  };

  const savePreset = (preset: PresetConfig) => {
    const newPresets = editingPreset 
      ? presets.map(p => p.id === preset.id ? preset : p)
      : [...presets, preset];
    savePresetsToStorage(newPresets);
    setEditingPreset(null);
  };

  const editPreset = (preset: PresetConfig) => {
    setEditingPreset(preset);
    setShowPresetModal(true);
  };

  const deletePreset = (presetId: string) => {
    if (window.confirm('Are you sure you want to delete this preset? This will also remove all conversations associated with it.')) {
      const newPresets = presets.filter(p => p.id !== presetId);
      savePresetsToStorage(newPresets);
      
      // Clear conversations for deleted preset
      removeFromStorage(`dantools-conversations-${presetId}`);
    }
  };

  // wipes all custom presets and conversations, returns to defaults
  const resetToDefaults = () => {
    if (window.confirm('Are you sure you want to reset all presets to defaults? This will remove all custom presets and their conversations.')) {
      savePresetsToStorage(defaultPresets);
      
      // Clear all custom conversations
      clearStorageByPattern('dantools-conversations-');
      
      // Re-save default conversations if they exist
      const defaultIds = defaultPresets.map(p => p.id);
      defaultIds.forEach(id => {
        const existing = loadFromStorage(`dantools-conversations-${id}`, []);
        if (existing.length > 0) {
          saveToStorage(`dantools-conversations-${id}`, existing);
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0d2549] p-8">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#FCF8DD] mb-2">Chat Presets</h1>
            <p className="text-lg text-[#FCF8DD]/70">Create and manage your AI assistant configurations</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setEditingPreset(null);
                setShowPresetModal(true);
              }}
              className="bg-[#FCF8DD] hover:bg-[#FCF8DD]/90 text-[#112f5e] px-6 py-3 rounded-lg transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <FaPlus className="text-sm" />
              Create New Preset
            </button>
            <button
              onClick={resetToDefaults}
              className="bg-[#FCF8DD]/10 hover:bg-[#FCF8DD]/20 text-[#FCF8DD] px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-2 border border-[#FCF8DD]/30 hover:border-[#FCF8DD]/50"
            >
              <FaUndo className="text-xs" />
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>

      {/* Presets Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="group bg-[#112f5e] rounded-xl border border-[#FCF8DD]/20 hover:border-[#FCF8DD]/40 transition-all duration-300 overflow-hidden"
            >
              {/* Color Header */}
              <div 
                className="h-2 w-full"
                style={{ background: preset.theme.gradient }}
              />
              
              {/* Card Content */}
              <div className="p-4 pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-lg font-bold text-[#FCF8DD] leading-tight">{preset.title}</h3>
                  {preset.isCustom && (
                    <span className="bg-[#FCF8DD]/20 text-[#FCF8DD] text-xs px-2 py-1 rounded-full font-medium flex-shrink-0">
                      Custom
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#FCF8DD]/70 leading-relaxed">{preset.subtitle}</p>
              </div>

              {/* System Prompt Preview */}
              <div className="px-4 pb-3">
                <div className="bg-[#0d2549] rounded-lg p-3 border border-[#FCF8DD]/10">
                  <div className="text-xs font-semibold text-[#FCF8DD]/60 mb-1 uppercase tracking-wider">
                    System Prompt Preview
                  </div>
                  <div className="text-xs text-[#FCF8DD]/80 font-mono leading-relaxed max-h-12 overflow-hidden relative">
                    {preset.systemPrompt.substring(0, 100)}...
                    <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-[#0d2549] to-transparent"></div>
                  </div>
                </div>
              </div>


              {/* Action Buttons */}
              <div className="px-4 pb-4 pt-1">
                <div className="flex gap-2">
                  <button
                    onClick={() => editPreset(preset)}
                    className="flex-1 bg-[#FCF8DD]/10 hover:bg-[#FCF8DD]/20 text-[#FCF8DD] px-3 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium border border-[#FCF8DD]/20 hover:border-[#FCF8DD]/30"
                  >
                    <FaEdit className="text-xs" />
                    Edit
                  </button>
                  {preset.isCustom && (
                    <button
                      onClick={() => deletePreset(preset.id)}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 px-3 py-2 rounded-lg transition-all duration-200 flex items-center justify-center border border-red-500/30 hover:border-red-500/50"
                    >
                      <FaTrash className="text-xs" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {presets.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#FCF8DD]/10 rounded-xl flex items-center justify-center">
              <FaPlus className="text-2xl text-[#FCF8DD]/40" />
            </div>
            <h3 className="text-xl font-bold text-[#FCF8DD] mb-2">No Presets Found</h3>
            <p className="text-[#FCF8DD]/70 mb-6 max-w-md mx-auto">
              Get started by creating your first chat preset to customize your AI assistant experience.
            </p>
            <button
              onClick={() => {
                setEditingPreset(null);
                setShowPresetModal(true);
              }}
              className="bg-[#FCF8DD] hover:bg-[#FCF8DD]/90 text-[#112f5e] px-6 py-3 rounded-lg transition-all duration-200 flex items-center gap-2 font-medium mx-auto"
            >
              <FaPlus />
              Create Your First Preset
            </button>
          </div>
        )}
      </div>

      <PresetModal
        isOpen={showPresetModal}
        onClose={() => {
          setShowPresetModal(false);
          setEditingPreset(null);
        }}
        onSave={savePreset}
        editingPreset={editingPreset}
      />
    </div>
  );
};

export default Presets;