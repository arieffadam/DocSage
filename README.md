# DocSage 📄🧠

An end-to-end AWS solution for uploading, storing, and analyzing documents with AI-powered insights.

## 🚀 Features

✅ **Secure Document Upload** (S3 + Cognito Auth)  
✅ **Text Extraction** (Amazon Textract)  
✅ **AI Analysis** (Sentiment, Entities via Comprehend)  
✅ **Dashboard & Reports** (QuickSight + Downloadable CSV/PDF)  
✅ **Fully Serverless** (Lambda, DynamoDB, S3, API Gateway)  

## 🏗️ Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │────│ API Gateway │────│   Lambda    │
│  (React)    │    │             │    │  Functions  │
└─────────────┘    └─────────────┘    └─────────────┘
                                              │
                   ┌─────────────┐    ┌─────────────┐
                   │   Cognito   │    │  DynamoDB   │
                   │    Auth     │    │  Metadata   │
                   └─────────────┘    └─────────────┘
                           
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│     S3      │────│  Textract   │────│ Comprehend  │
│  Documents  │    │    OCR      │    │ AI Analysis │
└─────────────┘    └─────────────┘    └─────────────┘
                                              │
                   ┌─────────────┐    ┌─────────────┐
                   │ QuickSight  │    │   Reports   │
                   │ Dashboard   │    │  (CSV/PDF)  │
                   └─────────────┘    └─────────────┘
```

## 📁 Project Structure

```
DocSage/
├── backend/                 # Lambda functions & APIs
│   ├── src/
│   │   ├── handlers/       # Lambda function handlers
│   │   └── utils/          # Shared utilities
│   └── tests/              # Backend tests
├── frontend/               # React web application
│   ├── src/
│   └── public/
├── infrastructure/         # AWS CDK infrastructure code
└── docs/                   # Documentation
```

## 🚀 Quick Start

### Prerequisites
- AWS CLI configured
- Node.js 18+ installed
- AWS CDK installed (`npm install -g aws-cdk`)

### Deployment

1. **Clone the repository**
   ```bash
   git clone https://github.com/arieffadam/DocSage.git
   cd DocSage
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Deploy infrastructure**
   ```bash
   npm run deploy
   ```

4. **Start development server**
   ```bash
   npm run start:dev
   ```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run backend tests
npm run test:backend
```

## 📖 Documentation

- [Setup Guide](docs/SETUP.md)
- [API Documentation](docs/API.md)
- [Architecture Overview](docs/ARCHITECTURE.md)

## 🛠️ Technologies Used

- **Frontend**: React, AWS Amplify
- **Backend**: AWS Lambda, Node.js
- **Database**: DynamoDB
- **Storage**: Amazon S3
- **AI Services**: Amazon Textract, Amazon Comprehend
- **Authentication**: Amazon Cognito
- **API**: Amazon API Gateway
- **Infrastructure**: AWS CDK
- **Analytics**: Amazon QuickSight

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.