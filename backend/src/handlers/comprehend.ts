import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Comprehend, DynamoDB } from 'aws-sdk';

const comprehend = new Comprehend();
const dynamodb = new DynamoDB.DocumentClient();

const DOCUMENT_TABLE = process.env.DOCUMENT_TABLE!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Comprehend handler event:', JSON.stringify(event, null, 2));

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Content-Type': 'application/json',
  };

  try {
    const documentId = event.pathParameters?.documentId;
    const userId = event.requestContext.authorizer?.claims?.sub;

    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    if (!documentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Document ID is required' }),
      };
    }

    // Get document from DynamoDB
    const result = await dynamodb.query({
      TableName: DOCUMENT_TABLE,
      KeyConditionExpression: 'documentId = :documentId',
      ExpressionAttributeValues: {
        ':documentId': documentId,
        ':userId': userId,
      },
      FilterExpression: 'userId = :userId',
    }).promise();

    if (!result.Items || result.Items.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Document not found' }),
      };
    }

    const document = result.Items[0];

    // If analysis already exists, return it
    if (document.aiAnalysis) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          documentId,
          analysis: document.aiAnalysis,
        }),
      };
    }

    // If no extracted text, return error
    if (!document.extractedText) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Document text not yet extracted' }),
      };
    }

    // Perform AI analysis
    const analysis = await analyzeWithComprehend(documentId, document.extractedText);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        documentId,
        analysis,
      }),
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

export async function analyzeWithComprehend(documentId: string, text: string): Promise<any> {
  console.log(`Starting AI analysis for document ${documentId}`);

  try {
    // Update status to analyzing
    await updateDocumentStatus(documentId, 'analyzing');

    // Detect language first
    const languageResult = await comprehend.detectDominantLanguage({
      Text: text.substring(0, 5000), // Comprehend has text limits
    }).promise();

    const dominantLanguage = languageResult.Languages?.[0]?.LanguageCode || 'en';

    // Perform various analyses
    const [sentimentResult, entitiesResult, keyPhrasesResult] = await Promise.all([
      comprehend.detectSentiment({
        Text: text.substring(0, 5000),
        LanguageCode: dominantLanguage,
      }).promise(),
      comprehend.detectEntities({
        Text: text.substring(0, 5000),
        LanguageCode: dominantLanguage,
      }).promise(),
      comprehend.detectKeyPhrases({
        Text: text.substring(0, 5000),
        LanguageCode: dominantLanguage,
      }).promise(),
    ]);

    const analysis = {
      language: {
        dominantLanguage,
        confidence: languageResult.Languages?.[0]?.Score || 0,
      },
      sentiment: {
        sentiment: sentimentResult.Sentiment,
        scores: sentimentResult.SentimentScore,
      },
      entities: entitiesResult.Entities?.map(entity => ({
        text: entity.Text,
        type: entity.Type,
        confidence: entity.Score,
        beginOffset: entity.BeginOffset,
        endOffset: entity.EndOffset,
      })) || [],
      keyPhrases: keyPhrasesResult.KeyPhrases?.map(phrase => ({
        text: phrase.Text,
        confidence: phrase.Score,
        beginOffset: phrase.BeginOffset,
        endOffset: phrase.EndOffset,
      })) || [],
      analyzedAt: new Date().toISOString(),
    };

    // Store analysis results
    const timestamp = await getDocumentTimestamp(documentId);
    await dynamodb.update({
      TableName: DOCUMENT_TABLE,
      Key: { documentId, timestamp },
      UpdateExpression: 'SET aiAnalysis = :analysis, #status = :status, analyzedAt = :analyzedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':analysis': analysis,
        ':status': 'completed',
        ':analyzedAt': new Date().toISOString(),
      },
    }).promise();

    console.log(`Successfully completed AI analysis for document ${documentId}`);
    return analysis;

  } catch (error) {
    console.error(`AI analysis error for document ${documentId}:`, error);
    await updateDocumentStatus(documentId, 'analysis_failed');
    throw error;
  }
}

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
  try {
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
  } catch (error) {
    console.error(`Failed to update status for document ${documentId}:`, error);
  }
}