import apiClient from './axios';

export type CloudinaryPdfUploadParams = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  signedFields: Record<string, string>;
};

export type CloudinaryPdfUploadResult = {
  publicId: string;
  url: string;
};

export async function fetchPdfUploadParams(): Promise<CloudinaryPdfUploadParams> {
  const response = await apiClient.post<CloudinaryPdfUploadParams>('/decks/generate/pdf-upload-params');
  return response.data;
}

function parseCloudinaryErrorBody(responseText: string): string {
  try {
    const body = JSON.parse(responseText) as { error?: { message?: string } | string };
    if (typeof body.error === 'string') return body.error;
    if (body.error?.message) return body.error.message;
  } catch {
    // ignore
  }
  return responseText.slice(0, 200);
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
  for (const [key, value] of Object.entries(params.signedFields ?? {})) {
    form.append(key, value);
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${params.cloudName}/raw/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.round((event.loaded * 100) / event.total));
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        const detail = parseCloudinaryErrorBody(xhr.responseText);
        console.warn('[cloudinary] upload failed', xhr.status, detail);
        reject(new Error(`cloudinary_upload_failed:${detail}`));
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
