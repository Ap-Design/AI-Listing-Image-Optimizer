
import React, { useState } from 'react';
import { ProductImage, AppState, ProcessingModel } from './types';
import { gemini } from './services/geminiService';
import ImageUploader from './components/ImageUploader';
import PromptEditor from './components/PromptEditor';
import ProcessingQueue from './components/ProcessingQueue';
import ResultsGallery from './components/ResultsGallery';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    images: [],
    isGlobalProcessing: false,
    globalPrompt: "Photorealistic studio product photography. Keep the original product subject exactly as it is. Do not alter the main subject's shape, texture, or design. Natural textures with subtle imperfections and micro-details. No plastic or waxy look. Minimalist clean background, real-world soft lighting, sharp focus, high resolution.",
    currentStep: 'upload'
  });

  const [model, setModel] = useState<ProcessingModel>(ProcessingModel.FLASH);
  const isPro = model === ProcessingModel.PRO;

  const handleFilesUploaded = async (newImages: ProductImage[]) => {
    setState(prev => ({ 
      ...prev, 
      images: [...prev.images, ...newImages],
      currentStep: 'refine'
    }));
    
    // Process each image to get a suggested prompt
    for (const img of newImages) {
      updateImageStatus(img.id, 'analyzing');
      try {
        const suggestion = await gemini.suggestPrompt(img.base64);
        updateImageStatus(img.id, 'ready', { suggestedPrompt: suggestion, editedPrompt: suggestion });
      } catch (err) {
        updateImageStatus(img.id, 'error', { error: "Analysis failed" });
      }
    }
  };

  /**
   * Requirement: Etsy Validation Helper
   * Checks if the resulting image meets the 2000px minimum dimension.
   */
  const validateEtsyDimensions = (dataUrl: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Etsy recommends at least 2000px for the shortest side for high-res zoom
        const isMinMet = img.width >= 2000 && img.height >= 2000;
        resolve(isMinMet);
      };
      img.onerror = () => resolve(false);
      img.src = dataUrl;
    });
  };

  const updateImageStatus = (id: string, status: ProductImage['status'], extra: Partial<ProductImage> = {}) => {
    setState(prev => ({
      ...prev,
      images: prev.images.map(img => img.id === id ? { ...img, status, ...extra } : img)
    }));
  };

  const handleRemoveImage = (id: string) => {
    setState(prev => {
      const remainingImages = prev.images.filter(img => img.id !== id);
      // Clean up object URL to prevent memory leaks
      const removedImage = prev.images.find(img => img.id === id);
      if (removedImage?.previewUrl) {
        URL.revokeObjectURL(removedImage.previewUrl);
      }
      
      return {
        ...prev,
        images: remainingImages,
        currentStep: remainingImages.length === 0 ? 'upload' : prev.currentStep
      };
    });
  };

  const startBulkProcessing = async () => {
    setState(prev => ({ ...prev, currentStep: 'process', isGlobalProcessing: true }));
    
    for (const img of state.images) {
      if (img.status === 'error' || img.status === 'completed') continue;

      updateImageStatus(img.id, 'processing');
      try {
        const promptToUse = img.editedPrompt || state.globalPrompt;
        
        // Phase 1: AI Enhancement & Generation (using 2K for Pro)
        const result = await gemini.processImage(img.base64, promptToUse, model);
        
        if (result) {
          // Phase 2: Metadata Verification (Only for Pro Mode)
          let isEtsyValidated = false;
          if (isPro) {
            console.log(`[EtsyFlow] Validating high-res dimensions for ${img.file.name}...`);
            isEtsyValidated = await validateEtsyDimensions(result);
          }
          
          updateImageStatus(img.id, 'completed', { 
            resultUrl: result,
            isEtsyValidated: isEtsyValidated
          });
        } else {
          updateImageStatus(img.id, 'error', { error: "Optimization failed" });
        }
      } catch (err: any) {
        // Handle API key issues as per guidelines
        if (err.message?.includes("Requested entity was not found.")) {
          if (typeof window !== 'undefined' && (window as any).aistudio) {
            await (window as any).aistudio.openSelectKey();
          }
        }
        updateImageStatus(img.id, 'error', { error: "Processing failed" });
      }
    }

    setState(prev => ({ ...prev, currentStep: 'results', isGlobalProcessing: false }));
  };

  const reset = () => {
    // Revoke all preview URLs
    state.images.forEach(img => {
      if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
    });

    setState({
      images: [],
      isGlobalProcessing: false,
      globalPrompt: "Photorealistic studio product photography. Keep the original product subject exactly as it is. Do not alter the main subject's shape, texture, or design. Natural textures with subtle imperfections and micro-details. No plastic or waxy look. Minimalist clean background, real-world soft lighting, sharp focus, high resolution.",
      currentStep: 'upload'
    });
  };

  return (
    <div className={`${isPro ? 'dark' : ''}`}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 flex flex-col">
        {/* Header */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                <span className="text-white font-bold text-xl">E</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center">
                EtsyFlow 
                {isPro && (
                  <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[9px] font-black uppercase tracking-widest rounded shadow-sm">
                    Pro Version
                  </span>
                )}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1 transition-colors">
                <button 
                  onClick={() => setModel(ProcessingModel.FLASH)}
                  className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${model === ProcessingModel.FLASH ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                  Standard
                </button>
                <button 
                  onClick={async () => {
                    if (typeof window !== 'undefined' && (window as any).aistudio) {
                      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
                      if (!hasKey) {
                        await (window as any).aistudio.openSelectKey();
                      }
                    }
                    setModel(ProcessingModel.PRO);
                  }}
                  className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${model === ProcessingModel.PRO ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                  High-Res (Pro)
                </button>
              </div>
              {state.currentStep !== 'upload' && (
                <button 
                  onClick={reset}
                  className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Start Over
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow max-w-7xl mx-auto px-4 py-8 w-full">
          {state.currentStep === 'upload' && (
            <ImageUploader onUpload={handleFilesUploaded} />
          )}

          {state.currentStep === 'refine' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <PromptEditor 
                images={state.images}
                globalPrompt={state.globalPrompt}
                onGlobalPromptChange={(p) => setState(prev => ({ ...prev, globalPrompt: p }))}
                onImagePromptChange={(id, p) => updateImageStatus(id, 'ready', { editedPrompt: p })}
                onRemoveImage={handleRemoveImage}
                onStartProcessing={startBulkProcessing}
              />
              <div className="flex justify-center pt-8">
                <button 
                  onClick={startBulkProcessing}
                  disabled={state.images.some(img => img.status === 'analyzing')}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-12 py-4 rounded-full font-bold text-lg shadow-xl shadow-orange-500/20 transition-all transform hover:scale-105 disabled:opacity-50 disabled:scale-100"
                >
                  {state.images.some(img => img.status === 'analyzing') ? 'AI is Thinking...' : 'Optimize All Images'}
                </button>
              </div>
            </div>
          )}

          {state.currentStep === 'process' && (
            <ProcessingQueue images={state.images} isPro={isPro} />
          )}

          {state.currentStep === 'results' && (
            <ResultsGallery images={state.images} isPro={isPro} />
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 transition-colors">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-slate-400 dark:text-slate-500 text-xs font-medium">
              EtsyFlow Pro uses Google Gemini 3 models for 2K upscaling.
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="ml-2 text-orange-500 hover:underline">
                Billing Documentation
              </a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
