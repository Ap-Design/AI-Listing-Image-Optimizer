
export interface ProductImage {
  id: string;
  file: File;
  previewUrl: string;
  base64: string;
  status: 'pending' | 'analyzing' | 'ready' | 'drafting' | 'drafted' | 'finalizing' | 'completed' | 'error';
  suggestedPrompt?: string;
  editedPrompt?: string;
  usedPrompt?: string;
  draftUrl?: string; // High-speed low-res preview
  resultUrl?: string; // High-res 4K output
  error?: string;
  isEtsyValidated?: boolean;
}

export enum ProcessingModel {
  FLASH = 'gemini-2.5-flash-image',
  PRO = 'gemini-3-pro-image-preview'
}

export interface AppState {
  images: ProductImage[];
  isGlobalProcessing: boolean;
  globalPrompt: string;
  currentStep: 'upload' | 'refine' | 'process' | 'results';
  activeProcessMode: 'draft' | 'finalize';
}
