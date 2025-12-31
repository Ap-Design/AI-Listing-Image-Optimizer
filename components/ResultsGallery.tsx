
import React, { useState } from 'react';
import { ProductImage } from '../types';

interface ResultsGalleryProps {
  images: ProductImage[];
  isPro?: boolean;
}

const ResultsGallery: React.FC<ResultsGalleryProps> = ({ images, isPro }) => {
  const [selectedId, setSelectedId] = useState<string | null>(images[0]?.id || null);
  const [isZipping, setIsZipping] = useState(false);
  const selectedImage = images.find(i => i.id === selectedId);

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `etsyflow-${filename}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = async () => {
    const optimizedImages = images.filter(img => img.resultUrl);
    if (optimizedImages.length === 0) return;

    setIsZipping(true);
    try {
      // Dynamically import JSZip for zipping functionality
      const JSZipModule = await import('https://esm.sh/jszip');
      const JSZip = JSZipModule.default;
      const zip = new JSZip();
      
      optimizedImages.forEach((img) => {
        if (img.resultUrl) {
          // Extract base64 data (after the comma)
          const base64Data = img.resultUrl.split(',')[1];
          // Clean filename and ensure .png extension since Gemini returns PNG data
          const cleanName = img.file.name.replace(/\.[^/.]+$/, "") + ".png";
          zip.file(`optimized-${cleanName}`, base64Data, { base64: true });
        }
      });
      
      const content = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(content);
      
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = `etsyflow-optimized-assets.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL
      setTimeout(() => URL.revokeObjectURL(zipUrl), 100);
    } catch (error) {
      console.error("Zipping failed:", error);
      alert("Failed to create ZIP file. Please try downloading images individually.");
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Your Etsy Store is Ready</h2>
          <p className="text-slate-500 dark:text-slate-400">
            {isPro ? "Optimized with Pro Upscaler (2K Minimum Met)" : "Standard high-fidelity renders for your listings."}
          </p>
        </div>
        <button 
          onClick={downloadAll}
          disabled={isZipping || images.filter(i => i.resultUrl).length === 0}
          className="bg-slate-900 dark:bg-slate-700 text-white px-8 py-3 rounded-full font-bold shadow-xl hover:bg-slate-800 dark:hover:bg-slate-600 transition-all flex items-center group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isZipping ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Creating ZIP...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2 transition-transform group-hover:translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download All Assets (.zip)
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Comparison Viewer */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-lg h-fit">
          {selectedImage ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 text-center">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Original Raw</span>
                  <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
                    <img src={selectedImage.previewUrl} className="w-full h-full object-cover" alt="Original" />
                  </div>
                </div>
                <div className="space-y-2 text-center">
                  <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest block mb-2">Optimized Pro Output</span>
                  <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-orange-500 shadow-2xl relative">
                    {selectedImage.resultUrl ? (
                      <>
                        <img src={selectedImage.resultUrl} className="w-full h-full object-cover" alt="Optimized" />
                        {isPro && (
                          <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-md rounded-md">
                            <span className="text-[9px] text-white font-bold flex items-center">
                              <svg className="w-2.5 h-2.5 mr-1 text-orange-500" fill="currentColor" viewBox="0 0 20 20"><path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"/></svg>
                              OPTIMIZED
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 italic text-sm">
                        No image generated
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Optimized Prompt Strategy</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 italic leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  "{selectedImage.editedPrompt || "Default studio style applied"}"
                </p>
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex space-x-2">
                    <span className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {isPro ? "2048 x 2048" : "1024 x 1024"}
                    </span>
                    <span className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-500 dark:text-slate-400">PNG</span>
                    {isPro && selectedImage.isEtsyValidated && (
                      <span className="px-3 py-1 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg text-[10px] font-bold text-green-600">
                        ETSY VALIDATED
                      </span>
                    )}
                  </div>
                  <button 
                    disabled={!selectedImage.resultUrl}
                    onClick={() => selectedImage.resultUrl && downloadImage(selectedImage.resultUrl, selectedImage.file.name)}
                    className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-6 py-2 rounded-xl transition-all disabled:opacity-50 shadow-md shadow-orange-500/20"
                  >
                    Download Selection
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-40 text-slate-400">
              Select an image from the gallery to compare
            </div>
          )}
        </div>

        {/* Thumbnail Selector */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-lg max-h-[700px] overflow-y-auto">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 sticky top-0 bg-white dark:bg-slate-900 z-10 py-2">Assets Gallery</h3>
          <div className="grid grid-cols-2 gap-4">
            {images.map(img => (
              <button 
                key={img.id}
                onClick={() => setSelectedId(img.id)}
                className={`group relative aspect-square rounded-2xl overflow-hidden transition-all duration-300 ${
                  selectedId === img.id ? 'ring-4 ring-orange-500 ring-offset-2 dark:ring-offset-slate-950' : 'hover:scale-105 opacity-80 hover:opacity-100'
                }`}
              >
                <img 
                  src={img.resultUrl || img.previewUrl} 
                  className={`w-full h-full object-cover ${!img.resultUrl ? 'grayscale opacity-50' : ''}`} 
                  alt="Thumb" 
                />
                {!img.resultUrl && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <svg className="w-6 h-6 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                )}
                {img.resultUrl && (
                  <div className="absolute bottom-2 right-2 flex items-center bg-green-500 text-white rounded-full px-2 py-0.5 shadow-lg text-[8px] font-black">
                    {isPro ? "2K" : "1K"}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsGallery;
