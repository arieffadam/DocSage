import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { withAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';

const App: React.FC = () => {
  const location = useLocation();

  return (
    <div>
      {/* Header */}
      <div className="header">
        <div className="container">
          <h1>📄🧠 DocSage</h1>
          <p>AI-Powered Document Analysis Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="navigation">
        <div className="nav-container">
          <div className="nav-links">
            <Link 
              to="/" 
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            >
              🏠 Dashboard
            </Link>
            <Link 
              to="/reports" 
              className={`nav-link ${location.pathname === '/reports' ? 'active' : ''}`}
            >
              📊 Reports
            </Link>
          </div>
          <div>
            <button 
              className="btn btn-secondary"
              onClick={() => {
                // This will be handled by the withAuthenticator HOC
                window.location.reload();
              }}
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>

      {/* Footer */}
      <footer style={{ 
        background: '#f8f9fa', 
        padding: '2rem 0', 
        marginTop: '4rem',
        textAlign: 'center',
        color: '#666'
      }}>
        <div className="container">
          <h3>🚀 DocSage Features</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '2rem',
            marginTop: '2rem'
          }}>
            <div>
              <h4>🔒 Secure Upload</h4>
              <p>Amazon S3 + Cognito authentication ensures your documents are safe and secure.</p>
            </div>
            <div>
              <h4>📖 Text Extraction</h4>
              <p>Amazon Textract automatically extracts text from PDFs, images, and scanned documents.</p>
            </div>
            <div>
              <h4>🧠 AI Analysis</h4>
              <p>Amazon Comprehend provides sentiment analysis, entity recognition, and key phrase extraction.</p>
            </div>
            <div>
              <h4>📊 Smart Reports</h4>
              <p>Generate downloadable CSV and PDF reports with comprehensive analytics.</p>
            </div>
          </div>
          
          <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #ddd' }}>
            <p>
              <strong>Powered by:</strong> AWS Lambda • S3 • DynamoDB • Textract • Comprehend • API Gateway • Cognito
            </p>
            <p style={{ fontSize: '0.9rem' }}>
              Fully serverless architecture built with AWS CDK
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Export with authentication wrapper
export default withAuthenticator(App, {
  signUpAttributes: ['email'],
  socialProviders: [],
});