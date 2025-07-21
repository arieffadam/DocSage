import React from 'react';
import { Document } from '../types';

interface DocumentCardProps {
  document: Document;
  onViewAnalysis: (documentId: string) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ document, onViewAnalysis }) => {
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'status-completed';
      case 'processing_text':
      case 'analyzing':
      case 'text_extracted':
        return 'status-processing';
      case 'text_extraction_failed':
      case 'analysis_failed':
      case 'ai_analysis_failed':
        return 'status-failed';
      default:
        return 'status-uploaded';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploaded':
        return 'Uploaded';
      case 'processing_text':
        return 'Extracting Text';
      case 'text_extracted':
        return 'Text Extracted';
      case 'analyzing':
        return 'Analyzing';
      case 'completed':
        return 'Completed';
      case 'text_extraction_failed':
        return 'Text Extraction Failed';
      case 'analysis_failed':
        return 'Analysis Failed';
      case 'ai_analysis_failed':
        return 'AI Analysis Failed';
      default:
        return status;
    }
  };

  const getSentimentClass = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return 'sentiment-positive';
      case 'negative':
        return 'sentiment-negative';
      case 'neutral':
        return 'sentiment-neutral';
      case 'mixed':
        return 'sentiment-mixed';
      default:
        return '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="document-card">
      <div className="document-header">
        <h3 className="document-title">{document.fileName}</h3>
        <span className={`document-status ${getStatusClass(document.status)}`}>
          {getStatusText(document.status)}
        </span>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
          <strong>Uploaded:</strong> {formatDate(document.uploadedAt)}
        </div>
        <div style={{ fontSize: '0.9rem', color: '#666' }}>
          <strong>Size:</strong> {formatFileSize(document.fileSize)}
        </div>
      </div>

      {document.aiAnalysis && (
        <div className="analysis-summary">
          <div style={{ marginBottom: '1rem' }}>
            <strong>Sentiment:</strong>{' '}
            <span className={`sentiment ${getSentimentClass(document.aiAnalysis.sentiment.sentiment)}`}>
              {document.aiAnalysis.sentiment.sentiment}
            </span>
            <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#666' }}>
              ({(document.aiAnalysis.sentiment.scores.Positive * 100).toFixed(1)}% positive)
            </span>
          </div>

          {document.aiAnalysis.language && (
            <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#666' }}>
              <strong>Language:</strong> {document.aiAnalysis.language.dominantLanguage.toUpperCase()}
              {' '}({(document.aiAnalysis.language.confidence * 100).toFixed(1)}% confidence)
            </div>
          )}

          {document.aiAnalysis.entities && document.aiAnalysis.entities.length > 0 && (
            <div className="entity-list">
              <strong style={{ fontSize: '0.9rem' }}>Key Entities:</strong>
              <div style={{ marginTop: '0.5rem' }}>
                {document.aiAnalysis.entities.slice(0, 5).map((entity, index) => (
                  <span key={index} className="entity-tag">
                    {entity.text}
                  </span>
                ))}
                {document.aiAnalysis.entities.length > 5 && (
                  <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '0.5rem' }}>
                    +{document.aiAnalysis.entities.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}

          {document.aiAnalysis.keyPhrases && document.aiAnalysis.keyPhrases.length > 0 && (
            <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
              <strong>Key Phrases:</strong> {document.aiAnalysis.keyPhrases.length} detected
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '1.5rem' }}>
        {document.status === 'completed' && document.aiAnalysis && (
          <button
            className="btn"
            onClick={() => onViewAnalysis(document.documentId)}
            style={{ marginRight: '0.5rem' }}
          >
            View Full Analysis
          </button>
        )}
        
        {document.status === 'processing_text' && (
          <div style={{ color: '#666', fontSize: '0.9rem' }}>
            🔄 Extracting text from document...
          </div>
        )}
        
        {document.status === 'analyzing' && (
          <div style={{ color: '#666', fontSize: '0.9rem' }}>
            🧠 Analyzing content with AI...
          </div>
        )}
        
        {document.status.includes('failed') && (
          <div style={{ color: '#dc3545', fontSize: '0.9rem' }}>
            ❌ Processing failed. Please try uploading again.
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentCard;