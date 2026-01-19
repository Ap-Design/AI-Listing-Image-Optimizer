
import React, { useRef, useState } from 'react';
import { ProductImage } from '../types';

interface ImageUploaderProps {
  onUpload: (images: ProductImage[]) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setIsProcessing(true);
    const newImages: ProductImage[] = [];

    for (const file of files) {
      try {
        const { base64, width, height } = await fileToData(file);
        // Simple heuristic: Etsy recommends 2000px on shortest side.
        const isLowRes = width < 2000 || height < 2000;

        newImages.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          previewUrl: URL.createObjectURL(file),
          base64,
          status: 'pending',
          originalWidth: width,
          originalHeight: height,
          resolutionHealth: isLowRes ? 'needs_upscale' : 'good'
        });
      } catch (err) {
        console.error(err);
      }
    }
    
    if (newImages.length > 0) onUpload(newImages);
    setIsProcessing(false);
  };

  const fileToData = (file: File): Promise<{ base64: string, width: number, height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const res = reader.result as string;
          resolve({
            base64: res.split(',')[1],
            width: img.width,
            height: img.height
          });
        };
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  return (
    <div className="max-w-2xl mx-auto text-center py-20">
      <div 
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) processFiles(Array.from(e.dataTransfer.files)); }}
        className={`border-4 border-dashed rounded-3xl p-16 cursor-pointer transition-all ${
          isDragging ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10' : 'border-slate-200 dark:border-slate-800 hover:border-orange-400'
        }`}
      >
        <input type="file" multiple accept="image/*" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files && processFiles(Array.from(e.target.files))} />
        <div className="flex flex-col items-center space-y-4">
          <div className="w-20 h-20 bg-orange-100 dark:bg-orange-500/20 rounded-full flex items-center justify-center text-orange-500">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Drop Product Photos</h3>
            <p className="text-slate-500 mt-2">Supports JPG, PNG, HEIC. We'll check resolution automatically.</p>
          </div>
          {isProcessing && <p className="text-orange-500 font-bold animate-pulse">Analyzing dimensions...</p>}
        </div>
      </div>
    </div>
  );
};

export default ImageUploader;
