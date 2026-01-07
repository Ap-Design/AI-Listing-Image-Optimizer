
import React, { useRef, useState } from 'react';
import { ProductImage } from '../types';

interface ImageUploaderProps {
  onUpload: (images: ProductImage[]) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  /**
   * Resizes an image to a "Large" format (max 2048px).
   * This is critical for mobile browsers to prevent memory crashes when handling 
   * high-res iPhone photos (48MP+).
   */
  const resizeToLarge = async (blob: Blob, fileName: string): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        
        // "Large" target: 2048px is standard for web/Etsy while being memory-safe
        const MAX_DIM = 2048; 
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error("Canvas context creation failed"));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (resizedBlob) => {
            if (!resizedBlob) {
              reject(new Error("Compression failed"));
              return;
            }
            const cleanName = fileName.replace(/\.(heic|heif)$/i, ".jpg");
            resolve(new File([resizedBlob], cleanName, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          0.85
        );
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to decode image for resizing"));
      };
      
      img.src = url;
    });
  };

  /**
   * Enhanced error stringification to avoid [object Object]
   */
  const stringifyError = (err: any): string => {
    if (!err) return "Unknown error";
    
    let message = "";
    if (typeof err === 'string') {
      message = err;
    } else if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === 'object') {
      // Check for common error properties
      message = err.message || err.error || err.reason || (err.code ? `Code: ${err.code}` : JSON.stringify(err));
    } else {
      message = String(err);
    }

    if (message.includes('ERR_LIBHEIF') || message.includes('not supported') || message.includes('libheif')) {
      return "ERR_LIBHEIF: This format is not supported by the browser decoder. This usually happens with 'Live Photos' or 'Burst' sequences.";
    }

    return message;
  };

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;
    
    setIsConverting(true);
    const newImages: ProductImage[] = [];

    try {
      let heic2any: any = null;
      try {
        const module: any = await import('heic2any');
        heic2any = module.default || module;
        if (typeof heic2any !== 'function' && heic2any.heic2any) {
          heic2any = heic2any.heic2any;
        }
      } catch (e) {
        console.error("heic2any load failed:", e);
      }

      for (const file of files) {
        const lowerName = file.name.toLowerCase();
        const isHeicOrHeif = lowerName.endsWith('.heic') || lowerName.endsWith('.heif') || file.type.includes('heic') || file.type.includes('heif');

        try {
          // Allow up to 10MB as per user request
          if (file.size > 10 * 1024 * 1024) throw new Error("File exceeds 10MB limit.");

          let processedFile: File;
          if (isHeicOrHeif) {
            if (!heic2any) throw new Error("HEIC conversion library unavailable.");
            
            // Try conversion
            const result = await heic2any({
              blob: file,
              toType: 'image/jpeg',
              quality: 0.6,
            });
            const convertedBlob = Array.isArray(result) ? result[0] : result;
            
            // Mandatory "Large" resizing to prevent memory crashes on Actual Size photos
            processedFile = await resizeToLarge(convertedBlob, file.name);
          } else {
            // JPG/PNG: Still resize to "Large" if they are huge
            processedFile = await resizeToLarge(file, file.name);
          }

          const previewUrl = URL.createObjectURL(processedFile);
          const base64 = await fileToBase64(processedFile);
          
          newImages.push({
            id: Math.random().toString(36).substr(2, 9),
            file: processedFile,
            previewUrl,
            base64,
            status: 'pending'
          });
        } catch (err: any) {
          console.error(`Error for ${file.name}:`, err);
          const msg = stringifyError(err);
          
          let fallbackUrl = "";
          try { fallbackUrl = URL.createObjectURL(file); } catch(e) {}

          newImages.push({
            id: Math.random().toString(36).substr(2, 9),
            file,
            previewUrl: fallbackUrl,
            base64: '',
            status: 'error',
            error: msg
          });
        }
      }
      
      if (newImages.length > 0) {
        onUpload(newImages);
      }
    } catch (error) {
      console.error("Batch processing failed:", error);
    } finally {
      setIsConverting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64Part = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64Part);
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
          {isConverting ? "Optimizing Assets..." : "Bulk Product Image Optimizer"}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg max-w-md mx-auto">
          {isConverting 
            ? "Preparing your photos for professional AI generation. High-res HEIF files are being optimized and resized to Large." 
            : "Upload raw photos (up to 10MB). We'll handle iPhone HEIF formats, resize them to Large for studio-grade results."}
        </p>
      </div>

      <div 
        onClick={() => !isConverting && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (!isConverting && e.dataTransfer.files) processFiles(Array.from(e.dataTransfer.files)); }}
        className={`group relative border-4 border-dashed rounded-3xl p-12 transition-all bg-white dark:bg-slate-900 shadow-sm ${
          isConverting ? 'opacity-50 cursor-wait border-slate-200 dark:border-slate-800' : 
          isDragging ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-500/10 cursor-copy' :
          'border-slate-200 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-500/50 hover:bg-orange-50/30 dark:hover:bg-orange-500/5 cursor-pointer'
        }`}
      >
        <input 
          type="file" 
          multiple 
          accept="image/*,.heic,.heif" 
          ref={fileInputRef}
          onChange={(e) => e.target.files && processFiles(Array.from(e.target.files))}
          className="hidden"
          disabled={isConverting}
        />
        <div className="space-y-4">
          <div className="flex flex-col items-center">
            <span className={`transition-colors mb-2 ${isDragging ? 'text-orange-600' : 'text-slate-400 group-hover:text-orange-500'}`}>
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </span>
            <span className="text-lg font-bold text-slate-700 dark:text-slate-200 transition-colors">
              {isConverting ? "Analyzing Gallery..." : isDragging ? "Ready to drop" : "Select or drag & drop photos"}
            </span>
            <span className="text-sm text-slate-400 font-medium tracking-tight">iPhone HEIF / HEIC Support (Max 10MB)</span>
          </div>
          <button 
            className="bg-slate-900 dark:bg-slate-700 text-white px-8 py-3 rounded-2xl font-bold shadow-md transition-all group-hover:scale-105"
            disabled={isConverting}
            onClick={(e) => { e.stopPropagation(); !isConverting && fileInputRef.current?.click(); }}
          >
            {isConverting ? "Processing..." : "Select Photos"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageUploader;
