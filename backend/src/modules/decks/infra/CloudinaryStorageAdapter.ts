import { v2 as cloudinary } from 'cloudinary';
import { ICloudStoragePort, SignedPdfUploadParams, UploadResult } from '../domain/ICloudStoragePort';
import { AppError } from '../../../core/errors/AppError';
import { env } from '../../../config/env';

const PDF_FOLDER = 'flashy_ai_pdfs';

function browserUploadParamsToSign(): Record<string, string | number | boolean> {
  const timestamp = Math.round(Date.now() / 1000);
  // Browser POSTs to `/raw/upload`: resource type is implied by the URL, so it must
  // NOT appear in the signed params (Cloudinary builds the string to sign without it).
  if (env.CLOUDINARY_PDF_UPLOAD_PRESET) {
    return { timestamp, upload_preset: env.CLOUDINARY_PDF_UPLOAD_PRESET };
  }
  if (env.CLOUDINARY_UPLOAD_FOLDER_MODE === 'legacy') {
    return { timestamp, folder: PDF_FOLDER, unique_filename: true };
  }
  return {
    timestamp,
    asset_folder: PDF_FOLDER,
    use_asset_folder_as_public_id_prefix: true,
    unique_filename: true,
  };
}

function serverSideUploadOptions(filename?: string): Record<string, unknown> {
  const base =
    env.CLOUDINARY_UPLOAD_FOLDER_MODE === 'legacy'
      ? { resource_type: 'raw' as const, folder: PDF_FOLDER, unique_filename: true }
      : {
          resource_type: 'raw' as const,
          asset_folder: PDF_FOLDER,
          use_asset_folder_as_public_id_prefix: true,
          unique_filename: true,
        };
  if (!filename) return base;
  return { ...base, public_id: toSafePublicId(filename) };
}

// Initialize Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export class CloudinaryStorageAdapter implements ICloudStoragePort {
  getSignedPdfUploadParams(): SignedPdfUploadParams {
    const paramsToSign = browserUploadParamsToSign();
    const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);
    const timestamp = Number(paramsToSign.timestamp);
    const signedFields: Record<string, string> = {};
    for (const [key, value] of Object.entries(paramsToSign)) {
      if (key === 'timestamp') continue;
      signedFields[key] = String(value);
    }
    return {
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      apiKey: env.CLOUDINARY_API_KEY,
      timestamp,
      signature,
      signedFields,
    };
  }

  async uploadPdf(fileBuffer: Buffer, filename?: string): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const options = serverSideUploadOptions(filename);
      const uploadStream = cloudinary.uploader.upload_stream(
        options as {
          resource_type: 'raw';
          folder?: string;
          asset_folder?: string;
          use_asset_folder_as_public_id_prefix?: boolean;
          unique_filename?: boolean;
          public_id?: string;
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
    const result = await this.destroy(publicId, 'raw');
    if (result === 'not found') {
      await this.destroy(publicId, 'image');
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
