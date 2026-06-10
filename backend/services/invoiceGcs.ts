/**
 * Store invoice / PO images in Cloud Storage for Vertex Gemini `fileData.fileUri` (gs://…).
 * Bucket default: crown-services-invoices (override with GCS_INVOICE_IMAGES_BUCKET).
 */
import { randomUUID } from 'crypto';
import { Storage } from '@google-cloud/storage';
import { resolveVertexProjectId } from '../geminiConfig';

const DEFAULT_INVOICE_BUCKET = 'crown-services-invoices';

export function getInvoiceOcrBucketName(): string | null {
  const raw = String(
    process.env.GCS_INVOICE_IMAGES_BUCKET || process.env.GCS_INVOICE_BUCKET || DEFAULT_INVOICE_BUCKET
  ).trim();
  if (!raw || raw === '0' || raw.toLowerCase() === 'false') return null;
  return raw;
}

function extFromMime(mimeType: string): string {
  const m = String(mimeType || '').toLowerCase();
  if (m.includes('png')) return 'png';
  if (m.includes('webp')) return 'webp';
  if (m === 'application/pdf' || m.includes('pdf')) return 'pdf';
  return 'jpg';
}

/**
 * Upload bytes (already normalized MIME, e.g. post-sharp JPEG) and return gs:// URI for Gemini.
 */
export async function uploadInvoiceImageToGcs(
  shopId: number,
  buffer: Buffer,
  mimeType: string
): Promise<{ gsUri: string; objectPath: string }> {
  const bucketName = getInvoiceOcrBucketName();
  if (!bucketName) {
    throw new Error('GCS invoice bucket not configured');
  }
  const ext = extFromMime(mimeType);
  const objectPath = `invoice-ocr/${shopId}/${Date.now()}-${randomUUID()}.${ext}`;
  const projectId = resolveVertexProjectId();
  const storage = new Storage({ projectId });
  const file = storage.bucket(bucketName).file(objectPath);
  await file.save(buffer, {
    contentType: mimeType,
    metadata: { cacheControl: 'private, max-age=0' },
    resumable: buffer.length > 8 * 1024 * 1024,
  });
  const gsUri = `gs://${bucketName}/${objectPath}`;
  return { gsUri, objectPath };
}
