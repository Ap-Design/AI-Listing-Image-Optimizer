
export interface ProductImage {
  id: string;
  file: File;
  previewUrl: string;
  base64: string;
  // Status flow: Upload -> Analyzing (Vision) -> Analyzed -> Enhancing (Replicate) -> Completed
  status: 'pending' | 'analyzing' | 'analyzed' | 'enhancing' | 'completed' | 'error';
  
  // Resolution Metrics
  originalWidth: number;
  originalHeight: number;
  newWidth?: number;
  newHeight?: number;
  resolutionHealth: 'good' | 'needs_upscale';

  // AI Generated SEO Data
  seo?: {
    title: string;
    tags: string[];
    category: string;
    visualDescription: string;
  };

  // Results
  resultUrl?: string;
  error?: string;
}

export interface AppState {
  images: ProductImage[];
  isGlobalProcessing: boolean;
  currentStep: 'upload' | 'dashboard' | 'results';
  enhancementMode: 'polish' | 'master';
}
