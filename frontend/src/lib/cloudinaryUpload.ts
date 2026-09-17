import apiClient from './axios';

export type CloudinaryPdfUploadParams = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
};

export type CloudinaryPdfUploadResult = {
  publicId: string;
  url: string;
};

export async function fetchPdfUploadParams(): Promise<CloudinaryPdfUploadParams> {
  const response = await apiClient.post<CloudinaryPdfUploadParams>('/decks/generate/pdf-upload-params');
  return response.data;
}

/** Upload PDF directly to Cloudinary (avoids Vercel ~4.5 MB proxy limit). */
export async function uploadPdfToCloudinary(
  file: File,
  params: CloudinaryPdfUploadParams,
  onProgress?: (percent: number) => void
): Promise<CloudinaryPdfUploadResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', params.apiKey);
  form.append('timestamp', String(params.timestamp));
  form.append('signature', params.signature);
  form.append('folder', params.folder);

  const endpoint = `https://api.cloudinary.com/v1_1/${params.cloudName}/auto/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.round((event.loaded * 100) / event.total));
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error('cloudinary_upload_failed'));
        return;
      }
      try {
        const body = JSON.parse(xhr.responseText) as {
          public_id?: string;
          secure_url?: string;
        };
        if (!body.public_id || !body.secure_url) {
          reject(new Error('cloudinary_upload_invalid'));
          return;
        }
        resolve({ publicId: body.public_id, url: body.secure_url });
      } catch {
        reject(new Error('cloudinary_upload_invalid'));
      }
    };
    xhr.onerror = () => reject(new Error('cloudinary_upload_network'));
    xhr.send(form);
  });
}
