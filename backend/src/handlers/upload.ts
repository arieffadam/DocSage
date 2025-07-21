import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3, DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const s3 = new S3();
const dynamodb = new DynamoDB.DocumentClient();

const DOCUMENT_BUCKET = process.env.DOCUMENT_BUCKET!;
const DOCUMENT_TABLE = process.env.DOCUMENT_TABLE!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Upload handler event:', JSON.stringify(event, null, 2));

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Type': 'application/json',
  };

  try {
    const method = event.httpMethod;
    const userId = event.requestContext.authorizer?.claims?.sub;

    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    switch (method) {
      case 'POST':
        return await handleUpload(event, userId);
      case 'GET':
        if (event.pathParameters?.documentId) {
          return await getDocument(event.pathParameters.documentId, userId);
        }
        return await listDocuments(userId);
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' }),
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

async function handleUpload(event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}');
  const { fileName, fileType, fileSize } = body;

  if (!fileName || !fileType) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'fileName and fileType are required' }),
    };
  }

  // Validate file
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (fileSize && fileSize > maxSize) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'File size must be less than 10MB' }),
    };
  }

  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'text/plain',
  ];

  if (!allowedTypes.includes(fileType)) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'File type not supported. Please upload PDF, JPEG, PNG, TIFF, or TXT files.' }),
    };
  }

  const documentId = uuidv4();
  const timestamp = new Date().toISOString();
  const s3Key = `uploads/${userId}/${documentId}/${fileName}`;

  // Generate presigned URL for direct upload to S3
  const presignedUrl = s3.getSignedUrl('putObject', {
    Bucket: DOCUMENT_BUCKET,
    Key: s3Key,
    ContentType: fileType,
    Expires: 3600, // 1 hour
  });

  // Store document metadata in DynamoDB
  const documentMetadata = {
    documentId,
    userId,
    timestamp,
    fileName,
    fileType,
    fileSize,
    s3Key,
    status: 'uploaded',
    uploadedAt: timestamp,
  };

  await dynamodb.put({
    TableName: DOCUMENT_TABLE,
    Item: documentMetadata,
  }).promise();

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      documentId,
      presignedUrl,
      s3Key,
    }),
  };
}

async function getDocument(documentId: string, userId: string): Promise<APIGatewayProxyResult> {
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
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Document not found' }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(result.Items[0]),
  };
}

async function listDocuments(userId: string): Promise<APIGatewayProxyResult> {
  const result = await dynamodb.query({
    TableName: DOCUMENT_TABLE,
    IndexName: 'UserIndex',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
    ScanIndexForward: false, // Most recent first
  }).promise();

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      documents: result.Items || [],
    }),
  };
}