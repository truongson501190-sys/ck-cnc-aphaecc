// src/features/ocr/services/ocrApiClient.ts

import { AIResponse } from '../types/documentTypes';

const API_BASE = import.meta.env.VITE_AI_API_URL || 'http://localhost:8002';

export interface OCRResponse {
  success: boolean;
  text: string;
  fields: Record<string, any>;
  confidence: number;
  needs_review: boolean;
  error: string;
  processing_time: number;
  reasoning: string;
}

class OCRApiClient {
  async parseDocument(file: File): Promise<AIResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/api/ai/document/parse`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Backend error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data;
  }

  async learn(documentId: string, correctedFields: Record<string, any>, userId: string) {
    const response = await fetch(`${API_BASE}/api/ai/learn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: documentId,
        corrected_fields: correctedFields,
        user_id: userId,
      }),
    });

    return response.json();
  }

  async getStats() {
    const response = await fetch(`${API_BASE}/api/ai/stats`);
    return response.json();
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  }
}

export const ocrApiClient = new OCRApiClient();