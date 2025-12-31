
import React, { useRef, useState } from 'react';
import { ProductImage } from '../types';

interface ImageUploaderProps {
  onUpload: (images: ProductImage[]) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isConverting, setIsConverting] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    setIsConverting(true);
    const filesArray = Array.from(e.target.files) as File[];
    
    try {
      const newImages: ProductImage[] = await Promise.all(
        filesArray.map(async (file: File) => {
          let processedFile = file;
          const isHeic = 
            file.name.toLowerCase().endsWith('.heic') || 
            file.name.toLowerCase().endsWith('.heif') || 
            file.type === 'image/heic' || 
            file.type === 'image/heif';

          if (isHeic) {
            try {
              // Dynamically import heic2any for HEIC support
              const heic2any = (await import('https://esm.sh/heic2any')).default;
              const convertedBlob = await heic2any({
                blob: file,
                toType: 'image/png',
                quality: 0.8
              });
              
              // heic2any can return an array if the HEIC contains multiple images
              const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
              
              processedFile = new File(
                [finalBlob], 
                file.name.replace(/\.(heic|heif)$/i, ".png"), 
                { type: 'image/png' }
              );
            } catch (convError) {
              console.error("HEIC conversion failed for:", file.name, convError);
              // Fallback to original file, though it will likely fail preview/API
            }
          }

          const previewUrl = URL.createObjectURL(processedFile);
          const base64 = await fileToBase64(processedFile);
          
          return {
            id: Math.random().toString(36).substr(2, 9),
            file: processedFile,
            previewUrl,
            base64,
            status: 'pending' as const
          };
        })
      );

      onUpload(newImages);
    } catch (error) {
      console.error("Error processing files:", error);
    } finally {
      setIsConverting(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  return (
    <div className="max-w-2xl mx-auto text-center py-20">
      <div className="mb-8">
        <div className="w-24 h-24 bg-orange-100 dark:bg-orange-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
          {isConverting ? (
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
          {isConverting ? "Converting High-Res Photos..." : "Bulk Product Image Processing"}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg max-w-md mx-auto">
          {isConverting 
            ? "We're optimizing your HEIC images for processing. This will only take a second." 
            : "Upload your raw product photos. We'll automatically remove backgrounds, enhance quality, and create Etsy-ready studio shots."}
        </p>
      </div>

      <div 
        onClick={() => !isConverting && fileInputRef.current?.click()}
        className={`group relative border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 transition-all bg-white dark:bg-slate-900 shadow-sm ${
          isConverting ? 'opacity-50 cursor-wait' : 'hover:border-orange-300 dark:hover:border-orange-500/50 hover:bg-orange-50/30 dark:hover:bg-orange-500/5 cursor-pointer'
        }`}
      >
        <input 
          type="file" 
          multiple 
          accept="image/*,.heic,.heif" 
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          disabled={isConverting}
        />
        <div className="space-y-4">
          <div className="flex flex-col items-center">
            <span className="text-slate-400 group-hover:text-orange-500 mb-2">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </span>
            <span className="text-lg font-bold text-slate-700 dark:text-slate-200 transition-colors">
              {isConverting ? "Processing Files..." : "Click to upload or drag & drop"}
            </span>
            <span className="text-sm text-slate-400">JPG, PNG, HEIC up to 10MB per image</span>
          </div>
          <button 
            className="bg-slate-900 dark:bg-slate-700 text-white px-6 py-2 rounded-xl font-medium shadow-sm transition-transform group-hover:scale-105"
            disabled={isConverting}
          >
            {isConverting ? "Please wait" : "Select Files"}
          </button>
        </div>
      </div>
      
      <div className="mt-8 flex items-center justify-center space-x-6 text-sm text-slate-400 dark:text-slate-500 font-medium">
        <div className="flex items-center space-x-1">
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
          <span>iPhone Support (HEIC)</span>
        </div>
        <div className="flex items-center space-x-1">
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
          <span>Background Removal</span>
        </div>
        <div className="flex items-center space-x-1">
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
          <span>Studio Lighting</span>
        </div>
      </div>
    </div>
  );
};

export default ImageUploader;
