import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import { AmplifyProvider } from '@aws-amplify/ui-react';
import App from './App';
import './index.css';

// Configure Amplify
// Note: In production, these values would come from environment variables
// or be populated during build/deployment
Amplify.configure({
  Auth: {
    region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
    userPoolId: process.env.REACT_APP_USER_POOL_ID || '',
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID || '',
  },
  API: {
    endpoints: [
      {
        name: 'DocSageAPI',
        endpoint: process.env.REACT_APP_API_GATEWAY_URL || '',
        region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
      },
    ],
  },
  Storage: {
    AWSS3: {
      bucket: process.env.REACT_APP_S3_BUCKET || '',
      region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
    },
  },
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <AmplifyProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AmplifyProvider>
  </React.StrictMode>
);