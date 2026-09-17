import { v2 as cloudinary } from 'cloudinary';
import { ICloudStoragePort, SignedPdfUploadParams, UploadResult } from '../domain/ICloudStoragePort';
import { AppError } from '../../../core/errors/AppError';
import { env } from '../../../config/env';

const PDF_FOLDER = 'flashy_ai_pdfs';

// Initialize Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export class CloudinaryStorageAdapter implements ICloudStoragePort {
  getSignedPdfUploadParams(): SignedPdfUploadParams {
    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = {
      timestamp,
      folder: PDF_FOLDER,
    };
    const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);
    return {
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      apiKey: env.CLOUDINARY_API_KEY,
      timestamp,
      signature,
      folder: PDF_FOLDER,
    };
  }

  async uploadPdf(fileBuffer: Buffer, filename?: string): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          // `auto` detects PDFs as image-type assets (`.../image/upload/...pdf`),
          // which Cloudinary serves with `Content-Type: application/pdf` and an
          // inline disposition. Uploading as `raw` without the original extension
          // produced extensionless URLs (`.../raw/upload/...`) that browsers
          // download as attachments instead of rendering inline.
          resource_type: 'auto',
          folder: PDF_FOLDER,
          // Image-type public_ids must NOT include the extension; Cloudinary
          // appends `.pdf` to the delivery URL itself.
          ...(filename ? { public_id: toSafePublicId(filename) } : {}),
          unique_filename: true,
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload failed:', error);
            return reject(
              new AppError(
                502,
                'No se pudo guardar el PDF en el almacenamiento. Probá de nuevo en unos minutos.'
              )
            );
          }
          if (!result) {
            return reject(
              new AppError(502, 'No se pudo guardar el PDF en el almacenamiento. Probá de nuevo.')
            );
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
    // New uploads are image-type; decks stored before the inline-display fix
    // are raw-type. Try image first, fall back to raw for legacy records.
    const result = await this.destroy(publicId, 'image');
    if (result === 'not found') {
      await this.destroy(publicId, 'raw');
    }
  }

  private destroy(publicId: string, resourceType: 'image' | 'raw'): Promise<string> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, { resource_type: resourceType }, (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve((result?.result as string) ?? 'ok');
      });
    });
  }
}

/** Derive a Cloudinary-safe public_id (no extension, no slashes) from the original filename. */
function toSafePublicId(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? filename;
  const withoutExt = base.replace(/\.[^.]+$/, '');
  const safe = withoutExt.trim().replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 120);
  return safe || 'document';
}
