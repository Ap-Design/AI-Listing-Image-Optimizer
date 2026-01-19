
import React, { useState } from 'react';
import { ProductImage, AppState } from './types';
import { gemini } from './services/geminiService';
import { replicateService } from './services/replicateService';
import ImageUploader from './components/ImageUploader';
import ProductDashboard from './components/ProductDashboard';
import ResultsGallery from './components/ResultsGallery';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    images: [],
    isGlobalProcessing: false,
    currentStep: 'upload',
    enhancementMode: 'polish'
  });

  const [showKeyHint, setShowKeyHint] = useState(false);

  // STEP 1: Upload & Auto-Analyze (Vision)
  const handleFilesUploaded = async (newImages: ProductImage[]) => {
    setState(prev => ({ 
      ...prev, 
      images: [...prev.images, ...newImages],
      currentStep: 'dashboard'
    }));
    
    await Promise.all(newImages.map(async (img) => {
      updateImageStatus(img.id, 'analyzing');
      try {
        const seoData = await gemini.analyzeProduct(img.base64);
        setState(prev => ({
          ...prev,
          images: prev.images.map(i => i.id === img.id ? { ...i, status: 'analyzed', seo: seoData } : i)
        }));
      } catch (err) {
        console.error(err);
        updateImageStatus(img.id, 'analyzed');
      }
    }));
  };

  const updateImageStatus = (id: string, status: ProductImage['status'], extra: Partial<ProductImage> = {}) => {
    setState(prev => ({
      ...prev,
      images: prev.images.map(img => img.id === id ? { ...img, status, ...extra } : img)
    }));
  };

  const prepareEnhancement = async (mode: 'polish' | 'master') => {
    // Check if API key is selected (Required for Gemini 3 Pro Image)
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      setShowKeyHint(true);
      await window.aistudio.openSelectKey();
    }
    
    setState(prev => ({ ...prev, currentStep: 'results', enhancementMode: mode }));
  };

  const runBatchEnhancement = async () => {
    const mode = state.enhancementMode;
    const imagesToProcess = state.images.filter(
      img => img.status !== 'error' && img.status !== 'completed' && img.status !== 'enhancing'
    );

    if (imagesToProcess.length === 0) return;

    setState(prev => ({ ...prev, isGlobalProcessing: true }));

    setState(prev => ({
      ...prev,
      images: prev.images.map(img => 
        imagesToProcess.some(p => p.id === img.id) 
          ? { ...img, status: 'enhancing' } 
          : img
      )
    }));

    setTimeout(async () => {
      for (const img of imagesToProcess) {
        try {
          // Fixed: Calling with 5 arguments as required by the updated service
          const outputUrl = await replicateService.enhanceImage(
            img.base64, 
            img.file.type, 
            mode,
            img.originalWidth,
            img.originalHeight
          );
          
          updateImageStatus(img.id, 'completed', { 
            resultUrl: outputUrl,
            // Reflect the actual target resolution in UI
            newWidth: mode === 'master' ? 4096 : 2048,
            newHeight: mode === 'master' ? 4096 : 2048
          });
        } catch (err: any) {
          console.error(`Processing failed for ${img.id}:`, err);
          if (err.message === "KEY_REQUIRED") {
            await window.aistudio.openSelectKey();
            updateImageStatus(img.id, 'error', { error: "Please select a valid paid API key and try again." });
            break; // Stop batch if key is the issue
          }
          updateImageStatus(img.id, 'error', { error: err.message || "Enhancement failed" });
        }
      }
      setState(prev => ({ ...prev, isGlobalProcessing: false }));
    }, 100);
  };

  const handleRemoveImage = (id: string) => {
    setState(prev => ({ ...prev, images: prev.images.filter(img => img.id !== id) }));
  };

  const reset = () => {
    setState({
      images: [],
      isGlobalProcessing: false,
      currentStep: 'upload',
      enhancementMode: 'polish'
    });
  };

  return (
    <div className="dark">
      <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
        {showKeyHint && (
          <div className="bg-orange-500 text-white text-xs py-2 px-4 text-center font-bold">
            Pro Features Active: High-resolution upscaling requires a paid API key. 
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline ml-2">Setup Billing</a>
          </div>
        )}
        
        <header className="bg-slate-900/50 backdrop-blur-lg border-b border-slate-800 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={reset}>
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">EtsyFlow <span className="text-slate-500 font-normal">Enhancer</span></h1>
            </div>
            {state.currentStep !== 'upload' && (
               <div className="flex items-center space-x-4">
                 <span className="text-xs font-mono text-slate-500">GEMINI 3 PRO 4K ACTIVE</span>
                 <button onClick={reset} className="text-sm font-medium text-slate-300 hover:text-white">New Batch</button>
               </div>
            )}
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-10">
          {state.currentStep === 'upload' && <ImageUploader onUpload={handleFilesUploaded} />}

          {state.currentStep === 'dashboard' && (
            <div className="space-y-10">
              <ProductDashboard 
                images={state.images} 
                onRemoveImage={handleRemoveImage} 
                onProcess={prepareEnhancement} 
              />
              <div className="h-24"></div>
            </div>
          )}

          {state.currentStep === 'results' && (
            <ResultsGallery 
              images={state.images} 
              isPro={state.enhancementMode === 'master'} 
              onStartProcessing={runBatchEnhancement} 
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
