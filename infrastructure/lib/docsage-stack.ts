import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';

export class DocSageStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Bucket for document storage
    const documentBucket = new s3.Bucket(this, 'DocumentBucket', {
      bucketName: `docsage-documents-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
      cors: [{
        allowedHeaders: ['*'],
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
        allowedOrigins: ['*'],
        exposedHeaders: ['ETag'],
        maxAge: 3000,
      }],
    });

    // DynamoDB table for document metadata
    const documentTable = new dynamodb.Table(this, 'DocumentTable', {
      tableName: 'DocSage-Documents',
      partitionKey: { name: 'documentId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
      pointInTimeRecovery: true,
    });

    // Add GSI for user-based queries
    documentTable.addGlobalSecondaryIndex({
      indexName: 'UserIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    // Cognito User Pool for authentication
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'DocSage-UserPool',
      signInAliases: { email: true },
      selfSignUpEnabled: true,
      userVerification: {
        emailSubject: 'Welcome to DocSage - Verify your email',
        emailBody: 'Thank you for signing up to DocSage! Your verification code is {####}',
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
    });

    // IAM role for Lambda functions
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        'DocSagePolicy': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:GetObjectAcl',
              ],
              resources: [`${documentBucket.bucketArn}/*`],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan',
              ],
              resources: [
                documentTable.tableArn,
                `${documentTable.tableArn}/index/*`,
              ],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'textract:DetectDocumentText',
                'textract:AnalyzeDocument',
                'textract:GetDocumentAnalysis',
                'textract:StartDocumentAnalysis',
              ],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'comprehend:DetectSentiment',
                'comprehend:DetectEntities',
                'comprehend:DetectKeyPhrases',
                'comprehend:DetectLanguage',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // Lambda function for document upload
    const uploadHandler = new lambda.Function(this, 'UploadHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'upload.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      role: lambdaRole,
      environment: {
        DOCUMENT_BUCKET: documentBucket.bucketName,
        DOCUMENT_TABLE: documentTable.tableName,
      },
      timeout: cdk.Duration.minutes(5),
    });

    // Lambda function for text extraction
    const textractHandler = new lambda.Function(this, 'TextractHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'textract.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      role: lambdaRole,
      environment: {
        DOCUMENT_BUCKET: documentBucket.bucketName,
        DOCUMENT_TABLE: documentTable.tableName,
      },
      timeout: cdk.Duration.minutes(15),
    });

    // Lambda function for AI analysis
    const comprehendHandler = new lambda.Function(this, 'ComprehendHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'comprehend.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      role: lambdaRole,
      environment: {
        DOCUMENT_TABLE: documentTable.tableName,
      },
      timeout: cdk.Duration.minutes(5),
    });

    // Lambda function for report generation
    const reportsHandler = new lambda.Function(this, 'ReportsHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'reports.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      role: lambdaRole,
      environment: {
        DOCUMENT_TABLE: documentTable.tableName,
        DOCUMENT_BUCKET: documentBucket.bucketName,
      },
      timeout: cdk.Duration.minutes(5),
    });

    // S3 event notification to trigger Textract
    documentBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(textractHandler),
      { prefix: 'uploads/' }
    );

    // API Gateway
    const api = new apigateway.RestApi(this, 'DocSageApi', {
      restApiName: 'DocSage API',
      description: 'API for DocSage document analysis',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
    });

    // Cognito authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [userPool],
    });

    // API endpoints
    const documents = api.root.addResource('documents');
    documents.addMethod('POST', new apigateway.LambdaIntegration(uploadHandler), {
      authorizer,
    });
    documents.addMethod('GET', new apigateway.LambdaIntegration(uploadHandler), {
      authorizer,
    });

    const document = documents.addResource('{documentId}');
    document.addMethod('GET', new apigateway.LambdaIntegration(uploadHandler), {
      authorizer,
    });

    const analysis = document.addResource('analysis');
    analysis.addMethod('GET', new apigateway.LambdaIntegration(comprehendHandler), {
      authorizer,
    });

    const reports = api.root.addResource('reports');
    reports.addMethod('GET', new apigateway.LambdaIntegration(reportsHandler), {
      authorizer,
    });

    // Output important values
    new cdk.CfnOutput(this, 'DocumentBucketName', {
      value: documentBucket.bucketName,
      description: 'Name of the S3 bucket for documents',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'DocumentTableName', {
      value: documentTable.tableName,
      description: 'DynamoDB table name for documents',
    });
  }
}