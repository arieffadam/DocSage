import { S3Event } from 'aws-lambda';
import { S3, Textract, DynamoDB } from 'aws-sdk';

const s3 = new S3();
const textract = new Textract();
const dynamodb = new DynamoDB.DocumentClient();

const DOCUMENT_TABLE = process.env.DOCUMENT_TABLE!;

export const handler = async (event: S3Event): Promise<void> => {
  console.log('Textract handler event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    try {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
      
      console.log(`Processing file: ${bucket}/${key}`);

      // Extract document ID from S3 key (uploads/{userId}/{documentId}/{fileName})
      const keyParts = key.split('/');
      if (keyParts.length !== 4 || keyParts[0] !== 'uploads') {
        console.log(`Skipping file with unexpected key format: ${key}`);
        continue;
      }

      const documentId = keyParts[2];

      // Update document status to processing
      await updateDocumentStatus(documentId, 'processing_text');

      try {
        // Extract text using Textract
        const textractResult = await textract.detectDocumentText({
          Document: {
            S3Object: {
              Bucket: bucket,
              Name: key,
            },
          },
        }).promise();

        // Extract all text blocks
        const textBlocks = textractResult.Blocks?.filter(block => block.BlockType === 'LINE') || [];
        const extractedText = textBlocks.map(block => block.Text).join('\n');

        // Update document with extracted text
        await dynamodb.update({
          TableName: DOCUMENT_TABLE,
          Key: { documentId, timestamp: await getDocumentTimestamp(documentId) },
          UpdateExpression: 'SET extractedText = :text, textractResults = :results, #status = :status, processedAt = :processedAt',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':text': extractedText,
            ':results': textractResult,
            ':status': 'text_extracted',
            ':processedAt': new Date().toISOString(),
          },
        }).promise();

        console.log(`Successfully extracted text from document ${documentId}`);

        // Trigger AI analysis (this would normally be done via SNS/SQS for better decoupling)
        await triggerAIAnalysis(documentId, extractedText);

      } catch (textractError) {
        console.error(`Textract error for document ${documentId}:`, textractError);
        await updateDocumentStatus(documentId, 'text_extraction_failed');
      }

    } catch (error) {
      console.error('Error processing S3 record:', error);
    }
  }
};

async function getDocumentTimestamp(documentId: string): Promise<string> {
  const result = await dynamodb.query({
    TableName: DOCUMENT_TABLE,
    KeyConditionExpression: 'documentId = :documentId',
    ExpressionAttributeValues: {
      ':documentId': documentId,
    },
    Limit: 1,
  }).promise();

  if (!result.Items || result.Items.length === 0) {
    throw new Error(`Document ${documentId} not found`);
  }

  return result.Items[0].timestamp;
}

async function updateDocumentStatus(documentId: string, status: string): Promise<void> {
  const timestamp = await getDocumentTimestamp(documentId);
  
  await dynamodb.update({
    TableName: DOCUMENT_TABLE,
    Key: { documentId, timestamp },
    UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':status': status,
      ':updatedAt': new Date().toISOString(),
    },
  }).promise();
}

async function triggerAIAnalysis(documentId: string, text: string): Promise<void> {
  // Import comprehend handler and call it directly
  // In a production system, this would be done via SNS/SQS
  try {
    const { analyzeWithComprehend } = await import('./comprehend');
    await analyzeWithComprehend(documentId, text);
  } catch (error) {
    console.error(`Failed to trigger AI analysis for document ${documentId}:`, error);
    await updateDocumentStatus(documentId, 'ai_analysis_failed');
  }
}