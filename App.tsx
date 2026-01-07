
import React, { useState } from 'react';
import { ProductImage, AppState, ProcessingModel } from './types';
import { gemini } from './services/geminiService';
import ImageUploader from './components/ImageUploader';
import PromptEditor from './components/PromptEditor';
import ProcessingQueue from './components/ProcessingQueue';
import ResultsGallery from './components/ResultsGallery';

interface ExtendedAppState extends AppState {
  ignoreCustomInstructions: boolean;
}

const App: React.FC = () => {
  const [state, setState] = useState<ExtendedAppState>({
    images: [],
    isGlobalProcessing: false,
    globalPrompt: "Professional studio product photography. The product remains unchanged as a locked asset. Minimalist clean background with subtle soft shadows. Natural real-world lighting, 85mm lens look, sharp focus, 8k resolution.",
    currentStep: 'upload',
    ignoreCustomInstructions: false,
    activeProcessMode: 'draft'
  });

  const [model, setModel] = useState<ProcessingModel>(ProcessingModel.FLASH);

  const handleFilesUploaded = async (newImages: ProductImage[]) => {
    setState(prev => ({ 
      ...prev, 
      images: [...prev.images, ...newImages],
      currentStep: 'refine'
    }));
    
    for (const img of newImages) {
      if (img.status === 'error') continue; // Skip analysis for failed images

      updateImageStatus(img.id, 'analyzing');
      try {
        const suggestion = await gemini.suggestPrompt(img.base64);
        updateImageStatus(img.id, 'ready', { suggestedPrompt: suggestion, editedPrompt: suggestion });
      } catch (err) {
        updateImageStatus(img.id, 'error', { error: "Analysis failed" });
      }
    }
  };

  const updateImageStatus = (id: string, status: ProductImage['status'], extra: Partial<ProductImage> = {}) => {
    setState(prev => ({
      ...prev,
      images: prev.images.map(img => img.id === id ? { ...img, status, ...extra } : img)
    }));
  };

  const startProcessing = async (mode: 'draft' | 'finalize') => {
    if (mode === 'finalize' && typeof window !== 'undefined' && (window as any).aistudio) {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio.openSelectKey();
        return;
      }
    }

    setState(prev => ({ 
      ...prev, 
      currentStep: 'process', 
      isGlobalProcessing: true,
      activeProcessMode: mode
    }));
    
    for (const img of state.images) {
      if (img.status === 'error') continue; // Do not process errored items
      if (mode === 'draft' && img.status !== 'ready') continue;
      if (mode === 'finalize' && !['ready', 'drafted'].includes(img.status)) continue;

      updateImageStatus(img.id, mode === 'draft' ? 'drafting' : 'finalizing');
      
      try {
        const promptToUse = (state.ignoreCustomInstructions) ? state.globalPrompt : (img.editedPrompt || state.globalPrompt);
        const result = await gemini.processImage(img.base64, promptToUse, mode);
        
        if (result) {
          updateImageStatus(img.id, mode === 'draft' ? 'drafted' : 'completed', { 
            [mode === 'draft' ? 'draftUrl' : 'resultUrl']: result,
            usedPrompt: promptToUse,
            isEtsyValidated: mode === 'finalize'
          });
        } else {
          updateImageStatus(img.id, 'error', { error: `${mode} failed` });
        }
      } catch (err: any) {
        updateImageStatus(img.id, 'error', { error: "Processing failed" });
      }
    }

    setState(prev => ({ ...prev, currentStep: 'results', isGlobalProcessing: false }));
  };

  const handleRemoveImage = (id: string) => {
    setState(prev => {
      const remaining = prev.images.filter(img => img.id !== id);
      return { ...prev, images: remaining, currentStep: remaining.length === 0 ? 'upload' : prev.currentStep };
    });
  };

  const reset = () => {
    setState({
      images: [],
      isGlobalProcessing: false,
      globalPrompt: "Professional studio product photography. The product remains unchanged as a locked asset. Minimalist clean background with subtle soft shadows. Natural real-world lighting, 85mm lens look, sharp focus, 8k resolution.",
      currentStep: 'upload',
      ignoreCustomInstructions: false,
      activeProcessMode: 'draft'
    });
  };

  return (
    <div className="dark">
      <div className="min-h-screen bg-slate-950 transition-colors duration-500 flex flex-col text-slate-200">
        <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={reset}>
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                <span className="text-white font-bold text-xl">E</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight">EtsyFlow</h1>
            </div>
            {state.currentStep !== 'upload' && (
              <button onClick={reset} className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Start Over</button>
            )}
          </div>
        </header>

        <main className="flex-grow max-w-7xl mx-auto px-4 py-8 w-full">
          {state.currentStep === 'upload' && <ImageUploader onUpload={handleFilesUploaded} />}

          {state.currentStep === 'refine' && (
            <div className="space-y-8">
              <PromptEditor 
                images={state.images}
                globalPrompt={state.globalPrompt}
                ignoreCustomInstructions={state.ignoreCustomInstructions}
                onGlobalPromptChange={(p) => setState(prev => ({ ...prev, globalPrompt: p }))}
                onImagePromptChange={(id, p) => updateImageStatus(id, 'ready', { editedPrompt: p })}
                onRemoveImage={handleRemoveImage}
                onStartProcessing={() => {}} 
              />
              
              <div className="flex flex-col items-center pt-8 space-y-6">
                <label className="flex items-center space-x-3 cursor-pointer group mb-2">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={state.ignoreCustomInstructions}
                      onChange={(e) => setState(prev => ({ ...prev, ignoreCustomInstructions: e.target.checked }))}
                    />
                    <div className="w-10 h-6 bg-slate-800 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  </div>
                  <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">
                    Ignore custom instructions (use Global Prompt for all)
                  </span>
                </label>

                <div className="flex space-x-4">
                  <button 
                    onClick={() => startProcessing('draft')}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-2xl font-bold transition-all border border-slate-700"
                  >
                    Generate Quick Drafts
                  </button>
                  <button 
                    onClick={() => startProcessing('finalize')}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:scale-105 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-orange-500/20 transition-all flex items-center"
                  >
                    Finalize for Etsy (4K)
                  </button>
                </div>
              </div>
            </div>
          )}

          {state.currentStep === 'process' && (
            <ProcessingQueue images={state.images} isPro={state.activeProcessMode === 'finalize'} />
          )}

          {state.currentStep === 'results' && (
            <ResultsGallery 
              images={state.images} 
              isPro={state.activeProcessMode === 'finalize'} 
              onFinalizeAll={() => startProcessing('finalize')}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
