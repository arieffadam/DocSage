export interface Document {
  documentId: string;
  userId: string;
  timestamp: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  status: DocumentStatus;
  uploadedAt: string;
  extractedText?: string;
  aiAnalysis?: AIAnalysis;
  processedAt?: string;
  analyzedAt?: string;
  updatedAt?: string;
}

export type DocumentStatus = 
  | 'uploaded'
  | 'processing_text'
  | 'text_extracted'
  | 'analyzing'
  | 'completed'
  | 'text_extraction_failed'
  | 'analysis_failed'
  | 'ai_analysis_failed';

export interface AIAnalysis {
  language: {
    dominantLanguage: string;
    confidence: number;
  };
  sentiment: {
    sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED';
    scores: {
      Positive: number;
      Negative: number;
      Neutral: number;
      Mixed: number;
    };
  };
  entities: Entity[];
  keyPhrases: KeyPhrase[];
  analyzedAt: string;
}

export interface Entity {
  text: string;
  type: string;
  confidence: number;
  beginOffset: number;
  endOffset: number;
}

export interface KeyPhrase {
  text: string;
  confidence: number;
  beginOffset: number;
  endOffset: number;
}

export interface UploadResponse {
  documentId: string;
  presignedUrl: string;
  s3Key: string;
}

export interface ReportSummary {
  totalDocuments: number;
  completedDocuments: number;
  processingDocuments: number;
  failedDocuments: number;
  successRate: string;
  sentimentDistribution: Record<string, number>;
  topEntities: Array<{ text: string; count: number }>;
}