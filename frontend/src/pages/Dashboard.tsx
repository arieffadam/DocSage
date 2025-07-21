import React, { useState, useEffect } from 'react';
import DocumentUpload from '../components/DocumentUpload';
import DocumentCard from '../components/DocumentCard';
import { docSageService } from '../services/docSageService';
import { Document } from '../types';

const Dashboard: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await docSageService.getDocuments();
      setDocuments(response.documents);
    } catch (error) {
      console.error('Error loading documents:', error);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = () => {
    loadDocuments();
  };

  const handleViewAnalysis = async (documentId: string) => {
    try {
      const document = documents.find(doc => doc.documentId === documentId);
      if (document) {
        setSelectedDocument(document);
      }
    } catch (error) {
      console.error('Error viewing analysis:', error);
    }
  };

  const renderAnalysisModal = () => {
    if (!selectedDocument || !selectedDocument.aiAnalysis) return null;

    const analysis = selectedDocument.aiAnalysis;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '2rem',
          maxWidth: '800px',
          maxHeight: '80vh',
          overflow: 'auto',
          margin: '2rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2>📊 Analysis Results</h2>
            <button
              className="btn btn-secondary"
              onClick={() => setSelectedDocument(null)}
            >
              ✕ Close
            </button>
          </div>

          <h3>📄 {selectedDocument.fileName}</h3>

          <div className="analysis-summary" style={{ marginBottom: '2rem' }}>
            <h4>🌍 Language Detection</h4>
            <p>
              <strong>Language:</strong> {analysis.language.dominantLanguage.toUpperCase()}<br />
              <strong>Confidence:</strong> {(analysis.language.confidence * 100).toFixed(1)}%
            </p>
          </div>

          <div className="analysis-summary" style={{ marginBottom: '2rem' }}>
            <h4>😊 Sentiment Analysis</h4>
            <p>
              <strong>Overall Sentiment:</strong>{' '}
              <span className={`sentiment sentiment-${analysis.sentiment.sentiment.toLowerCase()}`}>
                {analysis.sentiment.sentiment}
              </span>
            </p>
            <div style={{ marginTop: '1rem' }}>
              <div>Positive: {(analysis.sentiment.scores.Positive * 100).toFixed(1)}%</div>
              <div>Negative: {(analysis.sentiment.scores.Negative * 100).toFixed(1)}%</div>
              <div>Neutral: {(analysis.sentiment.scores.Neutral * 100).toFixed(1)}%</div>
              <div>Mixed: {(analysis.sentiment.scores.Mixed * 100).toFixed(1)}%</div>
            </div>
          </div>

          {analysis.entities && analysis.entities.length > 0 && (
            <div className="analysis-summary" style={{ marginBottom: '2rem' }}>
              <h4>🏷️ Named Entities ({analysis.entities.length})</h4>
              <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                {analysis.entities.map((entity, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    padding: '0.5rem 0',
                    borderBottom: '1px solid #eee'
                  }}>
                    <span>
                      <strong>{entity.text}</strong> <em>({entity.type})</em>
                    </span>
                    <span>{(entity.confidence * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.keyPhrases && analysis.keyPhrases.length > 0 && (
            <div className="analysis-summary">
              <h4>🔑 Key Phrases ({analysis.keyPhrases.length})</h4>
              <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                {analysis.keyPhrases.map((phrase, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    padding: '0.5rem 0',
                    borderBottom: '1px solid #eee'
                  }}>
                    <span>{phrase.text}</span>
                    <span>{(phrase.confidence * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#666' }}>
            <strong>Analysis completed:</strong> {new Date(analysis.analyzedAt).toLocaleString()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container">
      <DocumentUpload onUploadComplete={handleUploadComplete} />

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>📚 Your Documents</h2>
          <button
            className="btn btn-secondary"
            onClick={loadDocuments}
            disabled={loading}
          >
            🔄 Refresh
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        {loading ? (
          <div className="loading">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
            <h3>No documents yet</h3>
            <p>Upload your first document to get started with AI-powered analysis!</p>
          </div>
        ) : (
          <div className="document-grid">
            {documents.map((document) => (
              <DocumentCard
                key={document.documentId}
                document={document}
                onViewAnalysis={handleViewAnalysis}
              />
            ))}
          </div>
        )}
      </div>

      {renderAnalysisModal()}
    </div>
  );
};

export default Dashboard;