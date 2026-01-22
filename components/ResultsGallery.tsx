
import React, { useState, useEffect, useRef } from 'react';
import { ProductImage } from '../types';

interface ResultsGalleryProps {
  images: ProductImage[];
  isPro?: boolean;
  onStartProcessing: () => void;
  onImagePromptChange: (id: string, prompt: string) => void;
  onRefineImage: (id: string) => void;
}

const ResultsGallery: React.FC<ResultsGalleryProps> = ({ 
  images, 
  onStartProcessing, 
  onRefineImage 
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareVal, setCompareVal] = useState(50);
  const [isZipping, setIsZipping] = useState(false);
  const [isSourceLoaded, setIsSourceLoaded] = useState(false);
  const [isEnhancedLoaded, setIsEnhancedLoaded] = useState(false);

  const visibleImages = images.filter(img => img.status !== 'error');
  const hasPending = visibleImages.some(img => img.status === 'analyzed' || img.status === 'pending');
  const isRunning = visibleImages.some(img => img.status === 'enhancing');

  useEffect(() => {
    if (!selectedId && visibleImages.length > 0) {
      setSelectedId(visibleImages[0].id);
    }
  }, [visibleImages.length, selectedId]);

  // Pre-decode images when selection changes to prevent "partial loading" flicker
  useEffect(() => {
    if (selectedId) {
      setIsSourceLoaded(false);
      setIsEnhancedLoaded(false);
      const img = visibleImages.find(i => i.id === selectedId);
      if (img) {
        // Pre-load original
        const sourceImg = new Image();
        sourceImg.src = img.previewUrl;
        sourceImg.decode().then(() => setIsSourceLoaded(true)).catch(() => setIsSourceLoaded(true));

        // Pre-load enhanced if exists
        if (img.resultUrl) {
          const enhancedImg = new Image();
          enhancedImg.src = img.resultUrl;
          enhancedImg.decode().then(() => setIsEnhancedLoaded(true)).catch(() => setIsEnhancedLoaded(true));
        }
      }
    }
  }, [selectedId, visibleImages]);

  const selectedImage = visibleImages.find(i => i.id === selectedId);

  const downloadAll = async () => {
    const completedImages = visibleImages.filter(img => img.resultUrl);
    if (completedImages.length === 0) return;
    
    setIsZipping(true);
    try {
      const JSZipModule = await import('https://esm.sh/jszip');
      const JSZip = JSZipModule.default;
      const zip = new JSZip();
      
      for (const img of completedImages) {
        if (img.resultUrl) {
          const response = await fetch(img.resultUrl);
          const blob = await response.blob();
          zip.file(`highres-${img.file.name.replace(/\.[^/.]+$/, "")}.png`, blob);
        }
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = `etsy-high-res-batch.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(zipUrl), 100);
    } catch (error) { 
      console.error(error);
      alert("Download failed."); 
    } finally { 
      setIsZipping(false); 
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {isRunning ? 'Sharpening Batch...' : hasPending ? 'Review & Upscale' : 'Optimization Complete'}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
             {visibleImages.filter(i => i.resultUrl).length} of {visibleImages.length} images at Etsy target resolution
          </p>
        </div>
        
        <div className="flex gap-4">
          {hasPending && !isRunning && (
            <button 
              onClick={onStartProcessing}
              className="bg-orange-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg animate-pulse"
            >
              Start Batch Upscale
            </button>
          )}
          
          <button 
            onClick={downloadAll} 
            disabled={isZipping || visibleImages.filter(i => i.resultUrl).length === 0} 
            className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isZipping ? 'Archiving...' : 'Download All High-Res'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {selectedImage ? (
            <>
              <div className="bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative group select-none flex flex-col h-[600px]">
                <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md text-white text-[10px] font-mono px-3 py-1.5 rounded-lg border border-white/10">
                  Source: {selectedImage.originalWidth}px
                </div>
                
                {selectedImage.resultUrl && (
                  <div className="absolute top-4 right-4 z-20 bg-green-500 text-white text-[10px] font-mono px-3 py-1.5 rounded-lg font-bold shadow-lg">
                    Optimized: {selectedImage.newWidth}px
                  </div>
                )}

                <div className="relative flex-grow bg-slate-900/50 flex items-center justify-center overflow-hidden">
                  {!isSourceLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-10">
                      <div className="w-8 h-8 border-2 border-slate-700 border-t-orange-500 rounded-full animate-spin"></div>
                    </div>
                  )}

                  {selectedImage.resultUrl ? (
                    <div className="relative w-full h-full cursor-ew-resize">
                      {/* Enhanced Image Layer */}
                      <div 
                        className="absolute inset-0 z-10 transition-opacity duration-300" 
                        style={{ 
                          clipPath: `inset(0 ${100 - compareVal}% 0 0)`,
                          willChange: 'clip-path',
                          opacity: isEnhancedLoaded ? 1 : 0 
                        }}
                      >
                        <img 
                          src={selectedImage.resultUrl} 
                          className="w-full h-full object-contain" 
                          alt="Enhanced" 
                          loading="eager"
                        />
                      </div>
                      
                      {/* Source Image Layer */}
                      <div 
                        className="absolute inset-0 z-0 transition-opacity duration-300"
                        style={{ opacity: isSourceLoaded ? 1 : 0 }}
                      >
                        <img 
                          src={selectedImage.previewUrl} 
                          className="w-full h-full object-contain opacity-40 grayscale" 
                          alt="Original" 
                          loading="eager"
                        />
                      </div>

                      {/* Divider Slider */}
                      <div 
                        className="absolute inset-y-0 z-20 w-0.5 bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)] pointer-events-none" 
                        style={{ left: `${compareVal}%`, willChange: 'left' }}
                      >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-2xl border border-slate-200">
                          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                        </div>
                      </div>

                      <input 
                        type="range" min="0" max="100" value={compareVal} 
                        onChange={(e) => setCompareVal(parseInt(e.target.value))}
                        className="absolute inset-0 z-30 opacity-0 cursor-ew-resize"
                      />
                    </div>
                  ) : (
                    <div className="relative w-full h-full transition-opacity duration-300" style={{ opacity: isSourceLoaded ? 1 : 0 }}>
                      <img 
                        src={selectedImage.previewUrl} 
                        className="w-full h-full object-contain" 
                        alt="Original Preview" 
                        loading="eager"
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                        {selectedImage.status === 'enhancing' ? (
                          <div className="bg-black/70 backdrop-blur-sm p-6 rounded-2xl flex flex-col items-center">
                            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-white font-bold tracking-widest uppercase text-sm animate-pulse">Sharpening edges...</p>
                          </div>
                        ) : (
                          <div className="bg-black/50 backdrop-blur-sm px-6 py-3 rounded-full border border-white/10">
                            <p className="text-white font-medium text-sm">Reviewing Structural Integrity • Click "Start Batch Upscale"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-4">
                 <button 
                  onClick={() => onRefineImage(selectedId!)}
                  disabled={selectedImage.status === 'enhancing'}
                  className="flex-grow bg-slate-800 text-white py-4 rounded-2xl font-bold text-sm hover:bg-slate-700 transition-all disabled:opacity-50"
                >
                  {selectedImage.status === 'enhancing' ? "Processing..." : "Retry Sharpening"}
                </button>
                {selectedImage.resultUrl && (
                  <a 
                    href={selectedImage.resultUrl} 
                    download={`etsy-${selectedImage.file.name}`}
                    className="flex-grow bg-white text-slate-900 py-4 rounded-2xl font-bold text-sm text-center shadow-xl hover:scale-[1.02] transition-transform"
                  >
                    Download High-Res ({selectedImage.newWidth}px)
                  </a>
                )}
              </div>
            </>
          ) : (
             <div className="h-96 flex items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl">
               Queue is empty
             </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-lg h-fit max-h-[700px] flex flex-col">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex justify-between items-center">
            <span>Asset Queue</span>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">{visibleImages.length} items</span>
          </h3>
          
          <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-grow">
            {visibleImages.map(img => {
              const isActive = selectedId === img.id;
              const isCompleted = !!img.resultUrl;
              const isEnhancing = img.status === 'enhancing';

              return (
                <button 
                  key={img.id} 
                  onClick={() => setSelectedId(img.id)}
                  className={`w-full flex items-center p-2 rounded-xl transition-all border ${
                    isActive 
                      ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-500/50' 
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <img src={img.previewUrl} className="w-full h-full rounded-lg object-cover bg-slate-200" alt="thumb" />
                    {isCompleted && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      </div>
                    )}
                    {isEnhancing && (
                      <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-3 text-left overflow-hidden">
                    <div className={`text-xs font-bold truncate ${isActive ? 'text-orange-700 dark:text-orange-400' : 'text-slate-700 dark:text-slate-200'}`}>
                      {img.file.name}
                    </div>
                    <div className="text-[10px] font-mono mt-0.5">
                      {isCompleted ? (
                        <span className="text-green-600 dark:text-green-400">
                          {img.newWidth}px Optimized
                        </span>
                      ) : isEnhancing ? (
                        <span className="text-orange-500 animate-pulse">Sharpening...</span>
                      ) : (
                        <span className="text-slate-400">Ready for upscale</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsGallery;
