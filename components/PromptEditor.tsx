
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map(img => {
          const isError = img.status === 'error';
          const isLibHeifError = img.error?.includes('ERR_LIBHEIF');

          return (
            <div key={img.id} className={`bg-white dark:bg-slate-900 rounded-2xl border overflow-hidden shadow-sm transition-all group relative hover:shadow-md ${
              isError ? 'border-red-500/50 bg-red-50/10' : 'border-slate-200 dark:border-slate-800'
            }`}>
              <button 
                onClick={() => onRemoveImage(img.id)}
                className="absolute top-2 right-2 z-20 p-1.5 bg-white/90 dark:bg-slate-800/90 text-slate-500 hover:text-red-500 hover:bg-white dark:hover:bg-slate-700 rounded-full shadow-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="relative aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden">
                {img.previewUrl ? (
                  <img src={img.previewUrl} alt="Preview" className={`w-full h-full object-cover ${isError ? 'grayscale opacity-50' : ''}`} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-200 dark:bg-slate-800">
                    <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                
                {img.status === 'analyzing' && (
                  <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <span className="text-xs font-bold text-orange-600 uppercase tracking-tighter">AI Analyzing...</span>
                  </div>
                )}

                {isError && (
                  <div className="absolute inset-0 bg-red-950/20 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center">
                     <div className="bg-red-500 text-white rounded-full p-2 mb-2 shadow-lg">
                       <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                     </div>
                     <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest">Format Error</span>
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold tracking-widest uppercase ${isError ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'}`}>
                    {isError ? 'Action Required' : (ignoreCustomInstructions ? 'Instructions Ignored' : 'Custom Instructions')}
                  </span>
                </div>
                
                {isError ? (
                  <div className="space-y-3">
                    <div className="text-[11px] text-red-600 dark:text-red-400 font-medium leading-relaxed bg-red-500/5 p-3 rounded-xl border border-red-500/20">
                      {isLibHeifError ? (
                        <>
                          <p className="font-bold mb-1 underline">ERR_LIBHEIF Not Supported</p>
                          <p>Tip: This is likely a 'Live Photo'. Go to your iPhone Photos app, tap Edit, turn off 'Live', or 'Save as Photo' before uploading.</p>
                        </>
                      ) : (
                        <p>{img.error || "Unknown processing error."}</p>
                      )}
                    </div>
                  </div>
                ) : (
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
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PromptEditor;
