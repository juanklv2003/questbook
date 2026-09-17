export interface UploadResult {
  url: string;
  publicId: string;
}

/** Params for a browser → Cloudinary signed upload (bypasses Vercel body limits). */
export interface SignedPdfUploadParams {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  /** Form fields covered by the signature (excluding file, api_key, timestamp, signature). */
  signedFields: Record<string, string>;
}

export interface ICloudStoragePort {
  uploadPdf(fileBuffer: Buffer, filename?: string): Promise<UploadResult>;
  deletePdf(publicId: string): Promise<void>;
  getSignedPdfUploadParams(): SignedPdfUploadParams;
}
