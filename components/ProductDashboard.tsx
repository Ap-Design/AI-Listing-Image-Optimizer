
import React from 'react';
import { ProductImage } from '../types';

interface ProductDashboardProps {
  images: ProductImage[];
  onRemoveImage: (id: string) => void;
  onProcess: (mode: 'polish' | 'master') => void;
}

const ProductDashboard: React.FC<ProductDashboardProps> = ({ images, onRemoveImage, onProcess }) => {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Image Batch Ready</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Review resolution health and prepare your batch for professional AI optimization.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map(img => {
          const isError = img.status === 'error';
          const isGoodRes = img.resolutionHealth === 'good';

          return (
            <div key={img.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col relative group">
               <button 
                onClick={() => onRemoveImage(img.id)}
                className="absolute top-2 right-2 z-20 p-1.5 bg-white/90 dark:bg-slate-800/90 text-slate-500 hover:text-red-500 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              {/* Image Preview Area */}
              <div className="w-full aspect-video relative bg-slate-100 dark:bg-slate-950 overflow-hidden">
                <img src={img.previewUrl} alt="Product" className={`w-full h-full object-cover ${isError ? 'grayscale opacity-50' : ''}`} />
                
                {/* Resolution Badge */}
                <div className={`absolute bottom-2 left-2 px-2 py-1 rounded-md text-[10px] font-bold backdrop-blur-md border ${
                  isGoodRes 
                    ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' 
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                }`}>
                  {img.originalWidth} x {img.originalHeight}px
                </div>
              </div>

              {/* Status Info */}
              <div className="p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate pr-4">{img.file.name}</h4>
                  {isGoodRes ? (
                    <span className="text-[10px] font-bold text-green-500 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                      OPTIMAL
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-500 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                      UPSCALING RECOMMENDED
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">Ready for batch processing.</p>
              </div>
            </div>
          );
        })}
      </div>

       {/* Action Bar */}
       <div className="fixed bottom-0 left-0 right-0 p-6 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-sm text-slate-400">
            <strong className="text-white">{images.length}</strong> assets selected
          </div>
          <div className="flex space-x-4">
            <button 
              onClick={() => onProcess('polish')}
              className="px-6 py-3 rounded-xl font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Polish (Standard Upscale)
            </button>
            <button 
              onClick={() => onProcess('master')}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold shadow-lg shadow-orange-500/25 hover:scale-105 transition-transform flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Master (Ultra 4x Detail)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDashboard;
