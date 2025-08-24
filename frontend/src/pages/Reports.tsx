import React, { useState, useEffect } from 'react';
import { docSageService } from '../services/docSageService';
import { ReportSummary } from '../types';

const Reports: React.FC = () => {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await docSageService.getReports('json');
      setSummary(response.summary);
    } catch (error) {
      console.error('Error loading reports:', error);
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (format: 'csv' | 'pdf') => {
    try {
      setDownloading(format);
      const response = await docSageService.downloadReport(format);
      
      // Open download link in new tab
      window.open(response.downloadUrl, '_blank');
    } catch (error) {
      console.error('Error downloading report:', error);
      setError(`Failed to generate ${format.toUpperCase()} report`);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading reports...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">{error}</div>
        <button className="btn" onClick={loadReports}>
          Retry
        </button>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="container">
        <div className="card">
          <h2>📊 Reports & Analytics</h2>
          <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📈</div>
            <h3>No data available</h3>
            <p>Upload and process some documents to see analytics!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>📊 Reports & Analytics</h2>
          <div>
            <button
              className="btn"
              onClick={() => downloadReport('csv')}
              disabled={downloading === 'csv'}
              style={{ marginRight: '1rem' }}
            >
              {downloading === 'csv' ? '⏳ Generating...' : '📄 Download CSV'}
            </button>
            <button
              className="btn"
              onClick={() => downloadReport('pdf')}
              disabled={downloading === 'pdf'}
            >
              {downloading === 'pdf' ? '⏳ Generating...' : '📑 Download PDF'}
            </button>
          </div>
        </div>

        {/* Summary Statistics */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem', 
          marginBottom: '2rem' 
        }}>
          <div className="analysis-summary">
            <h3 style={{ margin: 0, color: '#667eea' }}>{summary.totalDocuments}</h3>
            <p style={{ margin: '0.5rem 0 0', color: '#666' }}>Total Documents</p>
          </div>
          <div className="analysis-summary">
            <h3 style={{ margin: 0, color: '#28a745' }}>{summary.completedDocuments}</h3>
            <p style={{ margin: '0.5rem 0 0', color: '#666' }}>Completed</p>
          </div>
          <div className="analysis-summary">
            <h3 style={{ margin: 0, color: '#ffc107' }}>{summary.processingDocuments}</h3>
            <p style={{ margin: '0.5rem 0 0', color: '#666' }}>Processing</p>
          </div>
          <div className="analysis-summary">
            <h3 style={{ margin: 0, color: '#dc3545' }}>{summary.failedDocuments}</h3>
            <p style={{ margin: '0.5rem 0 0', color: '#666' }}>Failed</p>
          </div>
        </div>

        {/* Success Rate */}
        <div className="analysis-summary" style={{ marginBottom: '2rem' }}>
          <h3>✅ Success Rate</h3>
          <div style={{ fontSize: '2rem', color: '#28a745', fontWeight: 'bold' }}>
            {summary.successRate}%
          </div>
          <div style={{ 
            background: '#e9ecef', 
            height: '10px', 
            borderRadius: '5px', 
            marginTop: '1rem',
            overflow: 'hidden'
          }}>
            <div style={{ 
              background: 'linear-gradient(90deg, #28a745 0%, #20c997 100%)', 
              height: '100%', 
              width: `${summary.successRate}%`,
              transition: 'width 0.3s ease'
            }}></div>
          </div>
        </div>

        {/* Sentiment Distribution */}
        {Object.keys(summary.sentimentDistribution).length > 0 && (
          <div className="analysis-summary" style={{ marginBottom: '2rem' }}>
            <h3>😊 Sentiment Distribution</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              {Object.entries(summary.sentimentDistribution).map(([sentiment, count]) => {
                const percentage = summary.totalDocuments > 0 
                  ? ((count / summary.totalDocuments) * 100).toFixed(1) 
                  : '0';
                
                return (
                  <div key={sentiment} style={{ textAlign: 'center' }}>
                    <div className={`sentiment sentiment-${sentiment.toLowerCase()}`} style={{ 
                      display: 'block', 
                      padding: '0.5rem', 
                      marginBottom: '0.5rem',
                      fontSize: '1.2rem'
                    }}>
                      {sentiment}
                    </div>
                    <div style={{ fontWeight: 'bold' }}>{count} docs</div>
                    <div style={{ color: '#666', fontSize: '0.9rem' }}>{percentage}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Entities */}
        {summary.topEntities && summary.topEntities.length > 0 && (
          <div className="analysis-summary">
            <h3>🏷️ Most Common Entities</h3>
            <div style={{ maxHeight: '300px', overflow: 'auto' }}>
              {summary.topEntities.map((entity, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '0.75rem 0',
                  borderBottom: index < summary.topEntities.length - 1 ? '1px solid #eee' : 'none'
                }}>
                  <span style={{ fontWeight: '500' }}>#{index + 1} {entity.text}</span>
                  <span className="entity-tag">
                    {entity.count} mention{entity.count !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#666', textAlign: 'center' }}>
          <p>📊 Analytics are updated in real-time as documents are processed.</p>
          <p>
            💡 <strong>Tip:</strong> For detailed insights, consider integrating with Amazon QuickSight 
            for advanced visualization and business intelligence.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Reports;