import React, { useState, useCallback } from 'react';
import { docSageService } from '../services/docSageService';

interface DocumentUploadProps {
  onUploadComplete: () => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate file
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('File size must be less than 10MB');
      }

      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/tiff',
        'text/plain',
      ];

      if (!allowedTypes.includes(file.type)) {
        throw new Error('File type not supported. Please upload PDF, JPEG, PNG, TIFF, or TXT files.');
      }

      const response = await docSageService.uploadDocument(file);
      setSuccess(`Document "${file.name}" uploaded successfully!`);
      onUploadComplete();
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  return (
    <div className="card">
      <h2>📄 Upload Document</h2>
      <p>Upload documents for AI-powered analysis including text extraction, sentiment analysis, and entity recognition.</p>
      
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div
        className={`upload-area ${dragOver ? 'dragover' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <input
          id="fileInput"
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          accept=".pdf,.jpg,.jpeg,.png,.tiff,.txt"
          disabled={uploading}
        />
        
        {uploading ? (
          <div>
            <div>📤 Uploading...</div>
            <div style={{ marginTop: '1rem', color: '#666' }}>
              Please wait while we upload your document
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
            <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
              Drop files here or click to upload
            </div>
            <div style={{ color: '#666', fontSize: '0.9rem' }}>
              Supports PDF, JPEG, PNG, TIFF, and TXT files (max 10MB)
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '1rem', color: '#666', fontSize: '0.9rem' }}>
        <strong>Supported Analysis:</strong>
        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
          <li>Text extraction using Amazon Textract</li>
          <li>Sentiment analysis (Positive, Negative, Neutral, Mixed)</li>
          <li>Entity recognition (People, Organizations, Locations, etc.)</li>
          <li>Key phrase extraction</li>
          <li>Language detection</li>
        </ul>
      </div>
    </div>
  );
};

export default DocumentUpload;