
import React, { useState } from 'react';
import { ProductImage, AppState } from './types';
import { upscaleService } from './services/upscaleService';
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

  const handleFilesUploaded = (newImages: ProductImage[]) => {
    const readyImages = newImages.map(img => ({
      ...img,
      status: 'analyzed' as const
    }));

    setState(prev => ({ 
      ...prev, 
      images: [...prev.images, ...readyImages],
      currentStep: 'dashboard'
    }));
  };

  const updateImageStatus = (id: string, status: ProductImage['status'], extra: Partial<ProductImage> = {}) => {
    setState(prev => ({
      ...prev,
      images: prev.images.map(img => img.id === id ? { ...img, status, ...extra } : img)
    }));
  };

  const handleImagePromptChange = (id: string, prompt: string) => {
    setState(prev => ({
      ...prev,
      images: prev.images.map(img => img.id === id ? { ...img, editedPrompt: prompt } : img)
    }));
  };

  const prepareEnhancement = async (mode: 'polish' | 'master') => {
    setState(prev => ({ ...prev, currentStep: 'results', enhancementMode: mode }));
  };

  const runBatchEnhancement = async () => {
    const imagesToProcess = state.images.filter(
      img => img.status !== 'error' && img.status !== 'completed' && img.status !== 'enhancing'
    );

    if (imagesToProcess.length === 0) return;

    setState(prev => ({ ...prev, isGlobalProcessing: true }));

    setState(prev => ({
      ...prev,
      images: prev.images.map(img => 
        imagesToProcess.some(p => p.id === img.id) 
          ? { ...img, status: 'enhancing', error: undefined } 
          : img
      )
    }));

    for (const img of imagesToProcess) {
      await processSingleImage(img);
      await new Promise(r => setTimeout(r, 500));
    }
    
    setState(prev => ({ ...prev, isGlobalProcessing: false }));
  };

  const handleSingleImageEnhance = async (id: string) => {
    const img = state.images.find(i => i.id === id);
    if (!img) return;

    updateImageStatus(id, 'enhancing', { error: undefined });
    await processSingleImage(img);
  };

  const processSingleImage = async (img: ProductImage) => {
    try {
      const result = await upscaleService.enhanceImage(
        img.base64, 
        img.file.type, 
        img.originalWidth
      );
      
      updateImageStatus(img.id, 'completed', { 
        resultUrl: result.url,
        newWidth: img.originalWidth * result.scale,
        newHeight: img.originalHeight * result.scale,
        error: undefined
      });
    } catch (err: any) {
      console.error(`Processing failed for ${img.id}:`, err);
      updateImageStatus(img.id, 'error', { 
        error: err.message || "AI Enhancement failed. Please retry." 
      });
    }
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
        <header className="bg-slate-900/50 backdrop-blur-lg border-b border-slate-800 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={reset}>
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">EtsyFlow <span className="text-slate-500 font-normal">Optimizer</span></h1>
            </div>
            {state.currentStep !== 'upload' && (
               <div className="flex items-center space-x-4">
                 <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">FAL.AI PIELINE ACTIVE</span>
                 <button onClick={reset} className="text-sm font-medium text-slate-300 hover:text-white bg-slate-800 px-3 py-1 rounded-md">New Batch</button>
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
              onImagePromptChange={handleImagePromptChange}
              onRefineImage={handleSingleImageEnhance}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
