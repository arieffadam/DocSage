# DocSage Setup Guide

This guide will help you deploy and configure the DocSage document analysis platform.

## Prerequisites

- **AWS Account** with appropriate permissions
- **AWS CLI** configured with your credentials
- **Node.js** 18+ installed
- **AWS CDK** installed globally (`npm install -g aws-cdk`)

## Step 1: Clone and Install Dependencies

```bash
git clone https://github.com/arieffadam/DocSage.git
cd DocSage
npm install
```

## Step 2: Configure AWS CDK

If this is your first time using CDK in your AWS account:

```bash
cd infrastructure
cdk bootstrap
```

## Step 3: Deploy Infrastructure

```bash
# Build backend code
cd ../backend
npm install
npm run build

# Deploy infrastructure
cd ../infrastructure
npm install
cdk deploy
```

The deployment will output important values:
- API Gateway URL
- Cognito User Pool ID
- Cognito User Pool Client ID
- S3 Bucket Name

## Step 4: Configure Frontend

Create a `.env` file in the `frontend` directory:

```bash
cd ../frontend
cat > .env << EOF
REACT_APP_AWS_REGION=us-east-1
REACT_APP_USER_POOL_ID=<USER_POOL_ID_FROM_OUTPUT>
REACT_APP_USER_POOL_CLIENT_ID=<USER_POOL_CLIENT_ID_FROM_OUTPUT>
REACT_APP_API_GATEWAY_URL=<API_GATEWAY_URL_FROM_OUTPUT>
REACT_APP_S3_BUCKET=<BUCKET_NAME_FROM_OUTPUT>
EOF
```

## Step 5: Build and Deploy Frontend

```bash
npm install
npm run build

# Optional: Deploy to S3 for hosting
aws s3 sync build/ s3://your-frontend-bucket --delete
```

## Step 6: Test the Application

```bash
# Run locally for development
npm start
```

Visit `http://localhost:3000` and:
1. Sign up for a new account
2. Upload a test document
3. Wait for processing to complete
4. View analysis results
5. Generate reports

## AWS Services Used

- **S3**: Document storage
- **Lambda**: Processing functions
- **DynamoDB**: Metadata storage
- **API Gateway**: REST API
- **Cognito**: User authentication
- **Textract**: Text extraction
- **Comprehend**: AI analysis
- **IAM**: Permissions management

## Monitoring and Logs

- **CloudWatch Logs**: Lambda function logs
- **CloudWatch Metrics**: API Gateway and Lambda metrics
- **X-Ray**: Distributed tracing (optional)

## Security Best Practices

1. **IAM Policies**: Least privilege access
2. **S3 Bucket**: Block public access
3. **API Gateway**: Rate limiting and throttling
4. **Cognito**: Strong password policies
5. **VPC**: Deploy Lambda in VPC for additional security (optional)

## Cost Optimization

- **S3**: Use Intelligent Tiering
- **DynamoDB**: On-demand billing
- **Lambda**: Right-size memory allocation
- **API Gateway**: Monitor usage

## Troubleshooting

### Common Issues

1. **Deployment Fails**
   - Check AWS credentials and permissions
   - Ensure CDK is bootstrapped
   - Verify Node.js and CDK versions

2. **Frontend Can't Connect**
   - Verify environment variables
   - Check CORS configuration
   - Confirm API Gateway URL

3. **Document Processing Fails**
   - Check CloudWatch logs
   - Verify IAM permissions
   - Ensure supported file types

4. **Authentication Issues**
   - Confirm Cognito configuration
   - Check user pool settings
   - Verify client ID and region

### Getting Help

- Check CloudWatch logs for detailed error messages
- Review AWS service quotas and limits
- Consult AWS documentation for specific services

## Cleanup

To remove all resources:

```bash
cd infrastructure
cdk destroy
```

**Warning**: This will delete all data including uploaded documents and user accounts.