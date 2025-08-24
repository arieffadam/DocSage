import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDB, S3 } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient();
const s3 = new S3();

const DOCUMENT_TABLE = process.env.DOCUMENT_TABLE!;
const DOCUMENT_BUCKET = process.env.DOCUMENT_BUCKET!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Reports handler event:', JSON.stringify(event, null, 2));

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Content-Type': 'application/json',
  };

  try {
    const userId = event.requestContext.authorizer?.claims?.sub;
    const format = event.queryStringParameters?.format || 'json';

    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    // Get all documents for the user
    const result = await dynamodb.query({
      TableName: DOCUMENT_TABLE,
      IndexName: 'UserIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    }).promise();

    const documents = result.Items || [];

    if (format === 'csv') {
      return await generateCSVReport(documents, userId);
    } else if (format === 'pdf') {
      return await generatePDFReport(documents, userId);
    } else {
      // Return JSON summary
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          summary: generateSummary(documents),
          documents: documents.map(doc => ({
            documentId: doc.documentId,
            fileName: doc.fileName,
            uploadedAt: doc.uploadedAt,
            status: doc.status,
            sentiment: doc.aiAnalysis?.sentiment?.sentiment,
            entityCount: doc.aiAnalysis?.entities?.length || 0,
            keyPhraseCount: doc.aiAnalysis?.keyPhrases?.length || 0,
          })),
        }),
      };
    }

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

function generateSummary(documents: any[]): any {
  const totalDocuments = documents.length;
  const completedDocuments = documents.filter(doc => doc.status === 'completed').length;
  const processingDocuments = documents.filter(doc => doc.status === 'processing_text' || doc.status === 'analyzing').length;
  const failedDocuments = documents.filter(doc => doc.status?.includes('failed')).length;

  // Sentiment analysis
  const sentimentCounts = documents
    .filter(doc => doc.aiAnalysis?.sentiment?.sentiment)
    .reduce((acc, doc) => {
      const sentiment = doc.aiAnalysis.sentiment.sentiment;
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  // Most common entities
  const entityCounts = documents
    .filter(doc => doc.aiAnalysis?.entities)
    .flatMap(doc => doc.aiAnalysis.entities)
    .reduce((acc, entity) => {
      const text = entity.text.toLowerCase();
      acc[text] = (acc[text] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const topEntities = Object.entries(entityCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([text, count]) => ({ text, count: count as number }));

  return {
    totalDocuments,
    completedDocuments,
    processingDocuments,
    failedDocuments,
    successRate: totalDocuments > 0 ? (completedDocuments / totalDocuments * 100).toFixed(2) : 0,
    sentimentDistribution: sentimentCounts,
    topEntities,
  };
}

async function generateCSVReport(documents: any[], userId: string): Promise<APIGatewayProxyResult> {
  const csvHeaders = [
    'Document ID',
    'File Name',
    'Upload Date',
    'Status',
    'Sentiment',
    'Sentiment Score',
    'Entity Count',
    'Key Phrase Count',
    'Language',
    'File Size',
  ];

  const csvRows = documents.map(doc => [
    doc.documentId,
    doc.fileName,
    doc.uploadedAt,
    doc.status,
    doc.aiAnalysis?.sentiment?.sentiment || '',
    doc.aiAnalysis?.sentiment?.scores?.Positive || '',
    doc.aiAnalysis?.entities?.length || 0,
    doc.aiAnalysis?.keyPhrases?.length || 0,
    doc.aiAnalysis?.language?.dominantLanguage || '',
    doc.fileSize || '',
  ]);

  const csvContent = [csvHeaders, ...csvRows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  // Store CSV in S3 and return download URL
  const csvKey = `reports/${userId}/documents-report-${Date.now()}.csv`;
  
  await s3.putObject({
    Bucket: DOCUMENT_BUCKET,
    Key: csvKey,
    Body: csvContent,
    ContentType: 'text/csv',
    ContentDisposition: 'attachment; filename="documents-report.csv"',
  }).promise();

  const downloadUrl = s3.getSignedUrl('getObject', {
    Bucket: DOCUMENT_BUCKET,
    Key: csvKey,
    Expires: 3600, // 1 hour
  });

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      format: 'csv',
      downloadUrl,
      expiresIn: 3600,
    }),
  };
}

async function generatePDFReport(documents: any[], userId: string): Promise<APIGatewayProxyResult> {
  // In a real implementation, you would use a PDF library like PDFKit or puppeteer
  // For this example, we'll create a simple HTML report and return a download link
  
  const summary = generateSummary(documents);
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>DocSage Report</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; color: #333; }
            .summary { background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .stat { display: inline-block; margin: 10px; padding: 10px; background: white; border-radius: 3px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📄 DocSage Document Analysis Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="summary">
            <h2>Summary</h2>
            <div class="stat"><strong>Total Documents:</strong> ${summary.totalDocuments}</div>
            <div class="stat"><strong>Completed:</strong> ${summary.completedDocuments}</div>
            <div class="stat"><strong>Processing:</strong> ${summary.processingDocuments}</div>
            <div class="stat"><strong>Success Rate:</strong> ${summary.successRate}%</div>
        </div>

        <h2>Document Details</h2>
        <table>
            <thead>
                <tr>
                    <th>File Name</th>
                    <th>Upload Date</th>
                    <th>Status</th>
                    <th>Sentiment</th>
                    <th>Entities</th>
                    <th>Key Phrases</th>
                </tr>
            </thead>
            <tbody>
                ${documents.map(doc => `
                    <tr>
                        <td>${doc.fileName}</td>
                        <td>${new Date(doc.uploadedAt).toLocaleDateString()}</td>
                        <td>${doc.status}</td>
                        <td>${doc.aiAnalysis?.sentiment?.sentiment || 'N/A'}</td>
                        <td>${doc.aiAnalysis?.entities?.length || 0}</td>
                        <td>${doc.aiAnalysis?.keyPhrases?.length || 0}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </body>
    </html>
  `;

  // Store HTML in S3 (in production, you'd convert to PDF)
  const reportKey = `reports/${userId}/documents-report-${Date.now()}.html`;
  
  await s3.putObject({
    Bucket: DOCUMENT_BUCKET,
    Key: reportKey,
    Body: htmlContent,
    ContentType: 'text/html',
    ContentDisposition: 'attachment; filename="documents-report.html"',
  }).promise();

  const downloadUrl = s3.getSignedUrl('getObject', {
    Bucket: DOCUMENT_BUCKET,
    Key: reportKey,
    Expires: 3600, // 1 hour
  });

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      format: 'pdf', // Actually HTML for this demo
      downloadUrl,
      expiresIn: 3600,
      note: 'For demo purposes, this generates an HTML report. In production, this would be a PDF.',
    }),
  };
}