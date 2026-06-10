import { v2 as cloudinary } from 'cloudinary';
import { ICloudStoragePort, UploadResult } from '../domain/ICloudStoragePort';
import { env } from '../../../config/env';

// Initialize Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export class CloudinaryStorageAdapter implements ICloudStoragePort {
  async uploadPdf(fileBuffer: Buffer): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: 'flashy_ai_pdfs',
          // PDFs require raw format in some configurations, or 'auto'
          // Using 'image' with format 'pdf' can also work, but 'raw' or 'auto' is safer for PDFs
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          if (!result) {
            return reject(new Error('No result from Cloudinary upload'));
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      );

      uploadStream.end(fileBuffer);
    });
  }

  async deletePdf(publicId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }, (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  }
}
