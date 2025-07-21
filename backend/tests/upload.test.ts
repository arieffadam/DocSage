import { handler } from '../src/handlers/upload';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

// Mock AWS SDK
jest.mock('aws-sdk', () => ({
  S3: jest.fn(() => ({
    getSignedUrl: jest.fn(() => 'https://mock-presigned-url.com'),
  })),
  DynamoDB: {
    DocumentClient: jest.fn(() => ({
      put: jest.fn(() => ({ promise: jest.fn(() => Promise.resolve()) })),
      query: jest.fn(() => ({ 
        promise: jest.fn(() => Promise.resolve({ Items: [{ documentId: 'test-id', timestamp: '2024-01-01' }] })) 
      })),
    })),
  },
}));

describe('Upload Handler', () => {
  const mockEvent: Partial<APIGatewayProxyEvent> = {
    httpMethod: 'POST',
    requestContext: {
      authorizer: {
        claims: {
          sub: 'test-user-id',
        },
      },
    } as any,
    body: JSON.stringify({
      fileName: 'test.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
    }),
  };

  const mockContext: Partial<Context> = {
    awsRequestId: 'test-request-id',
  };

  beforeEach(() => {
    process.env.DOCUMENT_BUCKET = 'test-bucket';
    process.env.DOCUMENT_TABLE = 'test-table';
  });

  it('should handle document upload successfully', async () => {
    const result = await handler(mockEvent as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('documentId');
    expect(body).toHaveProperty('presignedUrl');
    expect(body).toHaveProperty('s3Key');
  });

  it('should return 401 for unauthorized requests', async () => {
    const unauthorizedEvent = {
      ...mockEvent,
      requestContext: {
        authorizer: null,
      },
    };

    const result = await handler(unauthorizedEvent as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Unauthorized');
  });

  it('should return 400 for invalid file types', async () => {
    const invalidEvent = {
      ...mockEvent,
      body: JSON.stringify({
        fileName: 'test.exe',
        fileType: 'application/exe',
        fileSize: 1024,
      }),
    };

    const result = await handler(invalidEvent as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toContain('File type not supported');
  });

  it('should return 400 for files too large', async () => {
    const largeFileEvent = {
      ...mockEvent,
      body: JSON.stringify({
        fileName: 'large.pdf',
        fileType: 'application/pdf',
        fileSize: 15 * 1024 * 1024, // 15MB
      }),
    };

    const result = await handler(largeFileEvent as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toContain('File size must be less than 10MB');
  });
});