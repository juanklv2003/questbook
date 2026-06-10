export interface UploadResult {
  url: string;
  publicId: string;
}

export interface ICloudStoragePort {
  uploadPdf(fileBuffer: Buffer): Promise<UploadResult>;
  deletePdf(publicId: string): Promise<void>;
}
