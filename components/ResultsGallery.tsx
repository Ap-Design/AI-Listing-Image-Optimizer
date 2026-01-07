
import React, { useState, useEffect } from 'react';
import { ProductImage } from '../types';

interface ResultsGalleryProps {
  images: ProductImage[];
  isPro?: boolean;
  onFinalizeAll: () => void;
}

const ResultsGallery: React.FC<ResultsGalleryProps> = ({ images, isPro, onFinalizeAll }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareVal, setCompareVal] = useState(50);
  const [isZipping, setIsZipping] = useState(false);

  // Filter out images that had errors during processing or initial stages
  const successfulImages = images.filter(img => img.status !== 'error');

  // Initialize selectedId if not set
  useEffect(() => {
    if (!selectedId && successfulImages.length > 0) {
      setSelectedId(successfulImages[0].id);
    }
  }, [successfulImages, selectedId]);

  const selectedImage = successfulImages.find(i => i.id === selectedId);

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `etsyflow-${filename}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = async () => {
    const optimizedImages = successfulImages.filter(img => img.resultUrl || img.draftUrl);
    if (optimizedImages.length === 0) return;
    setIsZipping(true);
    try {
      const JSZipModule = await import('https://esm.sh/jszip');
      const JSZip = JSZipModule.default;
      const zip = new JSZip();
      optimizedImages.forEach((img) => {
        const urlToUse = img.resultUrl || img.draftUrl;
        if (urlToUse) {
          const base64Data = urlToUse.split(',')[1];
          zip.file(`optimized-${img.file.name.replace(/\.[^/.]+$/, "")}.png`, base64Data, { base64: true });
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
      setTimeout(() => URL.revokeObjectURL(zipUrl), 100);
    } catch (error) { 
      console.error(error);
      alert("Zipping failed."); 
    } finally { 
      setIsZipping(false); 
    }
  };

  const hasModifiedImage = selectedImage && (selectedImage.resultUrl || selectedImage.draftUrl);

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-900 p-6 rounded-3xl border border-slate-800 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Review Your Optimized Assets</h2>
          <p className="text-slate-400 text-sm">Compare original vs AI-enhanced studio renders.</p>
        </div>
        <div className="flex space-x-3">
          {!isPro && (
            <button onClick={onFinalizeAll} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg transition-all">
              Finalize All to 4K
            </button>
          )}
          <button 
            onClick={downloadAll} 
            disabled={isZipping || successfulImages.filter(i => i.resultUrl || i.draftUrl).length === 0} 
            className="bg-slate-800 text-white px-6 py-3 rounded-2xl font-bold hover:bg-slate-700 transition-all disabled:opacity-50"
          >
            {isZipping ? 'Packing...' : 'Download Assets'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-lg">
          {selectedImage ? (
            <div className="space-y-8">
              {/* Comparison Slider */}
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 group cursor-ew-resize select-none">
                {hasModifiedImage ? (
                  <>
                    {/* Final/Modified Image (Top Layer) */}
                    <div 
                      className="absolute inset-0 z-10" 
                      style={{ clipPath: `inset(0 ${100 - compareVal}% 0 0)` }}
                    >
                      <img 
                        src={selectedImage.resultUrl || selectedImage.draftUrl} 
                        className="w-full h-full object-cover" 
                        alt="Modified" 
                      />
                      <div className="absolute top-4 left-4 bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg uppercase z-20">
                        {selectedImage.resultUrl ? 'Final 4K Output' : 'AI Draft View'}
                      </div>
                    </div>
                    
                    {/* Original Image (Bottom Layer) - Always the source previewUrl */}
                    <div className="absolute inset-0 z-0">
                      <img 
                        src={selectedImage.previewUrl} 
                        className="w-full h-full object-cover opacity-80" 
                        alt="Original" 
                      />
                      <div className="absolute top-4 right-4 bg-slate-700 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg uppercase z-20">
                        Original Photo
                      </div>
                    </div>

                    {/* Slider Handle */}
                    <div className="absolute inset-y-0 z-20 w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ left: `${compareVal}%` }}>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-xl flex items-center justify-center border-2 border-slate-200">
                        <svg className="w-4 h-4 text-slate-900" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8 5a1 1 0 100 2h4a1 1 0 100-2H8zM8 9a1 1 0 100 2h4a1 1 0 100-2H8zM8 13a1 1 0 100 2h4a1 1 0 100-2H8z"/>
                        </svg>
                      </div>
                    </div>
                    
                    <input 
                      type="range" min="0" max="100" value={compareVal} 
                      onChange={(e) => setCompareVal(parseInt(e.target.value))}
                      className="absolute inset-0 z-30 opacity-0 cursor-ew-resize"
                    />
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-8 text-center">
                    <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-800">
                      <svg className="w-8 h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h4 className="text-white font-bold mb-1">No Modified Preview</h4>
                    <p className="text-slate-500 text-sm">This image failed to process or hasn't been started yet.</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Technical Specs</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-slate-900 rounded-md text-[10px] font-mono text-slate-300">
                      Res: {selectedImage.resultUrl ? '4096px' : selectedImage.draftUrl ? '1024px' : 'N/A'}
                    </span>
                    <span className="px-2 py-1 bg-slate-900 rounded-md text-[10px] font-mono text-slate-300">Format: PNG</span>
                    {selectedImage.isEtsyValidated && (
                      <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded-md text-[10px] font-bold flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                        ETSY VALIDATED
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center sm:justify-end">
                   <button 
                    disabled={!hasModifiedImage}
                    onClick={() => {
                      const url = selectedImage.resultUrl || selectedImage.draftUrl;
                      if (url) downloadImage(url, selectedImage.file.name);
                    }}
                    className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-8 py-3 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
                  >
                    Save Selection
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-40 text-center text-slate-500">Select an asset from the gallery to review.</div>
          )}
        </div>

        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-lg flex flex-col max-h-[750px]">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Gallery Stack</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3 overflow-y-auto pr-2 custom-scrollbar">
            {successfulImages.map(img => (
              <button 
                key={img.id} 
                onClick={() => setSelectedId(img.id)} 
                className={`relative aspect-square rounded-xl overflow-hidden transition-all transform active:scale-95 ${
                  selectedId === img.id 
                    ? 'ring-2 ring-orange-500 ring-offset-4 ring-offset-slate-950 scale-[0.98]' 
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img.previewUrl} className="w-full h-full object-cover" alt="thumb" />
                {(img.resultUrl || img.draftUrl) && (
                  <div className="absolute top-1 right-1 z-10">
                    <div className={`w-3 h-3 rounded-full border border-white shadow-sm ${img.resultUrl ? 'bg-orange-500' : 'bg-blue-500'}`} />
                  </div>
                )}
              </button>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col gap-2">
            <div className="flex items-center text-[10px] text-slate-500 uppercase font-bold">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-2" />
              Final 4K Render
            </div>
            <div className="flex items-center text-[10px] text-slate-500 uppercase font-bold">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
              Initial Draft
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsGallery;
