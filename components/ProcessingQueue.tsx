
import React from 'react';
import { ProductImage } from '../types';

interface ProcessingQueueProps {
  images: ProductImage[];
  isPro?: boolean;
}

const ProcessingQueue: React.FC<ProcessingQueueProps> = ({ images, isPro }) => {
  // Exclude images with error status from the queue display and progress calculation
  const processableImages = images.filter(img => img.status !== 'error');
  // Fix: Removed reference to non-existent 'drafted' status
  const completed = processableImages.filter(i => i.status === 'completed').length;
  const total = processableImages.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          {isPro ? "Pro Product Optimizer Active" : "Enhancing Your Products"}
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          {isPro 
            ? "Upscaling to 2K resolution and applying professional studio post-processing..." 
            : "Processing high-fidelity studio renders. This may take a few moments..."}
        </p>
      </div>

      <div className="mb-8">
        <div className="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
          <span>Overall Progress</span>
          <span>{progress}% ({completed}/{total})</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-4 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ease-out shadow-[0_0_15px_rgba(249,115,22,0.5)] ${isPro ? 'bg-gradient-to-r from-orange-500 to-amber-500' : 'bg-orange-500'}`} 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {processableImages.map(img => {
          // Fix: Replaced 'drafting' and 'finalizing' with valid statuses 'enhancing' and 'analyzing'
          const isProcessing = img.status === 'enhancing' || img.status === 'analyzing';
          // Fix: Removed 'drafted' from check
          const isDone = img.status === 'completed';
          
          return (
            <div key={img.id} className="flex items-center space-x-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
              <div className="relative w-16 h-16 flex-shrink-0">
                <img src={img.previewUrl} alt="Item" className="w-full h-full object-cover rounded-xl" />
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                {isDone && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 shadow-md">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  </div>
                )}
              </div>
              <div className="flex-grow overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{img.file.name}</span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full tracking-wider ${
                    isDone ? 'bg-green-100 dark:bg-green-500/10 text-green-600' : 
                    isProcessing ? 'bg-orange-100 dark:bg-orange-500/10 text-orange-600' : 
                    'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {isProcessing && isPro ? "OPTIMIZING..." : img.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mb-1 italic">
                  {isProcessing && isPro ? "Upscaling to high resolution..." : 
                   isProcessing ? "Processing assets..." : 
                   isDone ? "Etsy-ready file generated" : "Waiting in queue..."}
                </p>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
                  <div 
                    className={`h-full transition-all ${isDone ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`}
                    style={{ width: isDone ? '100%' : isProcessing ? '60%' : '0%' }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProcessingQueue;
