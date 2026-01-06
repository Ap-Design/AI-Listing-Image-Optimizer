
import React from 'react';
import { ProductImage } from '../types';

interface PromptEditorProps {
  images: ProductImage[];
  globalPrompt: string;
  ignoreCustomInstructions?: boolean;
  onGlobalPromptChange: (p: string) => void;
  onImagePromptChange: (id: string, p: string) => void;
  onRemoveImage: (id: string) => void;
  onStartProcessing: () => void;
}

const PromptEditor: React.FC<PromptEditorProps> = ({ 
  images, 
  globalPrompt, 
  ignoreCustomInstructions = false,
  onGlobalPromptChange, 
  onImagePromptChange,
  onRemoveImage
}) => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Global Enhancement Goal</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Apply this style to all images unless specified otherwise.</p>
          </div>
        </div>
        <textarea 
          value={globalPrompt}
          onChange={(e) => onGlobalPromptChange(e.target.value)}
          className="w-full h-24 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
          placeholder="Describe the desired studio look..."
        />
        <div className="flex flex-wrap gap-2 mt-4">
          {["Minimalist", "Boho Style", "Dark Moody", "Pure White", "Marble Surface"].map(preset => (
            <button 
              key={preset}
              onClick={() => onGlobalPromptChange(preset + ": " + globalPrompt)}
              className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 transition-colors"
            >
              + {preset}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map(img => (
          <div key={img.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-all group relative hover:shadow-md">
            {/* Remove Button */}
            <button 
              onClick={() => onRemoveImage(img.id)}
              className="absolute top-2 right-2 z-20 p-1.5 bg-white/90 dark:bg-slate-800/90 text-slate-500 hover:text-red-500 hover:bg-white dark:hover:bg-slate-700 rounded-full shadow-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
              title="Remove image"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="relative aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <img src={img.previewUrl} alt="Preview" className="w-full h-full object-cover" />
              {img.status === 'analyzing' && (
                <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm flex flex-col items-center justify-center">
                  <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <span className="text-xs font-bold text-orange-600">AI Analyzing...</span>
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500">
                  {ignoreCustomInstructions ? 'Instructions Ignored' : 'Custom Instructions'}
                </span>
                {!ignoreCustomInstructions && img.status === 'ready' && (
                  <span className="text-[10px] font-bold text-green-500 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/></svg>
                    AI SUGGESTED
                  </span>
                )}
              </div>
              <textarea 
                value={img.editedPrompt || ""}
                disabled={ignoreCustomInstructions}
                onChange={(e) => onImagePromptChange(img.id, e.target.value)}
                className={`w-full h-32 p-3 text-xs border bg-slate-50 dark:bg-slate-950 rounded-xl outline-none resize-none transition-all ${
                  ignoreCustomInstructions 
                    ? 'border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50 select-none' 
                    : 'border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent'
                }`}
                placeholder={ignoreCustomInstructions ? "Global override active..." : "Individual instructions for this item..."}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PromptEditor;
