# DocSage API Documentation

Base URL: `https://api-id.execute-api.region.amazonaws.com/prod`

All endpoints require authentication via Cognito JWT token in the Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

## Authentication

Use AWS Amplify Auth to handle authentication:

```javascript
import { Auth } from 'aws-amplify';

// Sign up
await Auth.signUp({
  username: 'user@example.com',
  password: 'SecurePassword123!',
  attributes: { email: 'user@example.com' }
});

// Sign in
const user = await Auth.signIn('user@example.com', 'SecurePassword123!');
const token = user.signInUserSession.idToken.jwtToken;
```

## Endpoints

### POST /documents

Upload a new document for processing.

**Request Body:**
```json
{
  "fileName": "document.pdf",
  "fileType": "application/pdf",
  "fileSize": 1024000
}
```

**Response:**
```json
{
  "documentId": "uuid-string",
  "presignedUrl": "https://s3.amazonaws.com/bucket/key?signature",
  "s3Key": "uploads/userId/documentId/filename"
}
```

**Flow:**
1. Call this endpoint to get a presigned URL
2. Upload file directly to S3 using the presigned URL
3. Document processing begins automatically

### GET /documents

List all documents for the authenticated user.

**Response:**
```json
{
  "documents": [
    {
      "documentId": "uuid-string",
      "userId": "user-id",
      "timestamp": "2024-01-01T00:00:00Z",
      "fileName": "document.pdf",
      "fileType": "application/pdf",
      "fileSize": 1024000,
      "status": "completed",
      "uploadedAt": "2024-01-01T00:00:00Z",
      "aiAnalysis": {
        "sentiment": {
          "sentiment": "POSITIVE",
          "scores": {
            "Positive": 0.8,
            "Negative": 0.1,
            "Neutral": 0.1,
            "Mixed": 0.0
          }
        },
        "entities": [...],
        "keyPhrases": [...],
        "language": {
          "dominantLanguage": "en",
          "confidence": 0.99
        }
      }
    }
  ]
}
```

### GET /documents/{documentId}

Get details for a specific document.

**Parameters:**
- `documentId` (path): Document ID

**Response:**
```json
{
  "documentId": "uuid-string",
  "fileName": "document.pdf",
  "status": "completed",
  "extractedText": "Document content...",
  "aiAnalysis": { ... }
}
```

### GET /documents/{documentId}/analysis

Get AI analysis results for a specific document.

**Parameters:**
- `documentId` (path): Document ID

**Response:**
```json
{
  "documentId": "uuid-string",
  "analysis": {
    "language": {
      "dominantLanguage": "en",
      "confidence": 0.99
    },
    "sentiment": {
      "sentiment": "POSITIVE",
      "scores": {
        "Positive": 0.8,
        "Negative": 0.1,
        "Neutral": 0.1,
        "Mixed": 0.0
      }
    },
    "entities": [
      {
        "text": "Amazon",
        "type": "ORGANIZATION",
        "confidence": 0.95,
        "beginOffset": 0,
        "endOffset": 6
      }
    ],
    "keyPhrases": [
      {
        "text": "machine learning",
        "confidence": 0.89,
        "beginOffset": 10,
        "endOffset": 26
      }
    ],
    "analyzedAt": "2024-01-01T00:00:00Z"
  }
}
```

### GET /reports

Generate and download reports.

**Query Parameters:**
- `format`: `json` (default), `csv`, or `pdf`

**Response for format=json:**
```json
{
  "summary": {
    "totalDocuments": 10,
    "completedDocuments": 8,
    "processingDocuments": 1,
    "failedDocuments": 1,
    "successRate": "80.00",
    "sentimentDistribution": {
      "POSITIVE": 5,
      "NEGATIVE": 2,
      "NEUTRAL": 1
    },
    "topEntities": [
      { "text": "amazon", "count": 5 },
      { "text": "aws", "count": 3 }
    ]
  },
  "documents": [...]
}
```

**Response for format=csv or format=pdf:**
```json
{
  "format": "csv",
  "downloadUrl": "https://s3.amazonaws.com/bucket/reports/file.csv?signature",
  "expiresIn": 3600
}
```

## Document Status Flow

1. **uploaded**: Document uploaded to S3
2. **processing_text**: Textract is extracting text
3. **text_extracted**: Text extraction completed
4. **analyzing**: Comprehend is analyzing content
5. **completed**: All processing finished
6. **text_extraction_failed**: Textract failed
7. **analysis_failed**: Comprehend failed

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message description"
}
```

**Common Status Codes:**
- `400`: Bad Request - Invalid parameters
- `401`: Unauthorized - Missing or invalid JWT token
- `404`: Not Found - Document not found
- `500`: Internal Server Error - Processing error

## Rate Limits

- **Upload**: 10 requests per minute per user
- **API calls**: 100 requests per minute per user
- **File size**: Maximum 10MB per document

## Supported File Types

- **PDF**: application/pdf
- **Images**: image/jpeg, image/png, image/tiff
- **Text**: text/plain

## WebSocket Events (Future Enhancement)

For real-time updates on document processing status:

```javascript
const socket = new WebSocket('wss://websocket-url');
socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'document_status_update') {
    // Update UI with new status
  }
};
```