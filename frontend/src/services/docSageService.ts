import { API, Auth } from 'aws-amplify';
import { Document, UploadResponse, AIAnalysis, ReportSummary } from '../types';

const API_NAME = 'DocSageAPI';

class DocSageService {
  private async getAuthHeaders() {
    try {
      const session = await Auth.currentSession();
      const token = session.getIdToken().getJwtToken();
      return {
        Authorization: `Bearer ${token}`,
      };
    } catch (error) {
      console.error('Error getting auth headers:', error);
      throw new Error('Authentication required');
    }
  }

  async uploadDocument(file: File): Promise<UploadResponse> {
    const headers = await this.getAuthHeaders();
    
    const response = await API.post(API_NAME, '/documents', {
      headers,
      body: {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      },
    });

    // Upload file to S3 using presigned URL
    await fetch(response.presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    return response;
  }

  async getDocuments(): Promise<{ documents: Document[] }> {
    const headers = await this.getAuthHeaders();
    
    return await API.get(API_NAME, '/documents', {
      headers,
    });
  }

  async getDocument(documentId: string): Promise<Document> {
    const headers = await this.getAuthHeaders();
    
    return await API.get(API_NAME, `/documents/${documentId}`, {
      headers,
    });
  }

  async getDocumentAnalysis(documentId: string): Promise<{ documentId: string; analysis: AIAnalysis }> {
    const headers = await this.getAuthHeaders();
    
    return await API.get(API_NAME, `/documents/${documentId}/analysis`, {
      headers,
    });
  }

  async getReports(format: 'json' | 'csv' | 'pdf' = 'json'): Promise<any> {
    const headers = await this.getAuthHeaders();
    
    return await API.get(API_NAME, '/reports', {
      headers,
      queryStringParameters: { format },
    });
  }

  async downloadReport(format: 'csv' | 'pdf'): Promise<{ downloadUrl: string; expiresIn: number }> {
    const headers = await this.getAuthHeaders();
    
    return await API.get(API_NAME, '/reports', {
      headers,
      queryStringParameters: { format },
    });
  }
}

export const docSageService = new DocSageService();