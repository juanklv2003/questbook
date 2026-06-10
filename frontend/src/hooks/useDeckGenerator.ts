import { useState } from 'react';
import apiClient from '../lib/axios';

export function useDeckGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const generateDeckFromPdf = async (file: File) => {
    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name.replace('.pdf', ''));

      setProgress(20);

      const response = await apiClient.post(`/decks/generate`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
          setProgress(20 + percentCompleted * 0.3); // up to 50
        }
      });

      setProgress(100);

      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error generating deck');
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  return { generateDeckFromPdf, isGenerating, progress, error };
}
