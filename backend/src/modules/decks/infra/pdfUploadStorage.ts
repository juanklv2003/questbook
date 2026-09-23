import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';

type UploadedFile = Express.Multer.File;
import { env } from '../../../config/env';

const UPLOAD_TMP_DIR = path.join(os.tmpdir(), 'questbook-pdf-uploads');

function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_TMP_DIR)) {
    fs.mkdirSync(UPLOAD_TMP_DIR, { recursive: true });
  }
}

ensureUploadDir();

const pdfDiskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDir();
    cb(null, UPLOAD_TMP_DIR);
  },
  filename: (_req, file, cb) => {
    const suffix = crypto.randomBytes(8).toString('hex');
    const base = path.basename(file.originalname || 'upload.pdf').replace(/[^a-zA-Z0-9._-]+/g, '_');
    cb(null, `${Date.now()}-${suffix}-${base}`);
  },
});

const pdfUploadLimits = {
  fileSize: env.MAX_PDF_UPLOAD_BYTES,
  files: 20,
  fields: 16,
  parts: 48,
};

/** Disk storage keeps large PDFs off the heap until we read them once for parsing. */
export const pdfUpload = multer({
  storage: pdfDiskStorage,
  limits: pdfUploadLimits,
});

/** Multi-PDF book creation (field `files`) plus legacy single `file`. */
export const pdfUploadGenerate = multer({
  storage: pdfDiskStorage,
  limits: pdfUploadLimits,
}).fields([
  { name: 'file', maxCount: 1 },
  { name: 'files', maxCount: 20 },
]);

export const pdfUploadSingle = multer({
  storage: pdfDiskStorage,
  limits: pdfUploadLimits,
}).single('file');

export async function readUploadedPdfBuffer(file: UploadedFile): Promise<Buffer> {
  if (file.buffer && file.buffer.length > 0) {
    return file.buffer;
  }
  if (file.path) {
    return fs.promises.readFile(file.path);
  }
  throw new Error('Upload file missing');
}

export async function deleteUploadedPdfFile(file: UploadedFile | undefined): Promise<void> {
  if (!file?.path) return;
  await fs.promises.unlink(file.path).catch(() => undefined);
}
