import React, { useState, useEffect } from "react";
import { FaEdit, FaPlus, FaTrash, FaExclamationTriangle, FaTimes, FaStar } from "react-icons/fa";
import PresetModal from "../components/PresetModal";
import { PresetConfig } from '../types';
import { defaultPresets } from '../utils/presets';
import { loadFromStorage, removeFromStorage, saveToStorageWithEvent } from '../utils/localStorage';

const Presets: React.FC = () => {
  const [presets, setPresets] = useState<PresetConfig[]>(defaultPresets);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [editingPreset, setEditingPreset] = useState<PresetConfig | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    const savedPresets = loadFromStorage('dantools-presets', defaultPresets);
    setPresets(savedPresets);
  }, []);

  // save presets and tell other parts about it
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

  // wipe presets and conversations from localStorage
  const deleteAllPresets = () => {
    if (deleteConfirmText === 'DELETE') {
      // clear only preset-related data, preserve API key
      removeFromStorage('dantools-presets');
      
      // clear all conversation data
      presets.forEach(preset => {
        removeFromStorage(`dantools-conversations-${preset.id}`);
      });
      
      // reset to default presets
      savePresetsToStorage(defaultPresets);
      
      setShowDeleteModal(false);
      setDeleteConfirmText('');
    }
  };

  const handleDeleteModalClose = () => {
    setShowDeleteModal(false);
    setDeleteConfirmText('');
  };

  const toggleFavorite = (presetId: string) => {
    const newPresets = presets.map(p => 
      p.id === presetId ? { ...p, isFavorite: !p.isFavorite } : p
    );
    savePresetsToStorage(newPresets);
  };

  return (
    <div className="h-screen bg-[#0d2549] overflow-y-auto">
      <div className="p-4 md:p-8">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#FCF8DD] mb-2">Chat Presets</h1>
            <p className="text-lg text-[#FCF8DD]/70">Create and manage your AI assistant configurations</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                setEditingPreset(null);
                setShowPresetModal(true);
              }}
              className="bg-[#FCF8DD] hover:bg-[#FCF8DD]/90 text-[#112f5e] px-6 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <FaPlus className="text-sm" />
              Create New Preset
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border border-red-500/30 hover:border-red-500/50"
            >
              <FaTrash className="text-xs" />
              Delete All
            </button>
          </div>
        </div>
      </div>

      {/* Presets Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
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
                  <h3 className="text-lg font-bold text-[#FCF8DD] leading-tight flex-1">{preset.title}</h3>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleFavorite(preset.id)}
                      className={`p-1.5 rounded-lg transition-all duration-200 ${
                        preset.isFavorite 
                          ? 'text-yellow-400 bg-yellow-400/20 hover:bg-yellow-400/30' 
                          : 'text-[#FCF8DD]/40 hover:text-yellow-400 hover:bg-yellow-400/20'
                      }`}
                      title={preset.isFavorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      <FaStar className="text-sm" />
                    </button>
                    {preset.isCustom ? (
                      <span className="bg-[#FCF8DD]/20 text-[#FCF8DD] text-xs px-2 py-1 rounded-full font-medium">
                        Custom
                      </span>
                    ) : (
                      <span className="bg-green-500/20 text-green-300 text-xs px-2 py-1 rounded-full font-medium">
                        Sample
                      </span>
                    )}
                  </div>
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

      {/* delete everything modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#112f5e] rounded-2xl shadow-2xl w-full max-w-md border border-red-500/30">
            <div className="sticky top-0 bg-[#112f5e] border-b border-red-500/20 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <FaExclamationTriangle className="text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-red-300">Danger Zone</h2>
              </div>
              <button
                onClick={handleDeleteModalClose}
                className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <FaTimes className="text-red-300/70 hover:text-red-300" />
              </button>
            </div>

            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaTrash className="text-2xl text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-[#FCF8DD] mb-2">Delete All Presets</h3>
                <p className="text-[#FCF8DD]/80 text-sm leading-relaxed">
                  This will delete <strong>all presets</strong> and <strong>all chat history</strong>! Only the default samples will remain.
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-[#FCF8DD]/90 mb-3">
                  Type <strong className="text-red-300">DELETE</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-red-500/30 rounded-lg focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none bg-[#0d2549] text-[#FCF8DD] placeholder-[#FCF8DD]/60"
                  placeholder="Type DELETE here..."
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={handleDeleteModalClose}
                  className="px-4 py-2 text-[#FCF8DD]/80 bg-[#FCF8DD]/10 hover:bg-[#FCF8DD]/20 rounded-lg transition-colors border border-[#FCF8DD]/20 hover:border-[#FCF8DD]/30"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteAllPresets}
                  disabled={deleteConfirmText !== 'DELETE'}
                  className="px-6 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white rounded-lg transition-colors font-medium shadow-lg hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete All Presets
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Presets;